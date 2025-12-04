// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBeS6LBEAqw9m7zkedM7JDJ1LotFI40sOc",
    authDomain: "wedinvite-ee26d.firebaseapp.com",
    projectId: "wedinvite-ee26d",
    storageBucket: "wedinvite-ee26d.firebasestorage.app",
    messagingSenderId: "960125095932",
    appId: "1:960125095932:web:577ae857092e2f1e972c79"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const phoneFromUrl = urlParams.get('phone');

// DOM Elements
const form = document.getElementById('rsvpForm');
const guestNameInput = document.getElementById('guestName');
const guestPhoneInput = document.getElementById('guestPhone');
const attendingRadios = document.getElementsByName('attending');
const attendingQuestions = document.getElementById('attendingQuestions');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const errorMessage = document.getElementById('errorMessage');

// Normalize phone number to 972XXXXXXXXX format
function normalizePhone(phone) {
    if (!phone) return '';

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('972')) {
        // Already in international format
        return cleaned;
    } else if (cleaned.startsWith('0')) {
        // Israeli format: 05X -> 9725X
        return '972' + cleaned.substring(1);
    } else if (cleaned.length === 9 && cleaned.startsWith('5')) {
        // Missing leading 0: 5X -> 9725X
        return '972' + cleaned;
    }

    // Return as-is if we can't normalize
    return cleaned;
}

// Format phone for display (add dashes)
function formatPhoneForDisplay(phone) {
    if (!phone) return '';

    // Remove 972 prefix and format
    let display = phone;
    if (display.startsWith('972')) {
        display = '0' + display.substring(3);
    }

    // Add dashes for readability: 05X-XXX-XXXX
    if (display.length === 10) {
        return display.substring(0, 3) + '-' + display.substring(3, 6) + '-' + display.substring(6);
    }
    return display;
}

// Load guest data on page load
window.addEventListener('DOMContentLoaded', async () => {
    if (phoneFromUrl) {
        const normalizedPhone = normalizePhone(phoneFromUrl);
        // Show phone without 972 prefix in input
        if (normalizedPhone.startsWith('972')) {
            guestPhoneInput.value = '0' + normalizedPhone.substring(3);
        } else {
            guestPhoneInput.value = normalizedPhone;
        }
        await loadGuestData(normalizedPhone);
    }
    // If no phone in URL, user can enter it manually
});

// Load guest data from Firestore
async function loadGuestData(phone) {
    try {
        const guestDoc = await db.collection('guests').doc(phone).get();

        if (guestDoc.exists) {
            const guestData = guestDoc.data();
            // Use originalName or name
            guestNameInput.value = guestData.originalName || guestData.name || '';

            // If already submitted, pre-fill the form
            if (guestData.rsvpSubmitted) {
                prefillForm(guestData);
            }
        } else {
            // Guest not in database - allow manual entry
            console.log('Guest not found in database. Allowing manual entry.');
            guestNameInput.placeholder = 'הכנס/י את שמך המלא';
        }
    } catch (error) {
        console.error('Error loading guest data:', error);
        // Don't show error - allow manual entry
    }
}

// Pre-fill form if already submitted
function prefillForm(data) {
    if (data.attending !== undefined) {
        const attendingValue = data.attending ? 'yes' : 'no';
        const radio = document.querySelector(`input[name="attending"][value="${attendingValue}"]`);
        if (radio) {
            radio.checked = true;
        }

        if (data.attending) {
            attendingQuestions.style.display = 'block';
            const numGuests = data.numberOfGuests || 1;
            document.getElementById('numberOfGuests').value = numGuests;
            document.getElementById('hasChildren').checked = data.hasChildren || false;
            document.getElementById('notes').value = data.notes || '';
        }
    }
}

// Show/hide conditional questions based on attendance
attendingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        clearError();
        if (e.target.value === 'yes') {
            attendingQuestions.style.display = 'block';
        } else {
            attendingQuestions.style.display = 'none';
        }
    });
});

// Clear error on input
guestNameInput.addEventListener('input', clearError);
guestPhoneInput.addEventListener('input', clearError);

