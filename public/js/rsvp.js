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

// ============================================
// DEFAULT CONFIG (Visible Demo Values)
// ============================================
const DEFAULT_CONFIG = {
    content: {
        namesTitle: 'חתונה - תצוגה מקדימה',
        welcomeText: 'שמחים להזמין אתכם לחגוג איתנו',
        thankYouText: 'תודה שאישרתם הגעה! נתראה בחתונה ❤️',
        eventDate: '2024-12-31',
        eventTime: '19:30',
        venueName: 'אולם אירועים',
        venueAddress: 'תל אביב, ישראל',
        mapsLink: ''
    },
    media: {
        introAnimation: 'envelope',
        musicUrl: '',
    },
    style: {
        primaryColor: '#D4AF37',
        fontFamily: 'Heebo',
    }
};

console.log('[RSVP] Initialized with DEFAULT_CONFIG:', DEFAULT_CONFIG);

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const phoneFromUrl = urlParams.get('phone');
const isPreview = urlParams.get('preview') === 'draft';

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

// Premium UI Elements
const uiIds = {
    introOverlay: document.getElementById('introOverlay'),
    introAnimationContainer: document.getElementById('introAnimationContainer'),
    introTitle: document.getElementById('introTitle'),
    mainContent: document.getElementById('mainContent'),
    namesTitleDisplay: document.getElementById('namesTitleDisplay'),
    welcomeTextDisplay: document.getElementById('welcomeTextDisplay'),
    eventDateDisplay: document.getElementById('eventDateDisplay'),
    eventTimeDisplay: document.getElementById('eventTimeDisplay'),
    venueNameDisplay: document.getElementById('venueNameDisplay'),
    venueAddressDisplay: document.getElementById('venueAddressDisplay'),
    wazeBtn: document.getElementById('wazeBtn'),
    mapsBtn: document.getElementById('mapsBtn'),
    bgMusic: document.getElementById('bgMusic'),
    musicToggle: document.getElementById('musicToggle'),
    thankYouTextDisplay: document.getElementById('thankYouTextDisplay'),
};

// ============================================
// LIVE PREVIEW UPDATE LISTENER
// ============================================
// Listen for config updates from the designer (via postMessage)
window.addEventListener('message', (event) => {
    // Security: In production, check event.origin
    if (event.data && event.data.type === 'UPDATE_CONFIG') {
        console.log('[RSVP] 📡 Received live config update from designer');
        const newConfig = event.data.config;

        // Merge with defaults and apply
        const finalConfig = mergeWithDefaults(newConfig);
        applyConfig(finalConfig);
    }
});

// ============================================
// CONFIGURATION & PREMIUM LOGIC
// ============================================

async function invokePremiumExperience() {
    console.log('[RSVP] 🚀 Starting premium experience setup...');

    try {
        // 1. Load Config from Firestore
        const collection = 'invitationPageConfig';
        const docId = isPreview ? 'draft' : 'published';

        console.log(`[RSVP] 📡 Fetching config: ${collection}/${docId}`);

        let loadedConfig = null;
        try {
            const doc = await db.collection(collection).doc(docId).get();
            if (doc.exists) {
                loadedConfig = doc.data();
                console.log('[RSVP] ✅ Config loaded from Firestore:', loadedConfig);
            } else {
                console.log(`[RSVP] ⚠️ Document ${docId} does not exist`);

                // If draft doesn't exist, try published
                if (isPreview) {
                    console.log('[RSVP] 🔄 Trying published config as fallback...');
                    const publishedDoc = await db.collection(collection).doc('published').get();
                    if (publishedDoc.exists) {
                        loadedConfig = publishedDoc.data();
                        console.log('[RSVP] ✅ Loaded published config:', loadedConfig);
                    }
                }
            }
        } catch (fetchError) {
            console.warn('[RSVP] ❌ Firebase fetch error (using defaults):', fetchError);
            console.warn('[RSVP] Error details:', {
                code: fetchError.code,
                message: fetchError.message
            });
        }

        // 2. Merge with defaults (ALWAYS have a valid config)
        const finalConfig = loadedConfig ? mergeWithDefaults(loadedConfig) : DEFAULT_CONFIG;

        console.log('[RSVP] 🎨 Final config to apply:', finalConfig);
        console.log('[RSVP] Config source:', loadedConfig ? 'FIRESTORE' : 'DEFAULTS');

        // 3. Apply Config (this MUST succeed)
        try {
            applyConfig(finalConfig);
            console.log('[RSVP] ✅ Config applied successfully');
        } catch (applyError) {
            console.error('[RSVP] ❌ Error applying config:', applyError);
            // Even if apply fails, ensure content is visible
            ensureContentVisible();
        }

    } catch (error) {
        console.error('[RSVP] ❌ CRITICAL ERROR in premium setup:', error);
        console.error('[RSVP] Stack trace:', error.stack);

        // ULTIMATE FALLBACK: Ensure content is visible
        ensureContentVisible();

        // Apply defaults anyway
        try {
            applyConfig(DEFAULT_CONFIG);
        } catch (e) {
            console.error('[RSVP] ❌ Even default config failed:', e);
        }
    }
}

// Helper: Merge loaded config with defaults
function mergeWithDefaults(loaded) {
    return {
        content: { ...DEFAULT_CONFIG.content, ...(loaded.content || {}) },
        media: { ...DEFAULT_CONFIG.media, ...(loaded.media || {}) },
        style: { ...DEFAULT_CONFIG.style, ...(loaded.style || {}) }
    };
}

