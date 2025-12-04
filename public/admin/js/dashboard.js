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

// Global variables
let allGuests = [];
let filteredGuests = [];
let unsubscribe = null; // For real-time listener

// DOM Elements
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const exportBtn = document.getElementById('exportBtn');
const copyPhonesBtn = document.getElementById('copyPhonesBtn');
const syncSheetsBtn = document.getElementById('syncSheetsBtn');
const guestsTableBody = document.getElementById('guestsTableBody');
const toast = document.getElementById('toast');

// WhatsApp control elements
const connectWhatsappBtn = document.getElementById('connectWhatsappBtn');
const sendAllBtn = document.getElementById('sendAllBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const whatsappStatusIndicator = document.getElementById('whatsappStatusIndicator');
const whatsappStatusText = document.getElementById('whatsappStatusText');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const sentCount = document.getElementById('sentCount');
const failedCount = document.getElementById('failedCount');
const pendingCount = document.getElementById('pendingCount');

// Statistics elements
const statSent = document.getElementById('statSent');
const statFailed = document.getElementById('statFailed');
const statNoResponse = document.getElementById('statNoResponse');
const statRsvp = document.getElementById('statRsvp');
const statAttending = document.getElementById('statAttending');
const statNotAttending = document.getElementById('statNotAttending');
const statTotalGuests = document.getElementById('statTotalGuests');
const statChildren = document.getElementById('statChildren');

// Load data on page load with REAL-TIME updates
window.addEventListener('DOMContentLoaded', () => {
    setupRealtimeListener();
    checkWhatsAppStatus();
    setInterval(checkWhatsAppStatus, 5000); // Check every 5 seconds
});

// Setup real-time listener for Firestore
function setupRealtimeListener() {
    guestsTableBody.innerHTML = '<tr><td colspan="8" class="loading">טוען נתונים...</td></tr>';

    // Use onSnapshot for real-time updates
    unsubscribe = db.collection('guests').onSnapshot((snapshot) => {
        const previousCount = allGuests.length;

        allGuests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Show notification if new RSVP arrived (not on initial load)
        if (previousCount > 0 && allGuests.length > previousCount) {
            showToast('🎉 התקבל אישור הגעה חדש!');
        }

        // Check for RSVP updates
        snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
                const guest = change.doc.data();
                if (guest.rsvpSubmitted) {
                    showToast(`✅ ${guest.name} עדכן/ה אישור הגעה!`);
                }
            }
        });

        filteredGuests = [...allGuests];
        updateStatistics();

        // Re-apply current filters
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterType = filterSelect.value;
        applyFilters(searchTerm, filterType);

        console.log(`Loaded ${allGuests.length} guests (real-time)`);
    }, (error) => {
        console.error('Error with real-time listener:', error);
        guestsTableBody.innerHTML = '<tr><td colspan="9" class="loading">שגיאה בטעינת הנתונים</td></tr>';
    });
}

// Show toast notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Update statistics
function updateStatistics() {
    const stats = {
        sent: allGuests.filter(g => g.messageStatus === 'sent').length,
        failed: allGuests.filter(g => g.messageStatus === 'failed').length,
        noResponse: allGuests.filter(g => g.messageStatus === 'sent' && !g.rsvpSubmitted).length,
        rsvp: allGuests.filter(g => g.rsvpSubmitted).length,
        attending: allGuests.filter(g => g.attending === true).length,
        notAttending: allGuests.filter(g => g.attending === false).length,
        totalGuests: allGuests.reduce((sum, g) => sum + (g.numberOfGuests || 0), 0),
        children: allGuests.filter(g => g.hasChildren === true).length,
    };

    statSent.textContent = stats.sent;
    statFailed.textContent = stats.failed;
    statNoResponse.textContent = stats.noResponse;
    statRsvp.textContent = stats.rsvp;
    statAttending.textContent = stats.attending;
    statNotAttending.textContent = stats.notAttending;
    statTotalGuests.textContent = stats.totalGuests;
    statChildren.textContent = stats.children;
}

