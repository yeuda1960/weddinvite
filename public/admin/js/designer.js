// Firebase Configuration (Same as dashboard)
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
const storage = firebase.storage();

// CONSTANTS (Safe Defaults Enabled)

// CONSTANTS
const COLLECTION = 'invitationPageConfig';
const DOC_DRAFT = 'draft';
const DOC_PUBLISHED = 'published';

// Default Config
const DEFAULT_CONFIG = {
    content: {
        namesTitle: 'לדוגמה: יעל ודן',
        welcomeText: 'שמחים להזמין אתכם לחגוג איתנו',
        thankYouText: 'תודה שאישרתם הגעה! נתראה בחתונה ❤️',
        eventDate: '',
        eventTime: '19:30',
        venueName: '',
        venueAddress: '',
        mapsLink: ''
    },
    media: {
        introAnimation: 'envelope', // envelope, heart, rings, none
        musicUrl: '',
    },
    style: {
        primaryColor: '#D4AF37', // Gold
        fontFamily: 'Heebo',
    }
};

// DOM Elements
const inputs = {
    namesTitle: document.getElementById('namesTitle'),
    welcomeText: document.getElementById('welcomeText'),
    thankYouText: document.getElementById('thankYouText'),
    eventDate: document.getElementById('eventDate'),
    eventTime: document.getElementById('eventTime'),
    venueName: document.getElementById('venueName'),
    venueAddress: document.getElementById('venueAddress'),
    mapsLink: document.getElementById('mapsLink'),
    introAnimation: document.getElementById('introAnimation'),
    musicUrl: document.getElementById('musicUrl'),
    primaryColor: document.getElementById('primaryColor'),
    fontFamily: document.getElementById('fontFamily'),
};

const saveDraftBtn = document.getElementById('saveDraftBtn');
const publishBtn = document.getElementById('publishBtn');
const resetBtn = document.getElementById('resetBtn');
const refreshPreviewBtn = document.getElementById('refreshPreviewBtn');
const previewFrame = document.getElementById('previewFrame');
const saveStatus = document.getElementById('saveStatus');
const toast = document.getElementById('toast');

// Current State
let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let isDirty = false;

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    await loadDraftConfig();
    setupEventListeners();
});

// Load Draft Config from Firestore
async function loadDraftConfig() {
    // Show Loading State (Optional: could add a spinner overlay here)
    if (saveStatus) saveStatus.textContent = 'טוען...';

    try {
        let loadedConfig = null;

        try {
            const doc = await db.collection(COLLECTION).doc(DOC_DRAFT).get();
            if (doc.exists) {
                loadedConfig = doc.data();
            } else {
                // If no draft exists, try loading published
                const pubDoc = await db.collection(COLLECTION).doc(DOC_PUBLISHED).get();
                if (pubDoc.exists) {
                    loadedConfig = pubDoc.data();
                }
            }
        } catch (networkError) {
            console.warn('Network/Permission error fetching config, using defaults:', networkError);
            showToast('⚠️ לא ניתן לטעון נתונים, משתמש בברירת מחדל');
        }

        // Merge loaded config or fallback to default
        currentConfig = mergeConfig(DEFAULT_CONFIG, loadedConfig || DEFAULT_CONFIG);

        // Initialize UI
        populateForm(currentConfig);
        updatePreview();
        markSaved(); // Reset dirty state after load

    } catch (error) {
        console.error('Critical error in loadDraftConfig:', error);
        showToast('❌ שגיאה קריטית בטעינה');

        // ULTIMATE FALLBACK: Ensure UI is usable
        currentConfig = { ...DEFAULT_CONFIG };
        populateForm(currentConfig);
        updatePreview();
    }
}

// Merge saved config with default to ensure structure
function mergeConfig(defaultConf, savedConf) {
    return {
        content: { ...defaultConf.content, ...(savedConf.content || {}) },
        media: { ...defaultConf.media, ...(savedConf.media || {}) },
        style: { ...defaultConf.style, ...(savedConf.style || {}) },
    };
}

