/**
 * WhatsApp Invitation Sending Service (Premium Edition)
 */
const WhatsAppService = require('./whatsappService');
const admin = require('firebase-admin');

class SendingService {
    constructor() {
        this.whatsapp = null;
        this.db = admin.firestore();
        this.isRunning = false;
        this.isPaused = false;
        this.shouldStop = false;
        this.currentProgress = { total: 0, sent: 0, failed: 0, pending: 0 };

        // Config
        this.config = {
            retryAttempts: 3,
            retryDelayMs: 1000,
            messagDelayMs: 5000, // 5 seconds between messages
            maxMessageDelayMs: 10000,
            batchSize: 50
        };
        this.isConnected = false;
    }

    async initialize() {
        if (this.whatsapp) return { success: true, message: 'Already initialized' };
        this.whatsapp = new WhatsAppService();
        try {
            await this.whatsapp.initialize();
            this.isConnected = true;
            console.log('✅ Sending service initialized');
            return { success: true, message: 'WhatsApp connected' };
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            this.isConnected = false;
            return { success: false, error: error.message };
        }
    }

    getStatus() {
        console.log('🔍 Frontend polling status. Connected:', this.isConnected);
        return {
            isConnected: this.isConnected,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            progress: this.currentProgress
        };
    }

    // --- CRITICAL: CENTRALIZED LINK GENERATION ---
    _generateDeepLink(phone, name) {
        // 1. Determine Base Domain (Localhost or Production)
        // If RSVP_URL is set in .env (e.g. https://myapp.com), use it. Otherwise localhost.
        let base = process.env.RSVP_URL || 'http://localhost:3000';

        // Remove trailing slash if present to avoid double slash
        if (base.endsWith('/')) base = base.slice(0, -1);

        // Remove 'rsvp.html' if it was accidentally left in the .env variable
        if (base.endsWith('rsvp.html')) base = base.replace('/rsvp.html', '');

        // 2. Clean Data
        const cleanPhone = phone.replace(/\D/g, '');
        const safeName = encodeURIComponent(name || '');

        // 3. Construct THE NEW PREMIUM LINK
        // Structure: Domain + /premium-rsvp/index.html + #/invite/premium + params
        return `${base}/premium-rsvp/index.html#/invite/premium?phone=${cleanPhone}&name=${safeName}`;
    }

    async getCustomMessage() {
        try {
            const doc = await this.db.collection('settings').doc('customMessage').get();
            if (doc.exists && doc.data().message) return doc.data().message;
        } catch (e) { console.error('Error fetching message:', e); }
        return null;
    }

    // --- BATCH SENDING ---
    async sendToAllGuests(rsvpUrlIgnored, imagePath) {
        if (this.isRunning) return { success: false, error: 'Already running' };
        if (!this.isConnected) return { success: false, error: 'WhatsApp not connected' };

        this.isRunning = true;
        this.shouldStop = false;
        this.isPaused = false;

        try {
            const customMessage = await this.getCustomMessage();
            const allSnapshot = await this.db.collection('guests').get();

            const guests = allSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(g => !g.messageStatus || g.messageStatus === 'pending' || g.messageStatus === 'failed');

            console.log(`📤 Starting send to ${guests.length} guests...`);

            if (guests.length === 0) {
                this.isRunning = false;
                return { success: true, message: 'No pending guests' };
            }

            this.currentProgress = { total: guests.length, sent: 0, failed: 0, pending: guests.length };

            for (const guest of guests) {
                if (this.shouldStop) break;
                while (this.isPaused && !this.shouldStop) await this.delay(1000);

                // USE THE CENTRALIZED LINK GENERATOR
                const deepLink = this._generateDeepLink(guest.phone, guest.originalName || guest.name);

                const result = await this.sendWithRetry(guest, deepLink, imagePath, customMessage);

                if (result.success) this.currentProgress.sent++;
                else this.currentProgress.failed++;
                this.currentProgress.pending--;

                const delay = this.config.messagDelayMs + Math.random() * 5000;
                await this.delay(delay);
            }

            this.isRunning = false;
            return { success: true, ...this.currentProgress };

        } catch (error) {
            this.isRunning = false;
            return { success: false, error: error.message };
        }
    }

    async sendWithRetry(guest, deepLink, imagePath, customMessage) {
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                await this.updateGuestStatus(guest.id, 'sending', attempt);

                // DELEGATE TO WHATSAPP SERVICE
                const result = await this.whatsapp.sendInvitation(
                    guest.phone,
                    guest.originalName || guest.name,
                    deepLink, // Passing the correct link
                    imagePath,
                    customMessage
                );

                if (result.success) {
                    await this.updateGuestStatus(guest.id, 'sent', attempt);
                    return { success: true };
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);
                if (attempt < this.config.retryAttempts) await this.delay(1000);
                else {
                    await this.updateGuestStatus(guest.id, 'failed', attempt, error.message);
                    return { success: false, error: error.message };
                }
            }
        }
    }

    // --- TEST SENDING (Fixed to use new link) ---
    async sendTestMessage(phone, name, rsvpUrlIgnored, imagePath) {
        if (!this.isConnected) return { success: false, error: 'Not connected' };

        try {
            // USE THE CENTRALIZED LINK GENERATOR
            const deepLink = this._generateDeepLink(phone, name);
            const customMessage = await this.getCustomMessage();

            console.log(`🧪 Sending TEST to ${phone} with link: ${deepLink}`);

            return await this.whatsapp.sendInvitation(phone, name, deepLink, imagePath, customMessage);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateGuestStatus(guestId, status, attempt, error = null) {
        const data = { messageStatus: status, lastAttempt: new Date(), attemptCount: attempt };
        if (status === 'sent') data.sentAt = new Date();
        if (error) data.lastError = error;
        await this.db.collection('guests').doc(guestId).update(data);
    }

    pause() { this.isPaused = true; return { success: true }; }
    resume() { this.isPaused = false; return { success: true }; }
    stop() { this.shouldStop = true; return { success: true }; }
    delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

let instance = null;
function getSendingService() {
    if (!instance) instance = new SendingService();
    return instance;
}

module.exports = { SendingService, getSendingService };
