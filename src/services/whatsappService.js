const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
    }

    /**
     * Initialize WhatsApp client
     */
    async initialize() {
        console.log('Initializing WhatsApp client...');
        console.log('⏳ This may take 10-30 minutes on first run (downloading browser files)...\n');

        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: false,  // Show browser window
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 180000  // 3 minutes timeout
            }
        });

        // Loading progress event
        this.client.on('loading_screen', (percent, message) => {
            console.log(`⏳ Loading: ${percent}% - ${message}`);
        });

        // QR Code event - scan this with your phone
        this.client.on('qr', (qr) => {
            console.log('\n=================================');
            console.log('📱 QR Code Ready! Scan with your phone:');
            console.log('=================================\n');
            qrcode.generate(qr, { small: true });
            console.log('\n=================================');
            console.log('Open WhatsApp → Settings → Linked Devices → Link a Device');
            console.log('=================================\n');
        });

        // Ready event
        this.client.on('ready', () => {
            console.log('✅ WhatsApp client is ready!');
            this.isReady = true;
        });

        // Authentication success
        this.client.on('authenticated', () => {
            console.log('✅ WhatsApp authenticated successfully');
        });

        // Authentication failure
        this.client.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp authentication failed:', msg);
        });

        // Disconnected
        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp disconnected:', reason);
            this.isReady = false;
        });

        await this.client.initialize();

        // Wait for ready state
        return new Promise((resolve) => {
            if (this.isReady) {
                resolve();
            } else {
                this.client.on('ready', () => resolve());
            }
        });
    }

    /**
     * Send invitation message with image
     * @param {string} phone - Guest phone number
     * @param {string} guestName - Guest name
     * @param {string} rsvpUrl - RSVP page URL
     * @param {string} imagePath - Path to invitation image
     * @param {string} customMessage - Custom message template (optional)
     */
    async sendInvitation(phone, guestName, rsvpUrl, imagePath, customMessage = null) {
        try {
            // Format phone number for WhatsApp (must include country code)
            const chatId = `${phone}@c.us`;

            let message;

            if (customMessage) {
                // Use custom message with placeholder replacement
                message = customMessage
                    .replace(/\{שם\}/g, guestName)
                    .replace(/\{קישור\}/g, rsvpUrl);
            } else {
                // Default message if no custom message provided
                message = `
שלום ${guestName}! 🎉

את/ה מוזמן/ת לחתונה שלנו! 💒

אנחנו שמחים להזמין אותך לחגוג איתנו את היום המיוחד שלנו.

📅 פרטי האירוע מצורפים בתמונה

🔗 אנא אשר/י הגעה בקישור הבא:
${rsvpUrl}

נשמח לראותך! ❤️
          `.trim();
            }

            // Send image with caption
            if (imagePath && fs.existsSync(imagePath)) {
                const media = MessageMedia.fromFilePath(imagePath);
                await this.client.sendMessage(chatId, media, { caption: message });
            } else {
                // If no image, send text only
                await this.client.sendMessage(chatId, message);
            }

            console.log(`✅ Message sent to ${guestName} (${phone})`);
            return { success: true };

        } catch (error) {
            console.error(`❌ Failed to send message to ${phone}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send message with delay to avoid rate limiting
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Destroy client connection
     */
    async destroy() {
        if (this.client) {
            await this.client.destroy();
            console.log('WhatsApp client destroyed');
        }
    }
}

module.exports = WhatsAppService;