// Populate Form Inputs
function populateForm(config) {
    // Content
    inputs.namesTitle.value = config.content.namesTitle || '';
    inputs.welcomeText.value = config.content.welcomeText || '';
    inputs.thankYouText.value = config.content.thankYouText || '';
    inputs.eventDate.value = config.content.eventDate || '';
    inputs.eventTime.value = config.content.eventTime || '';
    inputs.venueName.value = config.content.venueName || '';
    inputs.venueAddress.value = config.content.venueAddress || '';
    inputs.mapsLink.value = config.content.mapsLink || '';

    // Media
    inputs.introAnimation.value = config.media.introAnimation || 'envelope';
    inputs.musicUrl.value = config.media.musicUrl || '';

    // Style
    inputs.primaryColor.value = config.style.primaryColor || '#D4AF37';
    inputs.fontFamily.value = config.style.fontFamily || 'Heebo';

    // Update music UI
    updateMusicUI();
}

// setup Event Listeners
function setupEventListeners() {
    // Input changes
    Object.keys(inputs).forEach(key => {
        inputs[key].addEventListener('input', () => {
            markDirty();
            updateConfigFromForm();
            // LIVE PREVIEW UPDATE
            updatePreviewLive();
        });

        // Use change for immediate processing on select/color
        inputs[key].addEventListener('change', () => {
            updateConfigFromForm();
            // LIVE PREVIEW UPDATE
            updatePreviewLive();
        });
    });

    // Buttons
    saveDraftBtn.addEventListener('click', saveDraft);
    publishBtn.addEventListener('click', publishConfig);
    resetBtn.addEventListener('click', resetToDefault);
    refreshPreviewBtn.addEventListener('click', updatePreview);

    // Music Upload Handlers
    const musicFile = document.getElementById('musicFile');
    const testPlayBtn = document.getElementById('testPlayBtn');
    const removeMusicBtn = document.getElementById('removeMusicBtn');

    if (musicFile) {
        musicFile.addEventListener('change', handleMusicUpload);
    }

    if (testPlayBtn) {
        testPlayBtn.addEventListener('click', testPlayMusic);
    }

    if (removeMusicBtn) {
        removeMusicBtn.addEventListener('click', removeMusic);
    }
}

// Update local config object from form
function updateConfigFromForm() {
    currentConfig.content.namesTitle = inputs.namesTitle.value;
    currentConfig.content.welcomeText = inputs.welcomeText.value;
    currentConfig.content.thankYouText = inputs.thankYouText.value;
    currentConfig.content.eventDate = inputs.eventDate.value;
    currentConfig.content.eventTime = inputs.eventTime.value;
    currentConfig.content.venueName = inputs.venueName.value;
    currentConfig.content.venueAddress = inputs.venueAddress.value;
    currentConfig.content.mapsLink = inputs.mapsLink.value;

    currentConfig.media.introAnimation = inputs.introAnimation.value;
    currentConfig.media.musicUrl = inputs.musicUrl.value;

    currentConfig.style.primaryColor = inputs.primaryColor.value;
    currentConfig.style.fontFamily = inputs.fontFamily.value;
}

function markDirty() {
    isDirty = true;
    saveStatus.textContent = '* יש שינויים';
    saveStatus.className = 'status-badge saving';
}

function markSaved() {
    isDirty = false;
    saveStatus.textContent = 'שמור';
    saveStatus.className = 'status-badge saved';
}

// ============================================
// FIRESTORE ACTIONS
// ============================================

// Save Draft
async function saveDraft() {
    saveDraftBtn.disabled = true;
    saveDraftBtn.textContent = 'שומר...';

    try {
        updateConfigFromForm();
        // Add timestamp
        const dataToSave = {
            ...currentConfig,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION).doc(DOC_DRAFT).set(dataToSave);

        markSaved();
        showToast('✅ הטיוטה נשמרה בהצלחה');
        updatePreview(); // Refresh the iframe
    } catch (error) {
        console.error('Error saving draft:', error);
        showToast('❌ שגיאה בשמירה');
    }

    saveDraftBtn.disabled = false;
    saveDraftBtn.textContent = '💾 שמור טיוטה';
}