// Validate form
function validateForm() {
    const name = guestNameInput.value.trim();
    const phoneRaw = guestPhoneInput.value.trim();
    const phone = normalizePhone(phoneRaw);
    const checkedRadio = document.querySelector('input[name="attending"]:checked');

    // Check phone
    if (!phoneRaw) {
        return { valid: false, message: 'אנא הזן/י את מספר הטלפון שלך.' };
    }

    // Validate phone format (should be 10 digits in 972 format)
    if (phone.length < 10 || phone.length > 12) {
        return { valid: false, message: 'מספר הטלפון אינו תקין. אנא בדוק/י ונסה/י שנית.' };
    }

    // Check name
    if (!name) {
        return { valid: false, message: 'אנא הכנס/י את שמך המלא.' };
    }

    if (name.length < 2) {
        return { valid: false, message: 'השם חייב להכיל לפחות 2 תווים.' };
    }

    // Check attendance selection
    if (!checkedRadio) {
        return { valid: false, message: 'אנא בחר/י האם תוכל/י להגיע.' };
    }

    // If attending, validate additional fields
    if (checkedRadio.value === 'yes') {
        const numberOfGuests = parseInt(document.getElementById('numberOfGuests').value);

        if (isNaN(numberOfGuests) || numberOfGuests < 1) {
            return { valid: false, message: 'אנא הזן/י מספר אורחים תקין (לפחות 1).' };
        }

        if (numberOfGuests > 10) {
            return { valid: false, message: 'מספר האורחים המקסימלי הוא 10. לקבוצות גדולות יותר, אנא צור קשר.' };
        }
    }

    return { valid: true, phone: phone };
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    // Validate form
    const validation = validateForm();
    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    // Disable button and show loader
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        const phone = validation.phone; // Already normalized
        const rsvpName = guestNameInput.value.trim();
        const checkedRadio = document.querySelector('input[name="attending"]:checked');
        const attending = checkedRadio.value === 'yes';

        // Get existing guest data to preserve originalName
        let originalName = rsvpName;
        try {
            const existingDoc = await db.collection('guests').doc(phone).get();
            if (existingDoc.exists) {
                const existingData = existingDoc.data();
                originalName = existingData.originalName || existingData.name || rsvpName;
            }
        } catch (e) {
            // Ignore - use rsvpName as originalName
        }

        const formData = {
            originalName: originalName,  // Keep original name from sync
            rsvpName: rsvpName,          // Name entered in RSVP form
            name: rsvpName,              // Current display name
            phone: phone,
            attending: attending,
            rsvpSubmitted: true,
            rsvpSubmittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // Add conditional fields if attending
        if (attending) {
            formData.numberOfGuests = parseInt(document.getElementById('numberOfGuests').value) || 1;
            formData.hasChildren = document.getElementById('hasChildren').checked;
            formData.notes = document.getElementById('notes').value.trim();
        } else {
            formData.numberOfGuests = 0;
            formData.hasChildren = false;
            formData.notes = '';
        }

        console.log('Submitting RSVP:', formData);

        // Use set with merge to create or update guest
        await db.collection('guests').doc(phone).set(formData, { merge: true });

        console.log('RSVP submitted successfully!');

        // Redirect to confirmation page
        window.location.href = 'confirmation.html';

    } catch (error) {
        console.error('Error submitting RSVP:', error);

        // Provide more specific error messages
        let errorMsg = 'שגיאה בשליחת הטופס. ';
        if (error.code === 'permission-denied') {
            errorMsg += 'אין הרשאה לשמור את הנתונים. אנא צור קשר עם בעלי האירוע.';
        } else if (error.code === 'unavailable') {
            errorMsg += 'השירות אינו זמין כרגע. אנא נסה שוב מאוחר יותר.';
        } else {
            errorMsg += 'אנא נסה שוב או צור קשר עם בעלי האירוע.';
        }

        showError(errorMsg);

        // Re-enable button
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
});

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    // Scroll error into view
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Clear error message
function clearError() {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
}
