require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// Try to use firebase-credentials.json file first, then fall back to environment variables
const credentialsPath = path.join(__dirname, '../../firebase-credentials.json');
let credential;

if (fs.existsSync(credentialsPath)) {
  // Use the JSON file if it exists
  const serviceAccount = require(credentialsPath);
  credential = admin.credential.cert(serviceAccount);
  console.log('✅ Using firebase-credentials.json file');
} else {
  // Fall back to environment variables
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };
  credential = admin.credential.cert(serviceAccount);
  console.log('✅ Using environment variables for Firebase credentials');
}

admin.initializeApp({
  credential: credential
});

const db = admin.firestore();

module.exports = { admin, db };