// Publish Config to "published" doc
async function publishConfig() {
    if (!confirm('האם אתה בטוח שברצונך לפרסם את השינויים? זה יעדכן את דף ההזמנה לכל האורחים.')) return;

    publishBtn.disabled = true;
    publishBtn.textContent = 'מפרסם...';

    try {
        // Ensure draft is saved first
        await saveDraft();

        // Copy current config to published
        const dataToPublish = {
            ...currentConfig,
            publishedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION).doc(DOC_PUBLISHED).set(dataToPublish);

        showToast('🎉 ההזמנה פורסמה בהצלחה!');
    } catch (error) {
        console.error('Error publishing:', error);
        showToast('❌ שגיאה בפרסום');
    }

    publishBtn.disabled = false;
    publishBtn.textContent = '🚀 פרסם';
}

// Reset
function resetToDefault() {
    if (!confirm('האם אתה בטוח? זה יאפס את הטופס לברירת המחדל.')) return;

    currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    populateForm(currentConfig);
    markDirty();
    showToast('🔄 הטופס אופס לברירת המחדל (לא נשמר)');
}

// ============================================
// PREVIEW
// ============================================

function updatePreview() {
    // Reload iframe to fetch fresh draft data
    const src = previewFrame.src;
    previewFrame.src = src; // Simple reload
}

// LIVE PREVIEW UPDATE (via postMessage)
function updatePreviewLive() {
    try {
        // Send current config to the preview iframe
        if (previewFrame && previewFrame.contentWindow) {
            previewFrame.contentWindow.postMessage({
                type: 'UPDATE_CONFIG',
                config: currentConfig
            }, '*');
        }
    } catch (error) {
        console.error('[DESIGNER] Error sending config to preview:', error);
    }
}

// UI Helpers
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ============================================
// MUSIC UPLOAD HANDLERS
// ============================================

