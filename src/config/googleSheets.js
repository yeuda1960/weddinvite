require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Initialize Google Sheets API
let auth;

const credentialsPath = path.join(__dirname, '../../firebase-credentials.json');

if (fs.existsSync(credentialsPath)) {
    // Use Firebase service account credentials file (works for Google Sheets too)
    auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    console.log('✅ Using firebase-credentials.json for Google Sheets');
} else {
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
    console.log('✅ Using environment variables for Google Sheets');
}

const sheets = google.sheets({ version: 'v4', auth });

module.exports = { sheets, auth };
