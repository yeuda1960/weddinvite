# Wedding Invitation System - Setup Guide

This guide will walk you through setting up the wedding invitation system step by step.

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [V ] Windows computer
- [ v] WhatsApp account on your phone
- [v ] Firebase project created (ID: `wedinvite-ee26d`) ✅
- [ v] Google account for Google Sheets
- [ v] Wedding invitation image ready

## 🚀 Step-by-Step Setup

### Step 1: Install Node.js

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS version** (recommended)
3. Run the installer
4. Follow the installation wizard (use default settings)
5. Restart your computer after installation

**Verify installation:**
Open PowerShell and run:
```powershell
node --version
npm --version
```

You should see version numbers (e.g., v18.17.0 and 9.6.7)

### Step 2: Install Git (Optional but Recommended)

1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Download and install Git for Windows
3. Use default settings during installation

**Verify installation:**
```powershell
git --version
```

### Step 3: Install Project Dependencies

1. Open PowerShell
2. Navigate to the project:
   ```powershell
   cd C:\Users\yeuda\.gemini\antigravity\scratch\wedding-invitation-system
   ```
3. Install dependencies:
   ```powershell
   npm install
   ```

This will take a few minutes. Wait for it to complete.

### Step 4: Set Up Firebase

#### 4.1 Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click on your project: **wedinvite-ee26d**
3. In the left sidebar, click **Firestore Database**
4. Click **Create database**
5. Choose **Start in production mode**
6. Select location: **europe-west** (closest to Israel)
7. Click **Enable**

#### 4.2 Get Firebase Credentials

1. In Firebase Console, click the ⚙️ **Settings** icon → **Project settings**
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Click **Generate key** (a JSON file will download)
5. **Save this file** - you'll need it in the next step

#### 4.3 Configure Firebase in Your Project

**Option A: Using the JSON file (Easier)**

1. Rename the downloaded file to `firebase-credentials.json`
2. Move it to your project root folder:
   ```
   C:\Users\yeuda\.gemini\antigravity\scratch\wedding-invitation-system\
   ```

**Option B: Using Environment Variables**

1. Open the downloaded JSON file in Notepad
2. Copy these values to your `.env` file:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and \n characters)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

#### 4.4 Get Firebase Web App Config

1. In Firebase Console → Project settings
2. Scroll down to **Your apps**
3. Click **Web** icon (</>) to add a web app
4. Register app name: "Wedding RSVP"
5. Copy the `firebaseConfig` object

**Update these files** with your Firebase config:

**File 1:** `public/js/rsvp.js` (line 2-9)
**File 2:** `public/admin/js/dashboard.js` (line 2-9)

Replace:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "wedinvite-ee26d.firebaseapp.com",
    projectId: "wedinvite-ee26d",
    storageBucket: "wedinvite-ee26d.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

With your actual values from Firebase Console.

### Step 5: Set Up Google Sheets

#### 5.1 Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your Firebase project
3. Click **APIs & Services** → **Library**
4. Search for "Google Sheets API"
5. Click on it and click **Enable**

#### 5.2 Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Name: "Wedding Sheets Access"
4. Click **Create and Continue**
5. Role: Select **Editor**
6. Click **Done**
7. Click on the created service account
8. Go to **Keys** tab
9. Click **Add Key** → **Create new key** → **JSON**
10. Save the downloaded file

**Note:** If you're using the same project as Firebase, you can use the same credentials file.

#### 5.3 Create Your Guest List Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Name it: "Wedding Guest List"
4. Create columns (in Hebrew or English):

| Name / שם | Phone / טלפון |
|-----------|---------------|
| ישראל ישראלי | 0501234567 |
| שרה כהן | +972-52-9876543 |

**Important:**
- First row must be headers
- Name column can be called: "Name", "שם", or contain "name"
- Phone column can be called: "Phone", "טלפון", or contain "phone"
- Phone format can be: `0501234567`, `+972501234567`, or `972501234567`

#### 5.4 Share Spreadsheet with Service Account

1. Open your Google Sheet
2. Click **Share** button
3. In the service account JSON file, find `client_email`
4. Copy that email (looks like: `xxxxx@xxxxx.iam.gserviceaccount.com`)
5. Paste it in the Share dialog
6. Give **Editor** access
7. Click **Send** (uncheck "Notify people")

#### 5.5 Get Spreadsheet ID