// Render table
function renderTable() {
    if (filteredGuests.length === 0) {
        guestsTableBody.innerHTML = '<tr><td colspan="11" class="loading">לא נמצאו אורחים</td></tr>';
        return;
    }

    const rows = filteredGuests.map(guest => {
        const messageStatus = getMessageStatusBadge(guest.messageStatus);
        const rsvpStatus = getRsvpStatusBadge(guest.rsvpSubmitted);
        const attendingStatus = getAttendingStatus(guest.attending, guest.rsvpSubmitted);
        const numberOfGuests = guest.numberOfGuests || '-';
        const children = guest.hasChildren ? '<span class="icon-check">✓</span>' : '<span class="icon-x">✗</span>';
        const notes = guest.notes || '-';

        // Separate columns for original name and RSVP name
        const originalName = guest.originalName || guest.name || '-';
        const rsvpName = guest.rsvpName || '-';

        return `
            <tr data-phone="${guest.phone}">
                <td><input type="checkbox" class="guest-checkbox" data-phone="${guest.phone}"></td>
                <td><strong>${originalName}</strong></td>
                <td>${rsvpName}</td>
                <td dir="ltr">${formatPhone(guest.phone)}</td>
                <td>${messageStatus}</td>
                <td>${rsvpStatus}</td>
                <td>${attendingStatus}</td>
                <td>${numberOfGuests}</td>
                <td>${children}</td>
                <td>${notes}</td>
                <td class="row-actions">
                    <button class="send-btn" onclick="sendToGuest('${guest.phone}')" title="שלח הזמנה">📤</button>
                    <button class="reset-btn" onclick="resetGuest('${guest.phone}')" title="אפס">🔄</button>
                    <button class="delete-btn" onclick="deleteGuest('${guest.phone}')" title="מחק">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    guestsTableBody.innerHTML = rows;
    updateSelectionUI();
}

// Get message status badge
function getMessageStatusBadge(status) {
    switch (status) {
        case 'sent':
            return '<span class="status-badge status-sent">נשלח</span>';
        case 'failed':
            return '<span class="status-badge status-failed">נכשל</span>';
        default:
            return '<span class="status-badge status-pending">ממתין</span>';
    }
}

// Get RSVP status badge
function getRsvpStatusBadge(submitted) {
    if (submitted) {
        return '<span class="status-badge status-yes">אישר</span>';
    }
    return '<span class="status-badge status-waiting">ממתין</span>';
}

// Get attending status
function getAttendingStatus(attending, rsvpSubmitted) {
    if (!rsvpSubmitted) {
        return '<span class="icon-dash">-</span>';
    }
    if (attending) {
        return '<span class="status-badge status-yes">כן</span>';
    }
    return '<span class="status-badge status-no">לא</span>';
}

// Format phone number
function formatPhone(phone) {
    if (!phone) return '-';
    // Format: +972-XX-XXX-XXXX
    if (phone.startsWith('972')) {
        const cleaned = phone.substring(3);
        return `+972-${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
    }
    return phone;
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    applyFilters(searchTerm, filterSelect.value);
});

// Filter functionality
filterSelect.addEventListener('change', (e) => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    applyFilters(searchTerm, e.target.value);
});

// Apply filters
function applyFilters(searchTerm, filterType) {
    filteredGuests = allGuests.filter(guest => {
        // Search filter
        const matchesSearch = !searchTerm ||
            guest.name.toLowerCase().includes(searchTerm) ||
            (guest.phone && guest.phone.includes(searchTerm));

        // Type filter
        let matchesFilter = true;
        switch (filterType) {
            case 'sent':
                matchesFilter = guest.messageStatus === 'sent';
                break;
            case 'failed':
                matchesFilter = guest.messageStatus === 'failed';
                break;
            case 'noResponse':
                // Sent invitation but didn't submit RSVP
                matchesFilter = guest.messageStatus === 'sent' && !guest.rsvpSubmitted;
                break;
            case 'rsvp':
                matchesFilter = guest.rsvpSubmitted === true;
                break;
            case 'attending':
                matchesFilter = guest.attending === true;
                break;
            case 'notAttending':
                matchesFilter = guest.attending === false;
                break;
            case 'children':
                matchesFilter = guest.hasChildren === true;
                break;
            default:
                matchesFilter = true;
        }

        return matchesSearch && matchesFilter;
    });

    renderTable();
}

