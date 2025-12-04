const WhatsAppService = require('../services/whatsappService');

async function testWhatsApp() {
    console.log('📱 Testing WhatsApp Connection...\n');
    console.log('This will initialize WhatsApp Web.');
    console.log('You will need to scan a QR code with your phone.\n');

    const whatsappService = new WhatsAppService();

    try {
        await whatsappService.initialize();

        console.log('\n✅ WhatsApp is ready!');
        console.log('You can now send messages.\n');

        // Keep alive for a moment
        console.log('Keeping connection alive for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        await whatsappService.destroy();
        console.log('✅ Test completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ WhatsApp test failed:', error);
        process.exit(1);
    }
}

testWhatsApp();