1. Look at your spreadsheet URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
2. Copy the `SPREADSHEET_ID_HERE` part
3. Save it for the next step

### Step 6: Configure Environment Variables

1. Open the `.env` file in the project root
2. Fill in the values:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=wedinvite-ee26d
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@wedinvite-ee26d.iam.gserviceaccount.com

# Google Sheets Configuration
GOOGLE_SHEETS_ID=YOUR_SPREADSHEET_ID_HERE
GOOGLE_SERVICE_ACCOUNT_EMAIL=same_as_firebase_client_email_above

# RSVP Website URL (will update after deployment)
RSVP_URL=https://wedinvite-ee26d.web.app/rsvp.html

# Admin Dashboard Password (change this!)
ADMIN_PASSWORD=your_secure_password_here

# WhatsApp Configuration
INVITATION_IMAGE_PATH=./assets/invitation.jpg
```

**Important Notes:**
- For `FIREBASE_PRIVATE_KEY`: Keep the quotes and `\n` characters exactly as they are
- Get values from the JSON files you downloaded
- Change `ADMIN_PASSWORD` to something secure

### Step 7: Add Your Invitation Image

1. Prepare your wedding invitation image:
   - Format: JPG or PNG
   - Recommended size: 1080x1920 pixels (portrait)
   - Keep file size under 5MB

2. Save it as `invitation.jpg` in the `assets` folder:
   ```
   C:\Users\yeuda\.gemini\antigravity\scratch\wedding-invitation-system\assets\invitation.jpg
   ```

### Step 8: Test Your Setup

Run these tests to make sure everything is configured correctly:

#### Test 1: Firebase Connection
```powershell
npm run test-firebase
```

Expected output: ✅ Firebase is working perfectly!

#### Test 2: Google Sheets Connection
```powershell
npm run test-sheets
```

Expected output: ✅ Google Sheets is working!

#### Test 3: WhatsApp Connection
```powershell
npm run test-whatsapp
```

This will show a QR code. Scan it with your WhatsApp app:
1. Open WhatsApp on your phone
2. Go to Settings → Linked Devices
3. Tap "Link a Device"
4. Scan the QR code shown in the terminal

Expected output: ✅ WhatsApp is ready!

### Step 9: Deploy Firestore Security Rules

1. Install Firebase CLI:
   ```powershell
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```powershell
   firebase login
   ```

3. Initialize Firebase (if not done):
   ```powershell
   firebase init
   ```
   - Select: **Firestore**, **Hosting**
   - Use existing project: **wedinvite-ee26d**
   - Firestore rules file: **firestore.rules** (default)
   - Firestore indexes file: **firestore.indexes.json** (default)
   - Public directory: **public**
   - Configure as single-page app: **No**
   - Set up automatic builds: **No**

4. Deploy Firestore rules:
   ```powershell
   firebase deploy --only firestore:rules
   ```

### Step 10: Deploy Website

Deploy your RSVP website to Firebase Hosting:

```powershell
firebase deploy --only hosting
```

After deployment, your website will be live at:
- **RSVP Form:** `https://wedinvite-ee26d.web.app/rsvp.html`
- **Admin Dashboard:** `https://wedinvite-ee26d.web.app/admin/dashboard.html`

## ✅ Setup Complete!

You're now ready to send invitations! 

### Next Steps:

1. **Test with yourself first:**
   - Add your own phone number to the Google Sheet
   - Run: `npm run send-invitations`
   - Check if you receive the WhatsApp message
   - Click the link and test the RSVP form

2. **Check the dashboard:**
   - Open the admin dashboard
   - Verify your test submission appears

3. **Send to all guests:**
   - Add all 400+ guests to your Google Sheet
   - Run: `npm run send-invitations`
   - Monitor the progress in the terminal

## 🆘 Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in PATH
- Reinstall Node.js and restart your computer

### "Firebase permission denied"
- Check that you've deployed the Firestore rules
- Verify the credentials in your `.env` file

### "Cannot read Google Sheets"
- Make sure the spreadsheet is shared with the service account email
- Check that `GOOGLE_SHEETS_ID` is correct in `.env`

### "WhatsApp QR code not showing"
- Try a different terminal (Windows Terminal, Command Prompt)
- Make sure your terminal supports Unicode characters

### Need Help?
Check the main README.md file for more detailed troubleshooting.

---

**Good luck with your wedding! 💒❤️**