// Click on stat cards to filter
document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
    card.addEventListener('click', () => {
        const filter = card.getAttribute('data-filter');
        filterSelect.value = filter;
        searchInput.value = '';
        applyFilters('', filter);
    });
});

// Copy phone numbers to clipboard
copyPhonesBtn.addEventListener('click', () => {
    if (filteredGuests.length === 0) {
        showToast('אין טלפונים להעתקה');
        return;
    }

    const phones = filteredGuests
        .map(g => g.phone)
        .filter(p => p) // Remove empty phones
        .join('\n');

    navigator.clipboard.writeText(phones).then(() => {
        showToast(`📋 הועתקו ${filteredGuests.length} מספרי טלפון!`);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('שגיאה בהעתקה');
    });
});

// Sync from Google Sheets
syncSheetsBtn.addEventListener('click', async () => {
    syncSheetsBtn.disabled = true;
    syncSheetsBtn.textContent = '⏳ מסנכרן...';

    try {
        const response = await fetch('/api/sync-sheets', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showToast(`✅ סנכרון הושלם! ${data.added} חדשים, ${data.updated} עודכנו, ${data.deleted || 0} נמחקו`);
        } else {
            showToast(`❌ שגיאה: ${data.error}`);
        }
    } catch (error) {
        console.error('Sync error:', error);
        showToast('❌ שגיאה בסנכרון');
    }

    syncSheetsBtn.disabled = false;
    syncSheetsBtn.textContent = '🔄 סנכרון מGoogle Sheets';
});

// Export to CSV
exportBtn.addEventListener('click', () => {
    const csvContent = generateCSV(filteredGuests);
    downloadCSV(csvContent, 'wedding-guests.csv');
});

