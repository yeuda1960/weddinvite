const { db } = require('../config/firebase');
const { sheets } = require('../config/googleSheets');

/**
 * Normalize Israeli phone number to international format
 * Accepts: +972XXXXXXXXX, 972XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX
 * Returns: 972XXXXXXXXX (without +)
 */
function normalizePhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.toString().replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('972')) {
        // Already in international format
        return cleaned;
    } else if (cleaned.startsWith('0')) {
        // Israeli local format (0XX-XXX-XXXX)
        return '972' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
        // Missing country code and leading 0
        return '972' + cleaned;
    }

    return cleaned.startsWith('972') ? cleaned : '972' + cleaned;
}

/**
 * Fetch guest list from Google Sheets
 * Expected columns: Name, Phone, [any other columns]
 */
async function fetchGuestsFromSheets() {
    try {
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        // Read data from the first sheet, assuming headers in row 1
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:Z', // Read all columns
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in spreadsheet.');
            return [];
        }

        // First row is headers
        const headers = rows[0].map(h => h.toLowerCase().trim());
        const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('שם'));
        const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('טלפון'));

        if (nameIndex === -1 || phoneIndex === -1) {
            throw new Error('Could not find Name and Phone columns in spreadsheet');
        }

        const guests = [];

        // Process each row (skip header)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const name = row[nameIndex]?.trim();
            const phone = row[phoneIndex]?.trim();

            if (name && phone) {
                const normalizedPhone = normalizePhoneNumber(phone);
                if (normalizedPhone) {
                    guests.push({
                        name,
                        phone: normalizedPhone,
                        originalPhone: phone,
                        rowNumber: i + 1
                    });
                }
            }
        }

        console.log(`Fetched ${guests.length} guests from Google Sheets`);
        return guests;

    } catch (error) {
        console.error('Error fetching guests from Google Sheets:', error);
        throw error;
    }
}

/**
 * Save guests to Firestore
 */
async function saveGuestsToFirestore(guests) {
    const batch = db.batch();
    let count = 0;

    for (const guest of guests) {
        const guestRef = db.collection('guests').doc(guest.phone);
        batch.set(guestRef, {
            name: guest.name,
            phone: guest.phone,
            originalPhone: guest.originalPhone,
            messageSent: false,
            messageStatus: 'pending',
            rsvpSubmitted: false,
            createdAt: new Date(),
        }, { merge: true });

        count++;

        // Firestore batch limit is 500
        if (count % 500 === 0) {
            await batch.commit();
            console.log(`Saved ${count} guests to Firestore...`);
        }
    }

    if (count % 500 !== 0) {
        await batch.commit();
    }

    console.log(`Successfully saved ${count} guests to Firestore`);
    return count;
}

/**
 * Update message status for a guest
 */
async function updateMessageStatus(phone, status, error = null) {
    try {
        const guestRef = db.collection('guests').doc(phone);
        await guestRef.update({
            messageSent: status === 'sent',
            messageStatus: status,
            messageError: error,
            messageSentAt: status === 'sent' ? new Date() : null,
        });
    } catch (error) {
        console.error(`Error updating status for ${phone}:`, error);
    }
}

/**
 * Get all guests from Firestore
 */
async function getAllGuests() {
    const snapshot = await db.collection('guests').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get guest statistics
 */
async function getStatistics() {
    const guests = await getAllGuests();

    const stats = {
        total: guests.length,
        messageSent: guests.filter(g => g.messageStatus === 'sent').length,
        messageFailed: guests.filter(g => g.messageStatus === 'failed').length,
        messagePending: guests.filter(g => g.messageStatus === 'pending').length,
        rsvpSubmitted: guests.filter(g => g.rsvpSubmitted).length,
        attending: guests.filter(g => g.attending === true).length,
        notAttending: guests.filter(g => g.attending === false).length,
        totalGuests: guests.reduce((sum, g) => sum + (g.numberOfGuests || 0), 0),
        vegetarian: guests.filter(g => g.vegetarian === true).length,
        withChildren: guests.filter(g => g.hasChildren === true).length,
    };

    return stats;
}

module.exports = {
    normalizePhoneNumber,
    fetchGuestsFromSheets,
    saveGuestsToFirestore,
    updateMessageStatus,
    getAllGuests,
    getStatistics,
};
