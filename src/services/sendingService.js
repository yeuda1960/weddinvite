/**
 * WhatsApp Invitation Sending Service
 * 
 * Features:
 * - Queue management for batch sending
 * - Retry logic (3 attempts with exponential backoff)
 * - Rate limiting (configurable delay between messages)
 * - Firestore status tracking
 * - Real-time progress updates
 * - Pause/Resume/Stop functionality
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
        this.currentProgress = {
            total: 0,
            sent: 0,
            failed: 0,
            pending: 0
        };

        // Configuration
        this.config = {
            retryAttempts: 3,
            retryDelayMs: 5000,        // Initial retry delay
            messagDelayMs: 7000,        // Delay between messages (7 seconds)
            maxMessageDelayMs: 15000,   // Max random delay
            batchSize: 50               // Process in batches
        };
    }

    /**
     * Initialize WhatsApp connection
     */
    async initialize() {
        if (this.whatsapp) {
            return { success: true, message: 'Already initialized' };
        }

        this.whatsapp = new WhatsAppService();

        try {
            await this.whatsapp.initialize();
            console.log('✅ Sending service initialized');
            return { success: true, message: 'WhatsApp connected' };
        } catch (error) {
            console.error('❌ Failed to initialize WhatsApp:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get WhatsApp connection status
     */
    getStatus() {
        return {
            isConnected: this.whatsapp?.isReady || false,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            progress: this.currentProgress
        };
    }

    /**
     * Send invitations to all pending guests
     */
    async sendToAllGuests(rsvpUrl, imagePath) {
        if (this.isRunning) {
            return { success: false, error: 'Sending already in progress' };
        }

        if (!this.whatsapp?.isReady) {
            return { success: false, error: 'WhatsApp not connected' };
        }

        this.isRunning = true;
        this.shouldStop = false;
        this.isPaused = false;

        try {
            // Get ALL guests and filter for those who need messages
            const allSnapshot = await this.db.collection('guests').get();

            console.log(`📋 Found ${allSnapshot.size} total guests in database`);

            // Filter guests who haven't received the message yet
            const guests = allSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(guest => {
                    // Include if: no status, pending, or failed
                    const status = guest.messageStatus;
                    return !status || status === 'pending' || status === 'failed';
                });

            console.log(`📤 Guests to send: ${guests.length}`);

            if (guests.length === 0) {
                this.isRunning = false;
                return { success: true, message: 'No pending guests to send' };
            }

            this.currentProgress = {
                total: guests.length,
                sent: 0,
                failed: 0,
                pending: guests.length
            };

            console.log(`📤 Starting to send to ${guests.length} guests...`);

            // Process each guest
            for (const guest of guests) {
                // Check if we should stop
                if (this.shouldStop) {
                    console.log('⏹️ Sending stopped by user');
                    break;
                }

                // Wait while paused
                while (this.isPaused && !this.shouldStop) {
                    await this.delay(1000);
                }

                if (this.shouldStop) break;

                // Send to this guest with retries
                const result = await this.sendWithRetry(guest, rsvpUrl, imagePath);

                // Update progress
                if (result.success) {
                    this.currentProgress.sent++;
                } else {
                    this.currentProgress.failed++;
                }
                this.currentProgress.pending--;

                // Random delay between messages (7-15 seconds)
                const delay = this.config.messagDelayMs +
                    Math.random() * (this.config.maxMessageDelayMs - this.config.messagDelayMs);
                await this.delay(delay);
            }

            this.isRunning = false;
            console.log('✅ Sending complete:', this.currentProgress);

            return {
                success: true,
                ...this.currentProgress
            };

        } catch (error) {
            console.error('❌ Sending error:', error);
            this.isRunning = false;
            return { success: false, error: error.message };
        }
    }

    /**
     * Send message to a single guest with retry logic
     */
    async sendWithRetry(guest, rsvpUrl, imagePath) {
        let lastError = null;

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                // Update status to "sending"
                await this.updateGuestStatus(guest.id, 'sending', attempt);

                // Send the message
                const personalizedUrl = `${rsvpUrl}?phone=${guest.phone}`;
                const result = await this.whatsapp.sendInvitation(
                    guest.phone,
                    guest.name,
                    personalizedUrl,
                    imagePath
                );

                if (result.success) {
                    // Success! Update status
                    await this.updateGuestStatus(guest.id, 'sent', attempt);
                    console.log(`✅ [${this.currentProgress.sent + 1}/${this.currentProgress.total}] Sent to ${guest.name}`);
                    return { success: true };
                } else {
                    throw new Error(result.error || 'Send failed');
                }

            } catch (error) {
                lastError = error;
                console.log(`⚠️ Attempt ${attempt}/${this.config.retryAttempts} failed for ${guest.name}: ${error.message}`);

                if (attempt < this.config.retryAttempts) {
                    // Exponential backoff
                    const backoffDelay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    console.log(`⏳ Waiting ${backoffDelay / 1000}s before retry...`);
                    await this.delay(backoffDelay);
                }
            }
        }

        // All retries failed
        await this.updateGuestStatus(guest.id, 'failed', this.config.retryAttempts, lastError?.message);
        console.log(`❌ Failed to send to ${guest.name} after ${this.config.retryAttempts} attempts`);
        return { success: false, error: lastError?.message };
    }

    /**
     * Update guest status in Firestore
     */
    async updateGuestStatus(guestId, status, attempt = 1, errorMessage = null) {
        const updateData = {
            messageStatus: status,
            lastAttempt: new Date(),
            attemptCount: attempt
        };

        if (status === 'sent') {
            updateData.sentAt = new Date();
        }

        if (errorMessage) {
            updateData.lastError = errorMessage;
        }

        await this.db.collection('guests').doc(guestId).update(updateData);
    }

    /**
     * Send to a single phone number (for testing)
     */
    async sendTestMessage(phone, name, rsvpUrl, imagePath) {
        if (!this.whatsapp?.isReady) {
            return { success: false, error: 'WhatsApp not connected' };
        }

        try {
            const personalizedUrl = `${rsvpUrl}?phone=${phone}`;
            const result = await this.whatsapp.sendInvitation(phone, name, personalizedUrl, imagePath);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Pause sending
     */
    pause() {
        if (this.isRunning) {
            this.isPaused = true;
            console.log('⏸️ Sending paused');
            return { success: true };
        }
        return { success: false, error: 'Not currently sending' };
    }

    /**
     * Resume sending
     */
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            console.log('▶️ Sending resumed');
            return { success: true };
        }
        return { success: false, error: 'Not paused' };
    }

    /**
     * Stop sending
     */
    stop() {
        this.shouldStop = true;
        this.isPaused = false;
        console.log('⏹️ Stop requested');
        return { success: true };
    }

    /**
     * Destroy WhatsApp connection
     */
    async destroy() {
        this.stop();
        if (this.whatsapp) {
            await this.whatsapp.destroy();
            this.whatsapp = null;
        }
    }

    /**
     * Helper: delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
let sendingServiceInstance = null;

function getSendingService() {
    if (!sendingServiceInstance) {
        sendingServiceInstance = new SendingService();
    }
    return sendingServiceInstance;
}

module.exports = { SendingService, getSendingService };