// Helper: Ensure content is visible (emergency fallback)
function ensureContentVisible() {
    console.log('[RSVP] 🆘 Emergency: Forcing content visible');
    if (uiIds.mainContent) {
        uiIds.mainContent.style.opacity = '1';
        uiIds.mainContent.style.pointerEvents = 'all';
    }
    if (uiIds.introOverlay) {
        uiIds.introOverlay.style.display = 'none';
    }
}


function applyConfig(config) {
    // 1. STYLE
    if (config.style) {
        document.documentElement.style.setProperty('--primary-color', config.style.primaryColor || '#D4AF37');
        document.documentElement.style.setProperty('--font-family', `'${config.style.fontFamily}', sans-serif` || "'Heebo', sans-serif");
    }

    // 2. CONTENT
    if (config.content) {
        const c = config.content;
        setText(uiIds.namesTitleDisplay, c.namesTitle);
        setText(uiIds.welcomeTextDisplay, c.welcomeText);

        // Date formatting
        if (c.eventDate) {
            const dateObj = new Date(c.eventDate);
            const formattedDate = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
            setText(uiIds.eventDateDisplay, formattedDate);
        }

        setText(uiIds.eventTimeDisplay, c.eventTime);
        setText(uiIds.venueNameDisplay, c.venueName);
        setText(uiIds.venueAddressDisplay, c.venueAddress);

        // Thank you text (saved for after submit)
        window.thankYouMessage = c.thankYouText || 'תודה!';

        // Maps
        if (c.venueAddress || c.venueName) {
            const query = encodeURIComponent(`${c.venueName || ''} ${c.venueAddress || ''}`.trim());
            uiIds.wazeBtn.href = `https://waze.com/ul?q=${query}&navigate=yes`;

            if (c.mapsLink) {
                uiIds.mapsBtn.href = c.mapsLink;
            } else {
                uiIds.mapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
            }
        }
    }

    // 3. MEDIA (Intro & Music)
    setupMedia(config.media);

    // 4. Reveal Animation Observer
    setupScrollReveal();
}

function setText(el, text) {
    if (el && text) el.textContent = text;
}

function setupMedia(media) {
    if (!media) return;

    // Intro Animation
    let animationIcon = '💌';
    if (media.introAnimation === 'heart') animationIcon = '❤️';
    else if (media.introAnimation === 'rings') animationIcon = '💍';

    if (media.introAnimation && media.introAnimation !== 'none') {
        uiIds.introAnimationContainer.textContent = animationIcon;
        uiIds.introTitle.textContent = uiIds.namesTitleDisplay.textContent; // Sync title

        // Tap to open handler
        uiIds.introOverlay.addEventListener('click', () => {
            // 1. Fade out overlay
            uiIds.introOverlay.style.opacity = '0';
            uiIds.introOverlay.style.visibility = 'hidden';

            // 2. Reveal content
            uiIds.mainContent.style.opacity = '1';
            uiIds.mainContent.style.pointerEvents = 'all';

            // 3. Try play music
            if (media.musicUrl && uiIds.bgMusic) {
                uiIds.bgMusic.play().then(() => {
                    uiIds.musicToggle.classList.add('music-playing');
                }).catch(e => console.log('Autoplay blocked:', e));
            }
        });

    } else {
        // No animation, just show content
        uiIds.introOverlay.style.display = 'none';
        uiIds.mainContent.style.opacity = '1';
        uiIds.mainContent.style.pointerEvents = 'all';
    }

    // Music Setup
    if (media.musicUrl) {
        uiIds.bgMusic.src = media.musicUrl;
        uiIds.musicToggle.style.display = 'flex';

        uiIds.musicToggle.addEventListener('click', () => {
            if (uiIds.bgMusic.paused) {
                uiIds.bgMusic.play();
                uiIds.musicToggle.classList.add('music-playing');
            } else {
                uiIds.bgMusic.pause();
                uiIds.musicToggle.classList.remove('music-playing');
            }
        });
    }
}

function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section-reveal').forEach(el => observer.observe(el));
}


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
    // START PREMIUM EXPERIENCE
    await invokePremiumExperience();

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

        // Check if guest already exists to determine if this is new or update
        let isNewGuest = true;
        try {
            const existingDoc = await db.collection('guests').doc(phone).get();
            if (existingDoc.exists) {
                isNewGuest = false;
            }
        } catch (e) {
            // Assume new guest on error
        }

        // Build formData - NEVER include originalName for existing guests
        const formData = {
            rsvpName: rsvpName,          // Name entered in RSVP form (always save)
            name: rsvpName,              // Current display name
            phone: phone,
            attending: attending,
            rsvpSubmitted: true,
            rsvpSubmittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // Only set originalName for NEW guests
        if (isNewGuest) {
            formData.originalName = rsvpName;
        }

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

        // HIDE FORM -> SHOW SUCCESS (Premium Flow)
        form.style.display = 'none';

        const thankYouContainer = document.querySelector('.rsvp-card');
        thankYouContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">אישור ההגעה התקבל!</h2>
                <p style="color: #666; font-size: 1.1rem;">${window.thankYouMessage || 'תודה רבה! נתראה בחתונה'}</p>
            </div>
        `;

        // Show footer thank you as well if enabled
        if (uiIds.thankYouTextDisplay) {
            uiIds.thankYouTextDisplay.style.display = 'block';
            uiIds.thankYouTextDisplay.textContent = window.thankYouMessage;
        }

        // window.location.href = 'confirmation.html';

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
