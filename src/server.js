const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Import Firebase and Google Sheets
const admin = require('firebase-admin');
const { sheets, sheetsConfigured } = require('./config/googleSheets');
const { getSendingService } = require('./services/sendingService');

// Initialize Firebase Admin
const credentialsPath = path.join(__dirname, '../firebase-credentials.json');
const fs = require('fs');

if (fs.existsSync(credentialsPath)) {
    const serviceAccount = require(credentialsPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        })
    });
}

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Serve Main Public Files (Old system)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/premium-rsvp', express.static(path.join(__dirname, '../public/premium-rsvp')));




// Serve RSVP page (Old)
app.get('/rsvp', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/rsvp.html'));
});

// Serve Admin Dashboard (Old)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin/dashboard.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// NEW: Premium Invitation APIs (Bridge Logic)
// ============================================

// 1. Save RSVP from the new invitation
app.post('/api/rsvp', async (req, res) => {
    try {
        console.log('📝 Premium RSVP Payload:', req.body);

        // 1. Extract & Sanitize
        const { phone, name, attendanceStatus, guestsCount, dietary, notes, hasChildren, childrenCount } = req.body;

        if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });

        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (!cleanPhone.startsWith('972')) cleanPhone = '972' + cleanPhone;

        // 2. Logic Mapping (CRITICAL FOR DASHBOARD STATS)
        const isAttending = attendanceStatus === 'yes';
        // FIX: If not attending, force count to 0. Otherwise use input (default 1).
        const finalGuestsCount = isAttending ? parseInt(guestsCount || 1) : 0;

        const rsvpData = {
            rsvpName: name, // User's edited name
            attending: isAttending,
            numberOfGuests: finalGuestsCount,
            hasChildren: hasChildren === true || hasChildren === 'true',
            childrenCount: parseInt(childrenCount || 0),
            dietary: dietary || '',
            notes: notes || '',
            rsvpSubmitted: true,
            rsvpSubmittedAt: new Date(),
            messageStatus: 'responded' // Colors the dashboard row green
        };

        // 3. Database Operation (Update or Create)
        const docRef = db.collection('guests').doc(cleanPhone);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log(`🔄 Updating Guest: ${cleanPhone}`);
            await docRef.update(rsvpData);
        } else {
            console.log(`➕ Creating New Guest: ${cleanPhone}`);
            await docRef.set({
                ...rsvpData,
                phone: cleanPhone,
                originalName: name, // Snapshot of first name used
                name: name,
                source: 'link_share',
                createdAt: new Date()
            });
        }

        res.status(200).json({ success: true, message: 'RSVP Saved' });

    } catch (error) {
        console.error('RSVP Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Save Design Configuration from Admin Editor
app.post('/api/admin/save-config', async (req, res) => {
    try {
        console.log('🎨 Design Config Update Received');
        const { config, eventOverride } = req.body;

        // Save to Firestore under 'settings'
        await db.collection('settings').doc('premiumInvitation').set({
            config,
            eventOverride,
            updatedAt: new Date()
        });

        res.status(200).json({ success: true, message: 'Configuration saved' });
    } catch (error) {
        console.error('Save Config Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================
// CUSTOM MESSAGE SETTINGS (Existing Logic)
// ============================================
let cachedCustomMessage = null; // Cache the message server-side

// Save custom message
app.post('/api/settings/message', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Save to Firestore
        await db.collection('settings').doc('customMessage').set({
            message: message,
            updatedAt: new Date()
        });

        // Update cache
        cachedCustomMessage = message;

        console.log('✅ Custom message saved');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error saving message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get custom message
app.get('/api/settings/message', async (req, res) => {
    try {
        if (cachedCustomMessage) {
            return res.json({ success: true, message: cachedCustomMessage });
        }

        const doc = await db.collection('settings').doc('customMessage').get();
        if (doc.exists && doc.data().message) {
            cachedCustomMessage = doc.data().message;
            return res.json({ success: true, message: cachedCustomMessage });
        }

        res.json({ success: true, message: null });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function to get custom message (for internal use)
async function getCustomMessage() {
    if (cachedCustomMessage) return cachedCustomMessage;

    try {
        const doc = await db.collection('settings').doc('customMessage').get();
        if (doc.exists && doc.data().message) {
            cachedCustomMessage = doc.data().message;
            return cachedCustomMessage;
        }
    } catch (error) {
        console.error('Error fetching custom message:', error);
    }
    return null;
}


// ============================================
// GOOGLE SHEETS SYNC (Existing Logic)
// ============================================
app.post('/api/sync-sheets', async (req, res) => {
    try {
        if (!sheetsConfigured || !sheets) {
            return res.status(400).json({
                success: false,
                error: 'Google Sheets credentials not configured. Please add google-credentials.json or configure environment variables.'
            });
        }

        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                error: 'GOOGLE_SHEETS_ID not configured in .env'
            });
        }

        console.log('📊 Syncing from Google Sheets:', spreadsheetId);

        // Fetch data from Google Sheets
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'A:B', // Columns: שם, טלפון
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.json({ success: true, added: 0, updated: 0, deleted: 0, message: 'No data found in sheet' });
        }

        // Skip header row and collect all valid phones from sheet
        const guests = rows.slice(1);
        const sheetPhones = new Set();
        let added = 0;
        let updated = 0;
        let deleted = 0;

        for (const row of guests) {
            const name = row[0]?.trim();
            let phone = row[1]?.trim();

            if (!name || !phone) continue;

            // Normalize phone number (remove dashes, spaces, etc.)
            phone = phone.replace(/[-\s]/g, '');

            // Convert 05X format to 9725X format
            if (phone.startsWith('05')) {
                phone = '972' + phone.substring(1);
            } else if (phone.startsWith('+972')) {
                phone = phone.substring(1);
            }

            sheetPhones.add(phone);

            // Check if guest already exists
            const docRef = db.collection('guests').doc(phone);
            const doc = await docRef.get();

            if (doc.exists) {
                // Update originalName if different (and not overwrite rsvpName)
                const existingData = doc.data();
                if (existingData.originalName !== name) {
                    await docRef.update({ originalName: name });
                    updated++;
                }
            } else {
                // Add new guest
                await docRef.set({
                    originalName: name,
                    name: name,
                    phone: phone,
                    messageStatus: 'pending',
                    rsvpSubmitted: false,
                    createdAt: new Date()
                });
                added++;
            }
        }

        // Delete guests that are NOT in the sheet (but were synced from it)
        const allGuestsSnapshot = await db.collection('guests').get();
        for (const doc of allGuestsSnapshot.docs) {
            const phone = doc.id;
            // Only delete if not in sheet AND hasn't submitted RSVP
            if (!sheetPhones.has(phone) && !doc.data().rsvpSubmitted) {
                await doc.ref.delete();
                deleted++;
                console.log(`🗑️ Deleted guest: ${doc.data().name} (${phone})`);
            }
        }

        console.log(`✅ Sync complete: ${added} added, ${updated} updated, ${deleted} deleted`);
        res.json({
            success: true,
            added: added,
            updated: updated,
            deleted: deleted,
            total: guests.length
        });

    } catch (error) {
        console.error('❌ Sync error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// WHATSAPP SENDING ENDPOINTS (Existing Logic)
// ============================================

// Get WhatsApp status
app.get('/api/whatsapp/status', (req, res) => {
    const sendingService = getSendingService();
    res.json(sendingService.getStatus());
});

// Initialize WhatsApp connection (NON-BLOCKING)
app.post('/api/whatsapp/connect', async (req, res) => {
    const sendingService = getSendingService();

    // Return immediately, start connection in background
    res.json({ success: true, message: 'Connecting... Check terminal for QR code' });

    // Start WhatsApp in background
    sendingService.initialize()
        .then(result => {
            console.log('WhatsApp connection result:', result);
        })
        .catch(err => {
            console.error('WhatsApp connection error:', err);
        });
});

// Start sending invitations
app.post('/api/whatsapp/send-all', async (req, res) => {
    const sendingService = getSendingService();

    const imagePath = process.env.INVITATION_IMAGE_PATH || null;

    // Start sending in background (link generation is handled by sendingService)
    sendingService.sendToAllGuests(null, imagePath)
        .then(result => console.log('Sending completed:', result))
        .catch(err => console.error('Sending error:', err));

    // Return immediately with status
    res.json({
        success: true,
        message: 'Sending started',
        status: sendingService.getStatus()
    });
});

// Send test message
app.post('/api/whatsapp/send-test', async (req, res) => {
    const { phone, name } = req.body;

    if (!phone || !name) {
        return res.status(400).json({ success: false, error: 'Phone and name are required' });
    }

    const sendingService = getSendingService();
    const imagePath = process.env.INVITATION_IMAGE_PATH || null;

    // Link is generated internally by sendingService
    const result = await sendingService.sendTestMessage(phone, name, null, imagePath);
    res.json(result);
});

// Pause sending
app.post('/api/whatsapp/pause', (req, res) => {
    const sendingService = getSendingService();
    res.json(sendingService.pause());
});

// Resume sending
app.post('/api/whatsapp/resume', (req, res) => {
    const sendingService = getSendingService();
    res.json(sendingService.resume());
});

// Stop sending
app.post('/api/whatsapp/stop', (req, res) => {
    const sendingService = getSendingService();
    res.json(sendingService.stop());
});

// Send to single guest
app.post('/api/whatsapp/send-single', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone is required' });
    }

    try {
        // Get guest data
        const guestDoc = await db.collection('guests').doc(phone).get();
        if (!guestDoc.exists) {
            return res.status(404).json({ success: false, error: 'Guest not found' });
        }

        const guest = { id: guestDoc.id, ...guestDoc.data() };
        const sendingService = getSendingService();

        if (!sendingService.getStatus().isConnected) {
            return res.status(400).json({ success: false, error: 'WhatsApp not connected' });
        }

        // CRITICAL: Use sendingService's centralized link generator
        const deepLink = sendingService._generateDeepLink(phone, guest.originalName || guest.name);
        const imagePath = process.env.INVITATION_IMAGE_PATH || null;

        // Get custom message
        const customMessage = await getCustomMessage();

        const result = await sendingService.whatsapp.sendInvitation(
            phone,
            guest.originalName || guest.name,
            deepLink,
            imagePath,
            customMessage
        );

        if (result.success) {
            // Update guest status
            await db.collection('guests').doc(phone).update({
                messageStatus: 'sent',
                lastAttempt: new Date(),
                sentAt: new Date()
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Send single error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Reset guests (keeps name/phone, resets everything else)
app.post('/api/guests/reset', async (req, res) => {
    const { phones } = req.body; // Array of phone numbers

    console.log('🔄 Reset request for phones:', phones);

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ success: false, error: 'Phones array is required' });
    }

    try {
        let resetCount = 0;

        for (const phone of phones) {
            const docRef = db.collection('guests').doc(phone);
            const doc = await docRef.get();

            if (doc.exists) {
                const existingData = doc.data();
                // Reset but keep name, originalName, and phone
                await docRef.update({
                    messageStatus: 'pending',
                    rsvpSubmitted: false,
                    attending: admin.firestore.FieldValue.delete(),
                    numberOfGuests: admin.firestore.FieldValue.delete(),
                    hasChildren: false,
                    notes: '',
                    rsvpName: admin.firestore.FieldValue.delete(),
                    rsvpSubmittedAt: admin.firestore.FieldValue.delete(),
                    sentAt: admin.firestore.FieldValue.delete(),
                    lastAttempt: admin.firestore.FieldValue.delete(),
                    attemptCount: 0,
                    lastError: admin.firestore.FieldValue.delete()
                });
                resetCount++;
                console.log(`🔄 Reset guest: ${existingData.originalName || existingData.name} (${phone})`);
            } else {
                console.log(`⚠️ Guest not found for reset: ${phone}`);
            }
        }

        console.log(`✅ Reset complete: ${resetCount} guests reset`);
        res.json({ success: true, reset: resetCount });
    } catch (error) {
        console.error('❌ Reset error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete guests
app.post('/api/guests/delete', async (req, res) => {
    const { phones } = req.body; // Array of phone numbers

    console.log('🗑️ Delete request for phones:', phones);

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ success: false, error: 'Phones array is required' });
    }

    try {
        let deleteCount = 0;

        for (const phone of phones) {
            const docRef = db.collection('guests').doc(phone);
            const doc = await docRef.get();

            if (doc.exists) {
                const guestName = doc.data().originalName || doc.data().name;
                await docRef.delete();
                deleteCount++;
                console.log(`🗑️ Deleted guest: ${guestName} (${phone})`);
            } else {
                console.log(`⚠️ Guest not found for delete: ${phone}`);
            }
        }

        console.log(`✅ Delete complete: ${deleteCount} guests deleted`);
        res.json({ success: true, deleted: deleteCount });
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PREMIUM RSVP API BRIDGE
// ============================================


app.post('/api/admin/save-config', (req, res) => {
    console.log('⚙️ Config Update Received:', req.body);
    // TODO: Save to Firestore
    res.json({ success: true });
});


// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
🎉 Wedding Invitation Server is running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Old RSVP:        http://localhost:${PORT}/rsvp.html
📊 Admin Dashboard: http://localhost:${PORT}/admin/dashboard.html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ NEW Premium Editor: http://localhost:${PORT}/premium-rsvp/index.html#/admin/premium-invitation
✨ NEW Premium Invite: http://localhost:${PORT}/premium-rsvp/index.html#/invite/premium
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 API Endpoints:
  POST /api/sync-sheets     - Sync from Google Sheets
  GET  /api/whatsapp/status - Get WhatsApp status
  POST /api/rsvp            - Save NEW Premium RSVP
  POST /api/admin/save-config - Save Design Config
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});