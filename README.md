# Wedding Invitation System 💒

A complete wedding invitation management system with WhatsApp automation, RSVP tracking, and guest management dashboard. All user-facing content is in Hebrew with RTL support.

---

## 🚀 Quick Start (After Downloading from GitHub)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/wedding-invitation-system.git
cd wedding-invitation-system

# 2. Install dependencies
npm install

# 3. Copy environment file and configure it
cp .env.example .env
# Edit .env with your Firebase and Google Sheets credentials

# 4. Add your Firebase credentials file
# Download from Firebase Console > Project Settings > Service Accounts
# Save as firebase-credentials.json in project root

# 5. Test your setup
npm run test-firebase    # Test Firebase connection
npm run test-sheets      # Test Google Sheets connection

# 6. Start the server (for local testing)
npm start

# 7. Deploy to Firebase Hosting
npm run deploy
```

**Important URLs after deployment:**
- 📋 RSVP Page: `https://YOUR-PROJECT.web.app/rsvp.html?phone=PHONE_NUMBER`
- 📊 Admin Dashboard: `https://YOUR-PROJECT.web.app/admin/dashboard.html`

---

## Features

✅ **WhatsApp Automation** - Send personalized invitations to 400+ guests  
✅ **Google Sheets Integration** - Manage guest list in Google Sheets  
✅ **Premium RSVP Website** - Elegant Hebrew RTL design with video intro, animations & music  
✅ **Admin Dashboard** - Track responses and statistics  
✅ **Real-time Updates** - Firebase Firestore database  
✅ **Smart Filtering** - Filter guests by status, attendance, dietary needs  
✅ **Export to Excel** - Download guest data as CSV  
🎬 **Rich Media** - Video intro overlay, Lottie animations, background music  

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: Firebase Firestore
- **WhatsApp**: whatsapp-web.js (free!)
- **Data Source**: Google Sheets API
- **Frontend**: HTML, CSS, JavaScript (Hebrew RTL)
- **Hosting**: Firebase Hosting

## Prerequisites

Before you begin, you need:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **Firebase Project** - Already created: `wedinvite-ee26d`
3. **Google Cloud Project** - For Google Sheets API
4. **WhatsApp Account** - For sending messages

## Setup Instructions

### 1. Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version
```

### 2. Install Dependencies

```bash
cd wedding-invitation-system
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `wedinvite-ee26d`
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `firebase-credentials.json` in the project root

**OR** use environment variables:
- Copy the credentials from the JSON file to your `.env` file

### 4. Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **Production mode**
4. Select a location (choose closest to Israel)
5. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 5. Google Sheets Setup

#### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google Sheets API"
   - Click **Enable**

#### Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in details and click **Create**
4. Grant role: **Editor**
5. Click **Done**
6. Click on the created service account
7. Go to **Keys** tab
8. Click **Add Key** → **Create New Key** → **JSON**
9. Save as `google-credentials.json` (can use same as Firebase)

#### Prepare Your Google Sheet

1. Create a Google Sheet with your guest list
2. **Required columns** (in any order):
   - `Name` or `שם` - Guest name
   - `Phone` or `טלפון` - Phone number
3. **Share the spreadsheet** with the service account email:
   - Find the email in the JSON file: `client_email`
   - Share with **Editor** access
4. Copy the **Spreadsheet ID** from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` part

### 6. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=wedinvite-ee26d
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@wedinvite-ee26d.iam.gserviceaccount.com

# Google Sheets Configuration
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=same_as_firebase_client_email

# RSVP Website URL (will be set after deployment)
RSVP_URL=https://wedinvite-ee26d.web.app/rsvp.html

# Admin Dashboard Password
ADMIN_PASSWORD=your_secure_password

# WhatsApp Configuration
INVITATION_IMAGE_PATH=./assets/invitation.jpg
```

### 7. Add Your Invitation Image

1. Create `assets` folder in project root
2. Add your wedding invitation image as `invitation.jpg`
3. Recommended size: 1080x1920 pixels (portrait)

### 8. Add Premium Media Assets (RSVP Page)

The RSVP page now features premium UI with video intro, animations, and music. Add these files:

1. **Intro Video** (Required):
   - File: `public/media/intro/envelope.mp4`
   - Format: MP4, < 5MB, 3-5 seconds
   - Content: Envelope opening animation

2. **Background Music** (Required):
   - File: `public/media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3`
   - Format: MP3, < 3MB, 2-4 minutes
   - Content: Romantic wedding music

3. **Top Lottie Decoration** (Important):
   - File: `public/media/lottie/event-side-decoration.json`
   - Format: Lottie JSON, < 200KB
   - Content: Top header decoration