async function handleMusicUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log('[UPLOAD] No file selected');
        return;
    }

    console.log('[UPLOAD] 🎵 Starting music upload...');
    console.log('[UPLOAD] File details:', {
        name: file.name,
        size: file.size,
        type: file.type
    });

    const uploadStatus = document.getElementById('uploadStatus');
    const currentMusic = document.getElementById('currentMusic');
    const musicFileName = document.getElementById('musicFileName');

    // Validate file type
    if (!file.type.match('audio/mpeg') && !file.type.match('audio/mp3')) {
        console.error('[UPLOAD] ❌ Invalid file type:', file.type);
        uploadStatus.className = 'upload-status error';
        uploadStatus.textContent = '❌ רק קבצי MP3 מותרים';
        return;
    }

    // Check size (max 15MB)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
        console.error('[UPLOAD] ❌ File too large:', file.size);
        uploadStatus.className = 'upload-status error';
        uploadStatus.textContent = `❌ הקובץ גדול מדי (מקסימום 15MB)`;
        return;
    }

    console.log('[UPLOAD] ✅ File validation passed');

    try {
        // Show uploading status
        uploadStatus.className = 'upload-status uploading';
        uploadStatus.textContent = '⏳ מעלה קובץ...';

        console.log('[UPLOAD] 📡 Initializing Firebase Storage...');
        console.log('[UPLOAD] Storage bucket:', storage.app.options.storageBucket);

        // Upload to Firebase Storage
        const storageRef = storage.ref();
        const fileName = `invitation-music/${Date.now()}_${file.name}`;
        const fileRef = storageRef.child(fileName);

        console.log('[UPLOAD] 📤 Creating upload task for:', fileName);

        const uploadTask = fileRef.put(file);

        console.log('[UPLOAD] Upload task created, attaching listeners...');

        // Monitor upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`[UPLOAD] 📊 Progress: ${Math.round(progress)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
                console.log(`[UPLOAD] State: ${snapshot.state}`);
                uploadStatus.textContent = `⏳ מעלה... ${Math.round(progress)}%`;
            },
            (error) => {
                console.error('[UPLOAD] ❌ Upload error:', error);
                console.error('[UPLOAD] Error code:', error.code);
                console.error('[UPLOAD] Error message:', error.message);
                uploadStatus.className = 'upload-status error';
                uploadStatus.textContent = '❌ שגיאה בהעלאה: ' + error.message;
            },
            async () => {
                console.log('[UPLOAD] ✅ Upload completed successfully!');

                // Upload completed successfully
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('[UPLOAD] 🔗 Download URL:', downloadURL);

                    // Update config
                    currentConfig.media.musicUrl = downloadURL;
                    inputs.musicUrl.value = downloadURL;

                    // Update UI
                    uploadStatus.className = 'upload-status success';
                    uploadStatus.textContent = '✅ הקובץ הועלה בהצלחה!';

                    musicFileName.textContent = file.name;
                    currentMusic.style.display = 'flex';

                    markDirty();

                    console.log('[UPLOAD] 💾 Config updated, marked as dirty');

                    // Hide success message after 3 seconds
                    setTimeout(() => {
                        uploadStatus.className = 'upload-status';
                        uploadStatus.textContent = '';
                    }, 3000);

                    showToast('🎵 מוזיקה הועלתה - זכור לשמור טיוטה');
                } catch (urlError) {
                    console.error('[UPLOAD] ❌ Error getting download URL:', urlError);
                    uploadStatus.className = 'upload-status error';
                    uploadStatus.textContent = '❌ שגיאה בקבלת קישור';
                }
            }
        );

    } catch (error) {
        console.error('[UPLOAD] ❌ Critical upload error:', error);
        console.error('[UPLOAD] Stack:', error.stack);
        uploadStatus.className = 'upload-status error';
        uploadStatus.textContent = '❌ שגיאה: ' + error.message;
    }
}

function testPlayMusic() {
    const musicUrl = currentConfig.media.musicUrl || inputs.musicUrl.value;

    if (!musicUrl) {
        showToast('❌ אין מוזיקה להשמעה');
        return;
    }

    // Create temporary audio element for testing
    const testAudio = new Audio(musicUrl);
    const btn = document.getElementById('testPlayBtn');

    if (btn.textContent.includes('⏸')) {
        // Currently playing, stop it
        testAudio.pause();
        btn.textContent = '▶️ נגן';
    } else {
        // Play
        testAudio.play().then(() => {
            btn.textContent = '⏸️ עצור';
            showToast('🎵 משמיע מוזיקה...');

            // Auto-stop after 10 seconds (preview)
            setTimeout(() => {
                testAudio.pause();
                btn.textContent = '▶️ נגן';
            }, 10000);
        }).catch(error => {
            console.error('Play error:', error);
            showToast('❌ שגיאה בהשמעה');
        });
    }
}

function removeMusic() {
    if (!confirm('האם למחוק את המוזיקה?')) return;

    currentConfig.media.musicUrl = '';
    inputs.musicUrl.value = '';

    document.getElementById('currentMusic').style.display = 'none';
    document.getElementById('musicFileName').textContent = '';

    markDirty();
    showToast('🗑️ מוזיקה הוסרה - זכור לשמור');
}

// Update music UI on load
function updateMusicUI() {
    const musicUrl = currentConfig.media.musicUrl;
    const currentMusic = document.getElementById('currentMusic');
    const musicFileName = document.getElementById('musicFileName');

    if (musicUrl) {
        // Extract filename from URL
        const urlParts = musicUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0];
        const decodedName = decodeURIComponent(fileName);

        musicFileName.textContent = decodedName.split('_').slice(1).join('_') || 'music.mp3';
        currentMusic.style.display = 'flex';
    } else {
        currentMusic.style.display = 'none';
    }
}
