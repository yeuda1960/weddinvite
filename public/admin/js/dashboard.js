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
const guestsTableBody = document.getElementById('guestsTableBody');
const toast = document.getElementById('toast');

// Statistics elements
const statSent = document.getElementById('statSent');
const statFailed = document.getElementById('statFailed');
const statNoResponse = document.getElementById('statNoResponse');
const statRsvp = document.getElementById('statRsvp');
const statAttending = document.getElementById('statAttending');
const statNotAttending = document.getElementById('statNotAttending');
const statTotalGuests = document.getElementById('statTotalGuests');
const statVegetarian = document.getElementById('statVegetarian');
const statChildren = document.getElementById('statChildren');

// Load data on page load with REAL-TIME updates
window.addEventListener('DOMContentLoaded', () => {
    setupRealtimeListener();
});

// Setup real-time listener for Firestore
function setupRealtimeListener() {
    guestsTableBody.innerHTML = '<tr><td colspan="9" class="loading">טוען נתונים...</td></tr>';

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
        vegetarian: allGuests.reduce((sum, g) => sum + (g.vegetarianCount || 0), 0),
        children: allGuests.filter(g => g.hasChildren === true).length,
    };

    statSent.textContent = stats.sent;
    statFailed.textContent = stats.failed;
    statNoResponse.textContent = stats.noResponse;
    statRsvp.textContent = stats.rsvp;
    statAttending.textContent = stats.attending;
    statNotAttending.textContent = stats.notAttending;
    statTotalGuests.textContent = stats.totalGuests;
    statVegetarian.textContent = stats.vegetarian;
    statChildren.textContent = stats.children;
}

// Render table
function renderTable() {
    if (filteredGuests.length === 0) {
        guestsTableBody.innerHTML = '<tr><td colspan="9" class="loading">לא נמצאו אורחים</td></tr>';
        return;
    }

    const rows = filteredGuests.map(guest => {
        const messageStatus = getMessageStatusBadge(guest.messageStatus);
        const rsvpStatus = getRsvpStatusBadge(guest.rsvpSubmitted);
        const attendingStatus = getAttendingStatus(guest.attending, guest.rsvpSubmitted);
        const numberOfGuests = guest.numberOfGuests || '-';
        const vegetarianCount = guest.vegetarianCount || 0;
        const children = guest.hasChildren ? '<span class="icon-check">✓</span>' : '<span class="icon-x">✗</span>';
        const notes = guest.notes || '-';

        return `
            <tr>
                <td><strong>${guest.name}</strong></td>
                <td dir="ltr">${formatPhone(guest.phone)}</td>
                <td>${messageStatus}</td>
                <td>${rsvpStatus}</td>
                <td>${attendingStatus}</td>
                <td>${numberOfGuests}</td>
                <td>${vegetarianCount}</td>
                <td>${children}</td>
                <td>${notes}</td>
            </tr>
        `;
    }).join('');

    guestsTableBody.innerHTML = rows;
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
            case 'vegetarian':
                matchesFilter = (guest.vegetarianCount || 0) > 0;
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

// Export to CSV
exportBtn.addEventListener('click', () => {
    const csvContent = generateCSV(filteredGuests);
    downloadCSV(csvContent, 'wedding-guests.csv');
});

// Generate CSV content
function generateCSV(guests) {
    const headers = ['שם', 'טלפון', 'סטטוס שליחה', 'אישור הגעה', 'מגיע', 'מספר אורחים', 'צמחוני', 'ילדים', 'הערות'];
    const rows = guests.map(g => [
        g.name,
        g.phone,
        g.messageStatus || 'pending',
        g.rsvpSubmitted ? 'yes' : 'no',
        g.attending === true ? 'yes' : g.attending === false ? 'no' : '-',
        g.numberOfGuests || 0,
        g.vegetarianCount || 0,
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