// Generate CSV content
function generateCSV(guests) {
    const headers = ['שם', 'טלפון', 'סטטוס שליחה', 'אישור הגעה', 'מגיע', 'מספר אורחים', 'ילדים', 'הערות'];
    const rows = guests.map(g => [
        g.name,
        g.phone,
        g.messageStatus || 'pending',
        g.rsvpSubmitted ? 'yes' : 'no',
        g.attending === true ? 'yes' : g.attending === false ? 'no' : '-',
        g.numberOfGuests || 0,
        g.hasChildren ? 'yes' : 'no',
        g.notes || ''
    ]);

    const csvRows = [headers, ...rows].map(row =>
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Add BOM for Hebrew support in Excel
    return '\uFEFF' + csvRows;
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

// ============================================
// WHATSAPP CONTROL FUNCTIONS
// ============================================

// Check WhatsApp status
async function checkWhatsAppStatus() {
    try {
        const response = await fetch('/api/whatsapp/status');
        const data = await response.json();
        updateWhatsAppUI(data);
    } catch (error) {
        console.error('Status check error:', error);
    }
}

// Update UI based on WhatsApp status
function updateWhatsAppUI(status) {
    // Update status indicator
    whatsappStatusIndicator.className = 'status-indicator ' +
        (status.isConnected ? 'connected' : 'disconnected');
    whatsappStatusText.textContent = status.isConnected ? 'מחובר ✓' : 'לא מחובר';

    // Update buttons
    connectWhatsappBtn.disabled = status.isConnected;
    sendAllBtn.disabled = !status.isConnected || status.isRunning;
    pauseBtn.disabled = !status.isRunning || status.isPaused;
    resumeBtn.disabled = !status.isPaused;
    stopBtn.disabled = !status.isRunning;

    // Update progress if running
    if (status.isRunning && status.progress) {
        progressContainer.style.display = 'block';
        const total = status.progress.total;
        const done = status.progress.sent + status.progress.failed;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        progressFill.style.width = percent + '%';
        progressText.textContent = `${done}/${total}`;
        progressPercent.textContent = percent + '%';
        sentCount.textContent = status.progress.sent;
        failedCount.textContent = status.progress.failed;
        pendingCount.textContent = status.progress.pending;
    } else if (!status.isRunning) {
        progressContainer.style.display = 'none';
    }
}

// Connect to WhatsApp
connectWhatsappBtn.addEventListener('click', async () => {
    connectWhatsappBtn.disabled = true;
    connectWhatsappBtn.textContent = '⏳ מתחבר...';
    whatsappStatusIndicator.className = 'status-indicator connecting';
    whatsappStatusText.textContent = 'מתחבר...';
    showToast('📱 מתחבר ל-WhatsApp... סרוק את ה-QR בטרמינל');

    try {
        const response = await fetch('/api/whatsapp/connect', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showToast('✅ WhatsApp מחובר!');
        } else {
            showToast('❌ שגיאה: ' + data.error);
        }
    } catch (error) {
        showToast('❌ שגיאה בהתחברות');
    }

    connectWhatsappBtn.textContent = '📱 התחבר ל-WhatsApp';
    checkWhatsAppStatus();
});

// Send to all guests
sendAllBtn.addEventListener('click', async () => {
    if (!confirm('האם לשלוח הזמנות לכל האורחים שטרם קיבלו?')) return;

    sendAllBtn.disabled = true;
    showToast('📤 מתחיל שליחה...');
    progressContainer.style.display = 'block';

    try {
        const response = await fetch('/api/whatsapp/send-all', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showToast('📤 השליחה החלה!');
        } else {
            showToast('❌ שגיאה: ' + data.error);
        }
    } catch (error) {
        showToast('❌ שגיאה בשליחה');
    }
});

// Pause sending
pauseBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/whatsapp/pause', { method: 'POST' });
        showToast('⏸️ השליחה נעצרה');
    } catch (error) {
        showToast('❌ שגיאה');
    }
    checkWhatsAppStatus();
});

// Resume sending
resumeBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/whatsapp/resume', { method: 'POST' });
        showToast('▶️ השליחה ממשיכה');
    } catch (error) {
        showToast('❌ שגיאה');
    }
    checkWhatsAppStatus();
});

// Stop sending
stopBtn.addEventListener('click', async () => {
    if (!confirm('האם לבטל את השליחה?')) return;

    try {
        await fetch('/api/whatsapp/stop', { method: 'POST' });
        showToast('⏹️ השליחה בוטלה');
    } catch (error) {
        showToast('❌ שגיאה');
    }
    checkWhatsAppStatus();
});

// ============================================
// SELECTION & ACTIONS
// ============================================

let selectedPhones = new Set();

// Selection elements
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectionActions = document.getElementById('selectionActions');
const selectedCountEl = document.getElementById('selectedCount');
const sendSelectedBtn = document.getElementById('sendSelectedBtn');
const resetSelectedBtn = document.getElementById('resetSelectedBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

// Update selection UI
function updateSelectionUI() {
    const checkboxes = document.querySelectorAll('.guest-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectedPhones.has(cb.dataset.phone);
        cb.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedPhones.add(e.target.dataset.phone);
            } else {
                selectedPhones.delete(e.target.dataset.phone);
            }
            updateSelectionCount();
        });
    });
    updateSelectionCount();
}

// Update selection count
function updateSelectionCount() {
    const count = selectedPhones.size;
    if (count > 0) {
        selectionActions.style.display = 'flex';
        selectedCountEl.textContent = `${count} נבחרו`;
    } else {
        selectionActions.style.display = 'none';
    }

    // Update select all checkbox
    const checkboxes = document.querySelectorAll('.guest-checkbox');
    selectAllCheckbox.checked = checkboxes.length > 0 && selectedPhones.size === checkboxes.length;
    selectAllCheckbox.indeterminate = selectedPhones.size > 0 && selectedPhones.size < checkboxes.length;
}

