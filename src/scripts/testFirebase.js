require('dotenv').config();
const { db } = require('../config/firebase');

async function testFirebase() {
    console.log('🔥 Testing Firebase Connection...\n');

    try {
        // Try to write a test document
        const testRef = db.collection('test').doc('connection');
        await testRef.set({
            message: 'Firebase connection successful!',
            timestamp: new Date()
        });

        console.log('✅ Successfully connected to Firebase!');
        console.log('✅ Write operation successful!');

        // Try to read it back
        const doc = await testRef.get();
        if (doc.exists) {
            console.log('✅ Read operation successful!');
            console.log('Data:', doc.data());
        }

        // Clean up
        await testRef.delete();
        console.log('✅ Delete operation successful!');

        console.log('\n🎉 Firebase is working perfectly!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Firebase connection failed:', error.message);
        console.error('\nPlease check:');
        console.error('1. Firebase credentials in .env file');
        console.error('2. Firebase project ID is correct');
        console.error('3. Firestore is enabled in Firebase console');
        process.exit(1);
    }
}

testFirebase();
