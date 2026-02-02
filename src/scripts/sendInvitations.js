require('dotenv').config();
const WhatsAppService = require('../services/whatsappService');
const { fetchGuestsFromSheets, saveGuestsToFirestore, updateMessageStatus } = require('../services/guestService');
const path = require('path');

async function main() {
    console.log('🚀 Starting Wedding Invitation Sender\n');

    try {
        // Step 1: Fetch guests from Google Sheets
        console.log('📊 Fetching guest list from Google Sheets...');
        const guests = await fetchGuestsFromSheets();
        console.log(`Found ${guests.length} guests\n`);

        if (guests.length === 0) {
            console.log('No guests found. Exiting.');
            return;
        }

        // Step 2: Save guests to Firestore
        console.log('💾 Saving guests to Firestore...');
        await saveGuestsToFirestore(guests);
        console.log('✅ Guests saved to database\n');

        // Step 3: Initialize WhatsApp
        console.log('📱 Initializing WhatsApp...');
        const whatsappService = new WhatsAppService();
        await whatsappService.initialize();
        console.log('✅ WhatsApp ready\n');

        // Step 4: Generate Premium Links and Send invitations
        let baseUrl = process.env.RSVP_URL || 'http://localhost:3000';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        if (baseUrl.endsWith('rsvp.html')) baseUrl = baseUrl.replace('/rsvp.html', '');

        const imagePath = process.env.INVITATION_IMAGE_PATH || path.join(__dirname, '../../assets/invitation.jpg');

        console.log('📤 Starting to send invitations...\n');
        console.log(`Base URL: ${baseUrl}`);
        console.log(`Image: ${imagePath}\n`);

        let sentCount = 0;
        let failedCount = 0;

        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i];
            console.log(`[${i + 1}/${guests.length}] Sending to ${guest.name}...`);

            // Generate Premium Deep Link
            const cleanPhone = guest.phone.replace(/\D/g, '');
            const safeName = encodeURIComponent(guest.name || '');
            const deepLink = `${baseUrl}/premium-rsvp/index.html#/invite/premium?phone=${cleanPhone}&name=${safeName}`;

            const result = await whatsappService.sendInvitation(
                guest.phone,
                guest.name,
                deepLink,
                imagePath
            );

            if (result.success) {
                sentCount++;
                await updateMessageStatus(guest.phone, 'sent');
            } else {
                failedCount++;
                await updateMessageStatus(guest.phone, 'failed', result.error);
            }

            // Delay between messages (5-10 seconds to avoid WhatsApp rate limits)
            if (i < guests.length - 1) {
                const delay = 5000 + Math.random() * 5000; // Random delay 5-10 seconds
                console.log(`Waiting ${Math.round(delay / 1000)} seconds...\n`);
                await whatsappService.delay(delay);
            }
        }

        // Step 5: Summary
        console.log('\n=================================');
        console.log('📊 SENDING SUMMARY');
        console.log('=================================');
        console.log(`Total guests: ${guests.length}`);
        console.log(`✅ Sent successfully: ${sentCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log('=================================\n');

        // Cleanup
        await whatsappService.destroy();
        console.log('✅ Done!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
