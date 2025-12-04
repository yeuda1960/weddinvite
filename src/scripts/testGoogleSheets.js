require('dotenv').config();
const { sheets } = require('../config/googleSheets');

async function testGoogleSheets() {
    console.log('📊 Testing Google Sheets Connection...\n');

    try {
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!spreadsheetId) {
            throw new Error('GOOGLE_SHEETS_ID not set in .env file');
        }

        console.log(`Spreadsheet ID: ${spreadsheetId}`);

        // Try to read data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:Z10', // Read first 10 rows
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            console.log('⚠️  No data found in spreadsheet');
            console.log('Please add guest data to your Google Sheet');
        } else {
            console.log('✅ Successfully connected to Google Sheets!');
            console.log(`✅ Found ${rows.length} rows`);
            console.log('\nFirst few rows:');
            rows.slice(0, 5).forEach((row, index) => {
                console.log(`Row ${index + 1}:`, row);
            });
        }

        console.log('\n🎉 Google Sheets is working!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Google Sheets connection failed:', error.message);
        console.error('\nPlease check:');
        console.error('1. GOOGLE_SHEETS_ID in .env file');
        console.error('2. Google Sheets API is enabled');
        console.error('3. Service account has access to the spreadsheet');
        console.error('4. Spreadsheet is shared with service account email');
        process.exit(1);
    }
}

testGoogleSheets();