// Select all
selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.guest-checkbox');
    if (e.target.checked) {
        checkboxes.forEach(cb => {
            cb.checked = true;
            selectedPhones.add(cb.dataset.phone);
        });
    } else {
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
        selectedPhones.clear();
    }
    updateSelectionCount();
});

// Clear selection
clearSelectionBtn.addEventListener('click', () => {
    selectedPhones.clear();
    updateSelectionUI();
});

// Send to single guest
async function sendToGuest(phone) {
    if (!confirm('לשלוח הזמנה לאורח זה?')) return;

    try {
        const response = await fetch('/api/whatsapp/send-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await response.json();

        if (data.success) {
            showToast('✅ ההזמנה נשלחה!');
        } else {
            showToast(`❌ שגיאה: ${data.error}`);
        }
    } catch (error) {
        showToast('❌ שגיאה בשליחה');
    }
}

// Reset single guest
async function resetGuest(phone) {
    if (!confirm('לאפס את האורח? (תשובת RSVP תימחק)')) return;

    try {
        const response = await fetch('/api/guests/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phones: [phone] })
        });
        const data = await response.json();

        if (data.success) {
            showToast('🔄 האורח אופס');
        } else {
            showToast(`❌ שגיאה: ${data.error}`);
        }
    } catch (error) {
        showToast('❌ שגיאה באיפוס');
    }
}

// Send to selected guests
sendSelectedBtn.addEventListener('click', async () => {
    if (selectedPhones.size === 0) return;

    if (!confirm(`לשלוח הזמנות ל-${selectedPhones.size} אורחים?`)) return;

    let sent = 0, failed = 0;

    for (const phone of selectedPhones) {
        try {
            const response = await fetch('/api/whatsapp/send-single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await response.json();

            if (data.success) {
                sent++;
            } else {
                failed++;
            }
        } catch (error) {
            failed++;
        }

        // Small delay between sends
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    showToast(`✅ נשלחו: ${sent}, ❌ נכשלו: ${failed}`);
    selectedPhones.clear();
    updateSelectionUI();
});

// Reset selected guests
resetSelectedBtn.addEventListener('click', async () => {
    if (selectedPhones.size === 0) return;

    if (!confirm(`לאפס ${selectedPhones.size} אורחים?`)) return;

    try {
        const response = await fetch('/api/guests/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phones: Array.from(selectedPhones) })
        });
        const data = await response.json();

        if (data.success) {
            showToast(`🔄 ${data.reset} אורחים אופסו`);
            selectedPhones.clear();
            updateSelectionUI();
        } else {
            showToast(`❌ שגיאה: ${data.error}`);
        }
    } catch (error) {
        showToast('❌ שגיאה באיפוס');
    }
});

// Delete single guest
async function deleteGuest(phone) {
    if (!confirm('למחוק את האורח לצמיתות?')) return;

    try {
        const response = await fetch('/api/guests/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phones: [phone] })
        });
        const data = await response.json();

        if (data.success) {
            showToast('🗑️ האורח נמחק');
        } else {
            showToast(`❌ שגיאה: ${data.error}`);
        }
    } catch (error) {
        showToast('❌ שגיאה במחיקה');
    }
}

// Delete selected guests
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', async () => {
        if (selectedPhones.size === 0) return;

        if (!confirm(`למחוק ${selectedPhones.size} אורחים לצמיתות?`)) return;

        try {
            const response = await fetch('/api/guests/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones: Array.from(selectedPhones) })
            });
            const data = await response.json();

            if (data.success) {
                showToast(`🗑️ ${data.deleted} אורחים נמחקו`);
                selectedPhones.clear();
                updateSelectionUI();
            } else {
                showToast(`❌ שגיאה: ${data.error}`);
            }
        } catch (error) {
            showToast('❌ שגיאה במחיקה');
        }
    });
}
