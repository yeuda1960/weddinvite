/**
 * RSVP Stepper - Premium Multi-Step Form
 * ========================================
 * Implements a smooth stepped RSVP flow:
 * - Step 0: Choose attendance (Yes/No/Maybe) with 3 big buttons
 * - Step 0.5: Intermediate confirmation screen
 * - Step 1: Number of guests + children (if attending)
 * - Step 2: Notes (if attending)
 * - Success: Elegant thank you screen
 * 
 * Preserves all backend logic: Firebase writes, normalizePhone, schema
 */

(function() {
    'use strict';

    // State
    let currentStep = 0;
    let formData = {
        attendanceStatus: null, // 'yes' | 'no' | 'maybe'
        attending: null, // true | false | null (for maybe)
        guestsCount: 1,
        hasChildren: false,
        childrenCount: 0,
        dietary: '',
        notes: '',
        guestName: '',
        guestPhone: ''
    };

    // DOM Elements
    const stepperContainer = document.getElementById('rsvpStepperContainer');
    const progressIndicator = document.getElementById('stepperProgress');
    const stepContent = document.getElementById('stepContent');
    const navigationButtons = document.getElementById('stepperNav');
    const errorDisplay = document.getElementById('stepperError');

    // ============================================
    // INITIALIZATION
    // ============================================
    function initStepper() {
        console.log('[Stepper] Initializing RSVP Stepper');
        
        // Pre-fill from URL params if available
        const urlParams = new URLSearchParams(window.location.search);
        const phoneFromUrl = urlParams.get('phone');
        if (phoneFromUrl) {
            formData.guestPhone = phoneFromUrl;
        }

        // Try to load existing RSVP
        loadExistingRSVP().then(() => {
            renderStep();
        });
    }

    // ============================================
    // LOAD EXISTING RSVP
    // ============================================
    async function loadExistingRSVP() {
        if (!formData.guestPhone) return;

        try {
            const normalizedPhone = normalizePhone(formData.guestPhone);
            const docRef = window.db.collection('guests').doc(normalizedPhone);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                console.log('[Stepper] Loaded existing RSVP:', data);

                // Map data to formData
                formData.guestName = data.name || '';
                formData.attending = data.attending;
                formData.guestsCount = data.numberOfGuests || 1;
                formData.hasChildren = data.hasChildren || false;
                formData.childrenCount = data.childrenCount || 0;
                formData.notes = data.notes || '';
                formData.dietary = data.dietary || '';

                // Determine attendanceStatus
                if (data.attending === true) {
                    formData.attendanceStatus = 'yes';
                } else if (data.attending === false) {
                    formData.attendanceStatus = 'no';
                } else {
                    formData.attendanceStatus = 'maybe';
                }

                // Show success screen if already submitted
                if (data.rsvpSubmittedAt) {
                    showSuccessScreen(true);
                    return;
                }
            }
        } catch (error) {
            console.error('[Stepper] Error loading existing RSVP:', error);
        }
    }

    // ============================================
    // RENDER STEP
    // ============================================
    function renderStep() {
        hideError();
        updateProgress();
        
        switch(currentStep) {
            case 0:
                renderStep0_Attendance();
                break;
            case 0.5:
                renderStep05_Confirmation();
                break;
            case 1:
                renderStep1_Guests();
                break;
            case 2:
                renderStep2_Notes();
                break;
            default:
                renderStep0_Attendance();
        }

        updateNavigation();
        scrollToStepper();
    }

    // ============================================
    // STEP 0: ATTENDANCE CHOICE (3 OPTIONS)
    // ============================================
    function renderStep0_Attendance() {
        stepContent.innerHTML = `
            <div class="stepper-step fade-in">
                <h3 class="stepper-title">האם תוכל/י להגיע?</h3>
                
                <div class="attendance-options">
                    <button type="button" 
                        class="attendance-btn ${formData.attendanceStatus === 'yes' ? 'selected' : ''}" 
                        data-value="yes">
                        <span class="attendance-emoji">🎉</span>
                        <span class="attendance-label">כן, אגיע בשמחה!</span>
                    </button>
                    
                    <button type="button" 
                        class="attendance-btn ${formData.attendanceStatus === 'maybe' ? 'selected' : ''}" 
                        data-value="maybe">
                        <span class="attendance-emoji">🤔</span>
                        <span class="attendance-label">עדיין מתלבט/ת</span>
                    </button>
                    
                    <button type="button" 
                        class="attendance-btn ${formData.attendanceStatus === 'no' ? 'selected' : ''}" 
                        data-value="no">
                        <span class="attendance-emoji">🤍</span>
                        <span class="attendance-label">לצערי, לא אוכל</span>
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        stepContent.querySelectorAll('.attendance-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.getAttribute('data-value');
                formData.attendanceStatus = value;
                
                if (value === 'yes') {
                    formData.attending = true;
                } else if (value === 'no') {
                    formData.attending = false;
                } else {
                    formData.attending = null;
                }

                // Update UI
                stepContent.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    // ============================================
    // STEP 0.5: INTERMEDIATE CONFIRMATION
    // ============================================
    function renderStep05_Confirmation() {
        let emoji, title, message;

        if (formData.attendanceStatus === 'yes') {
            emoji = '🎊';
            title = 'מדהים! נשמח לראות אתכם';
            message = 'בואו נדע עוד כמה פרטים קטנים...';
        } else if (formData.attendanceStatus === 'no') {
            emoji = '🤍';
            title = 'מצטערים שלא תוכלו להגיע';
            message = 'נשמח לחגוג ביחד באירועים הבאים';
        } else {
            emoji = '🤔';
            title = 'אין בעיה!';
            message = 'תוכלו לעדכן אותנו בכל עת';
        }

        stepContent.innerHTML = `
            <div class="stepper-step fade-in text-center">
                <div class="confirmation-emoji">${emoji}</div>
                <div class="confirmation-card">
                    <h3 class="confirmation-title">${title}</h3>
                    <p class="confirmation-message">${message}</p>
                </div>
            </div>
        `;
    }

    // ============================================
    // STEP 1: NUMBER OF GUESTS + CHILDREN
    // ============================================
    function renderStep1_Guests() {
        stepContent.innerHTML = `
            <div class="stepper-step fade-in">
                <h3 class="stepper-title">כמה אורחים יגיעו?</h3>
                
                <div class="guests-counter">
                    <button type="button" class="counter-btn" id="decrementGuests">−</button>
                    <span class="counter-value" id="guestsValue">${formData.guestsCount}</span>
                    <button type="button" class="counter-btn" id="incrementGuests">+</button>
                </div>
                <p class="counter-subtitle">כולל אותך</p>

                <div class="children-section">
                    <label class="checkbox-label">
                        <input type="checkbox" id="hasChildren" ${formData.hasChildren ? 'checked' : ''}>
                        <span class="checkbox-custom"></span>
                        <span>יגיעו ילדים 👶</span>
                    </label>
                    
                    <div id="childrenCountSection" class="children-counter ${formData.hasChildren ? '' : 'hidden'}">
                        <p class="children-label">כמה ילדים?</p>
                        <div class="guests-counter small">
                            <button type="button" class="counter-btn" id="decrementChildren">−</button>
                            <span class="counter-value" id="childrenValue">${formData.childrenCount}</span>
                            <button type="button" class="counter-btn" id="incrementChildren">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('decrementGuests').addEventListener('click', () => {
            formData.guestsCount = Math.max(1, formData.guestsCount - 1);
            document.getElementById('guestsValue').textContent = formData.guestsCount;
        });

        document.getElementById('incrementGuests').addEventListener('click', () => {
            formData.guestsCount = Math.min(20, formData.guestsCount + 1);
            document.getElementById('guestsValue').textContent = formData.guestsCount;
        });

        document.getElementById('hasChildren').addEventListener('change', (e) => {
            formData.hasChildren = e.target.checked;
            document.getElementById('childrenCountSection').classList.toggle('hidden', !e.target.checked);
            if (!e.target.checked) {
                formData.childrenCount = 0;
                document.getElementById('childrenValue').textContent = 0;
            }
        });

        document.getElementById('decrementChildren').addEventListener('click', () => {
            formData.childrenCount = Math.max(0, formData.childrenCount - 1);
            document.getElementById('childrenValue').textContent = formData.childrenCount;
        });

        document.getElementById('incrementChildren').addEventListener('click', () => {
            formData.childrenCount = Math.min(formData.guestsCount, formData.childrenCount + 1);
            document.getElementById('childrenValue').textContent = formData.childrenCount;
        });
    }

    // ============================================
    // STEP 2: NOTES
    // ============================================
    function renderStep2_Notes() {
        stepContent.innerHTML = `
            <div class="stepper-step fade-in">
                <h3 class="stepper-title">עוד משהו?</h3>
                
                <div class="notes-fields">
                    <div class="form-field">
                        <input type="text" 
                            id="dietary" 
                            class="stepper-input" 
                            placeholder="רגישויות מזון / העדפות"
                            value="${formData.dietary || ''}">
                    </div>
                    
                    <div class="form-field">
                        <textarea 
                            id="notes" 
                            class="stepper-textarea" 
                            rows="3"
                            placeholder="הערות נוספות...">${formData.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('dietary').addEventListener('input', (e) => {
            formData.dietary = e.target.value;
        });

        document.getElementById('notes').addEventListener('input', (e) => {
            formData.notes = e.target.value;
        });
    }

    // ============================================
    // SUCCESS SCREEN
    // ============================================
    function showSuccessScreen(isEdit = false) {
        let emoji, title, message;

        if (formData.attendanceStatus === 'yes') {
            emoji = '✨';
            title = 'תודה רבה!';
            message = 'אישור ההגעה נשלח בהצלחה. נתראה בחתונה! ❤️';
        } else if (formData.attendanceStatus === 'no') {
            emoji = '🤍';
            title = 'תודה על העדכון';
            message = 'נשמח לחגוג ביחד באירועים הבאים';
        } else {
            emoji = '🤔';
            title = 'תודה על המשוב';
            message = 'תוכלו לעדכן את התשובה בכל עת';
        }

        stepperContainer.innerHTML = `
            <div class="success-screen fade-in">
                <div class="success-emoji">${emoji}</div>
                <h2 class="success-title">${title}</h2>
                <p class="success-message">${message}</p>
                ${isEdit ? '<button type="button" class="btn-edit-response" id="editResponse">ערוך תשובה</button>' : ''}
            </div>
        `;

        if (isEdit) {
            document.getElementById('editResponse').addEventListener('click', () => {
                // Reload stepper
                location.reload();
            });
        }

        // Hide progress and nav
        progressIndicator.style.display = 'none';
        navigationButtons.style.display = 'none';
    }

    // ============================================
    // NAVIGATION
    // ============================================
    function updateNavigation() {
        const isStep0 = currentStep === 0;
        const isStep05 = currentStep === 0.5;
        const canGoBack = currentStep > 0 && currentStep !== 0.5;
        const isLastStep = currentStep === 2;
        
        navigationButtons.innerHTML = '';

        // Back button
        if (canGoBack) {
            const backBtn = document.createElement('button');
            backBtn.type = 'button';
            backBtn.className = 'stepper-btn stepper-btn-secondary';
            backBtn.textContent = 'חזרה';
            backBtn.addEventListener('click', goBack);
            navigationButtons.appendChild(backBtn);
        }

        // Next/Submit button
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'stepper-btn stepper-btn-primary';
        nextBtn.id = 'nextStepBtn';
        
        if (isStep05 && (formData.attendanceStatus === 'no' || formData.attendanceStatus === 'maybe')) {
            nextBtn.textContent = 'שלח תשובה';
            nextBtn.addEventListener('click', submitRSVP);
        } else if (isLastStep) {
            nextBtn.textContent = 'שלח אישור';
            nextBtn.addEventListener('click', submitRSVP);
        } else {
            nextBtn.textContent = 'המשך';
            nextBtn.addEventListener('click', goNext);
        }

        navigationButtons.appendChild(nextBtn);
    }

    function goNext() {
        // Validation
        if (currentStep === 0 && !formData.attendanceStatus) {
            showError('אנא בחר/י אחת מהאפשרויות');
            return;
        }

        hideError();

        // Routing
        if (currentStep === 0) {
            currentStep = 0.5;
        } else if (currentStep === 0.5) {
            if (formData.attendanceStatus === 'yes') {
                currentStep = 1;
            } else {
                // Submit directly for no/maybe
                submitRSVP();
                return;
            }
        } else {
            currentStep++;
        }

        renderStep();
    }

    function goBack() {
        if (currentStep === 1) {
            currentStep = 0.5;
        } else if (currentStep > 0) {
            currentStep--;
        }
        renderStep();
    }

    // ============================================
    // SUBMIT RSVP
    // ============================================
    async function submitRSVP() {
        const submitBtn = document.getElementById('nextStepBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'שולח...';

        try {
            // Get name and phone (should be pre-filled or from original form)
            const guestName = formData.guestName || document.getElementById('guestName')?.value || 'אורח';
            const guestPhone = formData.guestPhone || document.getElementById('guestPhone')?.value;

            if (!guestPhone) {
                showError('מספר טלפון חסר');
                submitBtn.disabled = false;
                submitBtn.textContent = 'שלח אישור';
                return;
            }

            const normalizedPhone = normalizePhone(guestPhone);

            // Prepare data
            const rsvpData = {
                name: guestName,
                phone: normalizedPhone,
                attending: formData.attending,
                attendanceStatus: formData.attendanceStatus,
                numberOfGuests: formData.attendanceStatus === 'yes' ? formData.guestsCount : 0,
                hasChildren: formData.attendanceStatus === 'yes' ? formData.hasChildren : false,
                childrenCount: formData.attendanceStatus === 'yes' ? formData.childrenCount : 0,
                dietary: formData.attendanceStatus === 'yes' ? formData.dietary : '',
                notes: formData.notes || '',
                rsvpSubmittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('[Stepper] Submitting RSVP:', rsvpData);

            // Write to Firestore
            await window.db.collection('guests').doc(normalizedPhone).set(rsvpData, { merge: true });

            console.log('[Stepper] RSVP submitted successfully');

            // Show success screen
            showSuccessScreen(true);

        } catch (error) {
            console.error('[Stepper] Submit error:', error);
            showError('שגיאה בשליחה. אנא נסה/י שוב');
            submitBtn.disabled = false;
            submitBtn.textContent = 'שלח אישור';
        }
    }

    // ============================================
    // PROGRESS INDICATOR
    // ============================================
    function updateProgress() {
        // Only show for steps 0, 1, 2 (not 0.5)
        if (currentStep === 0.5 || currentStep === 3) {
            progressIndicator.style.display = 'none';
            return;
        }

        progressIndicator.style.display = 'flex';
        
        const steps = [0, 1, 2];
        progressIndicator.innerHTML = steps.map(step => {
            let className = 'progress-dot';
            if (step === currentStep) className += ' active';
            else if (step < currentStep) className += ' completed';
            return `<div class="${className}"></div>`;
        }).join('');
    }

    // ============================================
    // ERROR HANDLING
    // ============================================
    function showError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        errorDisplay.classList.add('shake');
        setTimeout(() => errorDisplay.classList.remove('shake'), 500);
    }

    function hideError() {
        errorDisplay.style.display = 'none';
    }

    // ============================================
    // UTILITIES
    // ============================================
    function scrollToStepper() {
        setTimeout(() => {
            stepperContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    function normalizePhone(phone) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Remove leading country codes
        if (cleaned.startsWith('972')) {
            cleaned = cleaned.substring(3);
        } else if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // Add 972 prefix
        return '972' + cleaned;
    }

    // ============================================
    // EXPORT TO WINDOW
    // ============================================
    window.RSVPStepper = {
        init: initStepper,
        formData: formData
    };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStepper);
    } else {
        initStepper();
    }

})();
