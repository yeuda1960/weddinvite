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

// Load guest data on page load
window.addEventListener('DOMContentLoaded', async () => {
    if (phoneFromUrl) {
        await loadGuestData(phoneFromUrl);
    } else {
        showError('לא נמצא מזהה אורח. אנא השתמש בקישור שנשלח אליך בוואטסאפ.');
    }
});

// Load guest data from Firestore
async function loadGuestData(phone) {
    try {
        const guestDoc = await db.collection('guests').doc(phone).get();

        // Set phone number regardless
        guestPhoneInput.value = phone;

        if (guestDoc.exists) {
            const guestData = guestDoc.data();
            guestNameInput.value = guestData.name;

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
        showError('שגיאה בטעינת הנתונים. אנא נסה שוב.');
    }
}

// Pre-fill form if already submitted
function prefillForm(data) {
    if (data.attending !== undefined) {
        const attendingValue = data.attending ? 'yes' : 'no';
        document.querySelector(`input[name="attending"][value="${attendingValue}"]`).checked = true;

        if (data.attending) {
            attendingQuestions.style.display = 'block';
            const numGuests = data.numberOfGuests || 1;
            document.getElementById('numberOfGuests').value = numGuests;
            document.getElementById('vegetarianCount').value = data.vegetarianCount || 0;
            document.getElementById('totalGuestsDisplay').textContent = numGuests;
            document.getElementById('hasChildren').checked = data.hasChildren || false;
            document.getElementById('notes').value = data.notes || '';
        }
    }
}

// Show/hide conditional questions based on attendance
attendingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'yes') {
            attendingQuestions.style.display = 'block';
        } else {
            attendingQuestions.style.display = 'none';
        }
    });
});

// Update vegetarian count max when total guests changes
document.getElementById('numberOfGuests').addEventListener('input', (e) => {
    const totalGuests = parseInt(e.target.value) || 1;
    const vegetarianInput = document.getElementById('vegetarianCount');
    vegetarianInput.max = totalGuests;
    document.getElementById('totalGuestsDisplay').textContent = totalGuests;

    // Ensure vegetarian count doesn't exceed total
    if (parseInt(vegetarianInput.value) > totalGuests) {
        vegetarianInput.value = totalGuests;
    }
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phone = guestPhoneInput.value;
    if (!phone) {
        showError('לא נמצא מזהה אורח.');
        return;
    }

    // Disable button and show loader
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    errorMessage.style.display = 'none';

    try {
        // Get form data
        const attending = document.querySelector('input[name="attending"]:checked').value === 'yes';
        const name = guestNameInput.value.trim();

        // Validate name
        if (!name) {
            showError('אנא הכנס/י את שמך המלא.');
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            return;
        }

        const formData = {
            name: name,
            phone: phone,
            attending: attending,
            rsvpSubmitted: true,
            rsvpSubmittedAt: new Date(),
        };

        // Add conditional fields if attending
        if (attending) {
            formData.numberOfGuests = parseInt(document.getElementById('numberOfGuests').value) || 1;
            formData.vegetarianCount = parseInt(document.getElementById('vegetarianCount').value) || 0;
            formData.hasChildren = document.getElementById('hasChildren').checked;
            formData.notes = document.getElementById('notes').value.trim();
        } else {
            formData.numberOfGuests = 0;
            formData.vegetarianCount = 0;
            formData.hasChildren = false;
            formData.notes = '';
        }

        // Use set with merge to create or update guest
        await db.collection('guests').doc(phone).set(formData, { merge: true });

        // Redirect to confirmation page
        window.location.href = 'confirmation.html';

    } catch (error) {
        console.error('Error submitting RSVP:', error);
        showError('שגיאה בשליחת הטופס. אנא נסה שוב.');

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
}
