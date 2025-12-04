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
app.use(express.static(path.join(__dirname, '../public')));

// Serve RSVP page
app.get('/rsvp', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/rsvp.html'));
});

// Serve Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin/dashboard.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// GOOGLE SHEETS SYNC
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
// WHATSAPP SENDING ENDPOINTS
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

    const rsvpUrl = process.env.RSVP_URL || 'https://wedinvite-ee26d.web.app/rsvp.html';
    const imagePath = process.env.INVITATION_IMAGE_PATH || null;

    // Start sending in background
    sendingService.sendToAllGuests(rsvpUrl, imagePath)
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
    const rsvpUrl = process.env.RSVP_URL || 'https://wedinvite-ee26d.web.app/rsvp.html';
    const imagePath = process.env.INVITATION_IMAGE_PATH || null;

    const result = await sendingService.sendTestMessage(phone, name, rsvpUrl, imagePath);
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

        const rsvpUrl = process.env.RSVP_URL || 'https://wedinvite-ee26d.web.app/rsvp.html';
        const imagePath = process.env.INVITATION_IMAGE_PATH || null;
        const personalizedUrl = `${rsvpUrl}?phone=${phone}`;

        const result = await sendingService.whatsapp.sendInvitation(
            phone,
            guest.originalName || guest.name,
            personalizedUrl,
            imagePath
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
                // Reset but keep name and phone
                await docRef.update({
                    messageStatus: 'pending',
                    rsvpSubmitted: false,
                    attending: null,
                    numberOfGuests: 0,
                    hasChildren: false,
                    notes: '',
                    rsvpName: null,
                    rsvpSubmittedAt: null,
                    sentAt: null,
                    lastAttempt: null,
                    attemptCount: 0,
                    lastError: null
                });
                resetCount++;
                console.log(`🔄 Reset guest: ${existingData.originalName || existingData.name}`);
            }
        }

        res.json({ success: true, reset: resetCount });
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete guests
app.post('/api/guests/delete', async (req, res) => {
    const { phones } = req.body; // Array of phone numbers

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
            }
        }

        res.json({ success: true, deleted: deleteCount });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
🎉 Wedding Invitation Server is running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RSVP Page:      http://localhost:${PORT}/rsvp.html
📊 Admin Dashboard: http://localhost:${PORT}/admin/dashboard.html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 API Endpoints:
  POST /api/sync-sheets     - Sync from Google Sheets
  GET  /api/whatsapp/status - Get WhatsApp status
  POST /api/whatsapp/connect - Connect WhatsApp
  POST /api/whatsapp/send-all - Send to all guests
  POST /api/whatsapp/pause   - Pause sending
  POST /api/whatsapp/resume  - Resume sending
  POST /api/whatsapp/stop    - Stop sending
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});
