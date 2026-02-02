/**
 * RSVP Stepper - Handles In-Card Form Flow
 */

const rsvpStepper = {
    currentStep: 0,
    selectedPath: null, // 'yes', 'no', 'undecided'

    init() {
        // Show first step (Name/Phone)
        this.showStep(0);

        // Initialize hidden input if not exists
        if (!document.getElementById('attendingInput')) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.id = 'attendingInput';
            input.name = 'attending';
            document.getElementById('rsvpForm').appendChild(input);
        }
    },

    showStep(stepIndex) {
        document.querySelectorAll('.rsvp-step').forEach(step => step.style.display = 'none');
        const step = document.querySelector(`.rsvp-step[data-step="${stepIndex}"]`);
        if (step) {
            step.style.display = 'block';
            step.style.opacity = '1';
        }
        this.currentStep = stepIndex;
    },

    next() {
        // Validation for Step 0 (Name/Phone)
        if (this.currentStep === 0) {
            const name = document.getElementById('guestName').value;
            const phone = document.getElementById('guestPhone').value;
            if (!name || !phone) {
                this.showError('אנא מלא/י את כל השדות');
                return;
            }
            // Go to Step 1 (Options)
            this.showStep(1);
            this.clearError();
        }
    },

    prev() {
        // Validation for Step 1 -> Back to 0
        if (this.currentStep === 1) {
            this.showStep(0);
            this.clearError();
        }
    },

    selectOption(value) {
        this.selectedPath = value;

        // Update hidden input for generic form submission
        const hiddenInput = document.getElementById('attendingInput');
        if (hiddenInput) hiddenInput.value = value;

        // UI Update: Active Card
        document.querySelectorAll('.option-card').forEach(card => {
            const content = card.querySelector('.option-content');

            if (card.dataset.value === value) {
                card.classList.add('active');
                card.classList.remove('inactive');
                if (content) content.style.display = 'block';
            } else {
                card.classList.remove('active');
                card.classList.add('inactive'); // Dim others
                if (content) content.style.display = 'none';
            }
        });

        this.clearError();
    },

    incrementGuests() {
        const input = document.getElementById('numberOfGuests');
        const current = parseInt(input.value) || 1;
        input.value = current + 1;
    },

    decrementGuests() {
        const input = document.getElementById('numberOfGuests');
        const current = parseInt(input.value) || 1;
        if (current > 1) {
            input.value = current - 1;
        }
    },

    submitFromCard(value) {
        // 1. Ensure option is selected
        if (this.selectedPath !== value) {
            this.selectOption(value);
        }

        // 2. Trigger Main Form Submit
        const form = document.getElementById('rsvpForm');

        // Dispatch simple submit event? 
        // Or better: call a global submit handler if accessible? 
        // rsvp.js listens to form 'submit'. 
        // Let's create a synthetic event or just requestSubmit()

        if (form.requestSubmit) {
            form.requestSubmit();
        } else {
            form.submit(); // fallback
        }
    },

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    },

    clearError() {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => rsvpStepper.init());
window.rsvpStepper = rsvpStepper;