4. **Flowers Decoration** (Optional):
   - File: `public/media/lottie/flowers.json`
   - Format: Lottie JSON, < 200KB
   - Content: Corner floral decoration

**Quick Validation:**
```bash
# Check assets exist and are accessible:
open http://localhost:5000/media/validate-assets.html
```

**See detailed guide:** [`/docs/PREMIUM_ASSETS.md`](./docs/PREMIUM_ASSETS.md)

### 9. Configure Firebase in Frontend

Edit these files and replace `YOUR_API_KEY`, `YOUR_SENDER_ID`, `YOUR_APP_ID`:

- `public/js/rsvp.js`
- `public/admin/js/dashboard.js`

Get these values from Firebase Console → Project Settings → General → Your apps → Web app

## Testing

### Test Firebase Connection
```bash
npm run test-firebase
```

### Test Google Sheets Connection
```bash
npm run test-sheets
```

### Test WhatsApp (QR Code)
```bash
npm run test-whatsapp
```

## Usage

### Send Invitations

1. Make sure your Google Sheet is ready with guest data
2. Add your invitation image to `assets/invitation.jpg`
3. Run the sending script:

```bash
npm run send-invitations
```

4. **Scan the QR code** with your WhatsApp mobile app
5. The script will:
   - Fetch guests from Google Sheets
   - Save to Firestore
   - Send personalized WhatsApp messages
   - Track sending status

**Important**: 
- Keep your computer running during sending
- Messages are sent with 5-10 second delays to avoid rate limits
- Monitor the console for progress

### Deploy Website

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase (if not done):
   ```bash
   firebase init
   ```
   - Select: Hosting, Firestore
   - Use existing project: `wedinvite-ee26d`
   - Public directory: `public`

4. Deploy:
   ```bash
   npm run deploy
   ```

5. Your site will be live at: `https://wedinvite-ee26d.web.app`

### Access Admin Dashboard

Open: `https://wedinvite-ee26d.web.app/admin/dashboard.html`

Features:
- View all statistics
- Click on stat cards to filter
- Search by name or phone
- Export to Excel
- Real-time updates

## Project Structure

```
wedding-invitation-system/
├── src/
│   ├── config/
│   │   ├── firebase.js          # Firebase initialization
│   │   └── googleSheets.js      # Google Sheets API
│   ├── services/
│   │   ├── guestService.js      # Guest data management
│   │   └── whatsappService.js   # WhatsApp automation
│   └── scripts/
│       ├── sendInvitations.js   # Main sending script
│       ├── testFirebase.js      # Test Firebase
│       ├── testGoogleSheets.js  # Test Google Sheets
│       └── testWhatsApp.js      # Test WhatsApp
├── public/
│   ├── index.html               # Landing page
│   ├── rsvp.html                # RSVP form
│   ├── confirmation.html        # Thank you page
│   ├── css/
│   │   └── style.css            # Main styles
│   ├── js/
│   │   ├── rsvp.js              # RSVP form logic
│   │   └── animations.js        # Animations
│   └── admin/
│       ├── dashboard.html       # Admin dashboard
│       ├── css/
│       │   └── dashboard.css    # Dashboard styles
│       └── js/
│           └── dashboard.js     # Dashboard logic
├── assets/
│   └── invitation.jpg           # Your invitation image
├── .env                         # Environment variables
├── .gitignore                   # Git ignore file
├── package.json                 # Dependencies
├── firebase.json                # Firebase config
└── firestore.rules              # Firestore security rules
```

## Troubleshooting

### WhatsApp Issues

**QR Code not showing**: Make sure you're running the script in a terminal that supports QR codes

**Messages not sending**: 
- Check your internet connection
- Verify phone number format (+972XXXXXXXXX)
- WhatsApp may rate limit - increase delays between messages

### Firebase Issues

**Permission denied**:
- Check Firestore security rules
- Verify service account credentials
- Make sure Firestore is enabled

### Google Sheets Issues

**Cannot read spreadsheet**:
- Verify spreadsheet is shared with service account email
- Check GOOGLE_SHEETS_ID in .env
- Ensure Google Sheets API is enabled

## Git Repository

### Initialize Git

```bash
git init
git add .
git commit -m "Initial commit: Wedding invitation system"
```

### Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/wedding-invitation-system.git
git branch -M main
git push -u origin main
```

### Update After Changes

```bash
git add .
git commit -m "Description of changes"
git push
```

## Security Notes

⚠️ **Never commit these files**:
- `.env`
- `firebase-credentials.json`
- `google-credentials.json`
- `.wwebjs_auth/` (WhatsApp session)

These are already in `.gitignore`

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase/Google Cloud console logs
3. Check browser console for frontend errors

## License

ISC

---

**Made with ❤️ for your special day!**
