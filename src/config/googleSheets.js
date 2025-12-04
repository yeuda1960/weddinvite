require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Initialize Google Sheets API
let auth;
let sheetsConfigured = false;

// Try different credential sources
const firebaseCredentialsPath = path.join(__dirname, '../../firebase-credentials.json');
const googleCredentialsPath = path.join(__dirname, '../../google-credentials.json');

if (fs.existsSync(googleCredentialsPath)) {
    // Use dedicated Google credentials file
    auth = new google.auth.GoogleAuth({
        keyFile: googleCredentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    sheetsConfigured = true;
    console.log('✅ Using google-credentials.json for Google Sheets');
} else if (fs.existsSync(firebaseCredentialsPath)) {
    // Use Firebase credentials (if shared with Google Cloud)
    auth = new google.auth.GoogleAuth({
        keyFile: firebaseCredentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    sheetsConfigured = true;
    console.log('✅ Using firebase-credentials.json for Google Sheets');
} else if (process.env.FIREBASE_PRIVATE_KEY) {
    // Use environment variables
    const credentials = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
    };

    auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    sheetsConfigured = true;
    console.log('✅ Using environment variables for Google Sheets');
} else {
    console.log('⚠️ No Google Sheets credentials found');
}

const sheets = sheetsConfigured ? google.sheets({ version: 'v4', auth }) : null;

module.exports = { sheets, auth, sheetsConfigured };
