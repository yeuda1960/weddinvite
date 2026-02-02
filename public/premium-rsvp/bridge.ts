import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ✅ המפתחות האמיתיים שלך (העתקתי ממה ששלחת)
const firebaseConfig = {
    apiKey: "AIzaSyBeS6LBEAqw9m7zkedM7JDJ1LotFI40sOc",
    authDomain: "wedinvite-ee26d.firebaseapp.com",
    projectId: "wedinvite-ee26d",
    storageBucket: "wedinvite-ee26d.firebasestorage.app",
    messagingSenderId: "960125095932",
    appId: "1:960125095932:web:577ae857092e2f1e972c79"
};

// Initialize Firebase only once
let db: any;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('🔥 Firebase Bridge Connected Successfully');
} catch (e) {
    console.error('Firebase init failed:', e);
}

export const initBridge = () => {
    console.log('🌉 Bridge Listener Active');

    window.addEventListener('rsvp-submit', async (e: any) => {
        const rawData = e.detail;
        console.log('bridge: Processing submission...', rawData);

        if (!db) {
            console.error('Database not connected');
            window.dispatchEvent(new CustomEvent('rsvp-error', { detail: 'Database Config Missing' }));
            return;
        }

        try {
            // 1. נרמול מספר הטלפון (מזהה ייחודי למסמך)
            let cleanPhone = rawData.phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            if (!cleanPhone.startsWith('972')) cleanPhone = '972' + cleanPhone;

            // 2. הכנת הנתונים לשמירה (בדיוק לפי המבנה של הדשבורד)
            const isAttending = rawData.attendanceStatus === 'yes';

            const payload = {
                rsvpName: rawData.name,
                attending: isAttending,
                // קריטי: אם לא מגיע, כמות האורחים היא 0. אחרת - מה שהזין (או 1 כברירת מחדל)
                numberOfGuests: isAttending ? parseInt(rawData.guestsCount || 1) : 0,
                dietary: rawData.dietary || '',
                notes: rawData.notes || '',
                hasChildren: rawData.hasChildren || false,
                childrenCount: parseInt(rawData.childrenCount || 0),
                phone: cleanPhone,

                // שדות ניהול
                rsvpSubmitted: true,
                rsvpSubmittedAt: serverTimestamp(),
                messageStatus: 'responded', // צובע את השורה בירוק בדשבורד
                source: 'premium_web'
            };

            // 3. כתיבה ישירה ל-Firestore
            const guestRef = doc(db, 'guests', cleanPhone);

            // שימוש ב-merge: true כדי לא לדרוס שדות קיימים (כמו מתי ההזמנה נשלחה)
            await setDoc(guestRef, payload, { merge: true });

            console.log('✅ Saved to Firestore successfully');
            window.dispatchEvent(new CustomEvent('rsvp-success'));

        } catch (error: any) {
            console.error('❌ Firestore Write Error:', error);
            window.dispatchEvent(new CustomEvent('rsvp-error', { detail: error.message }));
        }
    });
};