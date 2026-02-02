const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.isReady = false;
        this.initializeEvents();
    }

    initializeEvents() {
        this.client.on('qr', (qr) => {
            console.log('📱 QR RECEIVED', qr);
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('✅ WhatsApp is READY!');
            this.isReady = true;
        });

        this.client.on('authenticated', () => {
            console.log('✅ WhatsApp authenticated successfully');
            this.isReady = true; // Force ready on auth
        });

        this.client.on('auth_failure', msg => {
            console.error('❌ AUTHENTICATION FAILURE', msg);
            this.isReady = false;
        });

        this.client.on('disconnected', (reason) => {
            console.log('❌ WhatsApp Disconnected:', reason);
            this.isReady = false;
        });
    }

    initialize() {
        console.log('🚀 Initializing WhatsApp Client...');
        return this.client.initialize();
    }

    async sendInvitation(phone, name, rsvpUrl, imagePath, customMessage) {
        try {
            // 1. Sanitize Phone
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            if (!cleanPhone.startsWith('972')) cleanPhone = '972' + cleanPhone;

            console.log(`🔍 Verifying: ${cleanPhone}...`);

            // 2. Resolve WhatsApp ID (LID)
            const contactId = await this.client.getNumberId(cleanPhone);

            if (!contactId) {
                console.warn(`⚠️ Skipped: ${cleanPhone} not registered.`);
                return { success: false, error: 'Number not registered on WhatsApp' };
            }

            const chatId = contactId._serialized;

            // 3. Prepare Message
            let messageText = customMessage
                ? customMessage.replace('{שם}', name).replace('{קישור}', rsvpUrl)
                : `שלום ${name}!\nנשמח לראותכם בחתונה שלנו.\nלפרטים ואישור הגעה: ${rsvpUrl}`;

            // 4. GET CHAT OBJECT (Crucial Step to bypass sendSeen crash)
            const chat = await this.client.getChatById(chatId);

            // 5. Send using Chat Object
            let msg;
            if (imagePath && fs.existsSync(imagePath)) {
                try {
                    const media = MessageMedia.fromFilePath(imagePath);
                    msg = await chat.sendMessage(media, { caption: messageText });
                } catch (imgErr) {
                    console.error('Image send failed, sending text:', imgErr);
                    msg = await chat.sendMessage(messageText);
                }
            } else {
                msg = await chat.sendMessage(messageText);
            }

            if (msg && msg.id) {
                console.log(`✅ Sent to ${name} (${cleanPhone})`);
                return { success: true };
            } else {
                throw new Error('No message ID returned');
            }

        } catch (error) {
            console.error(`❌ Send Error (${name}):`, error.message);
            // Check for specific known crashes
            if (error.message.includes('markedUnread')) {
                return { success: false, error: 'WhatsApp internal error (markedUnread)' };
            }
            return { success: false, error: error.message };
        }
    }
}

module.exports = WhatsAppService;
