# Wedding Invitation System

Private personal hobby project for managing wedding invitations with WhatsApp automation, RSVP tracking, and guest management.

> **Note:** This is a private project for personal use only. No public deployment.

---

## Run Locally

### Prerequisites

- **Node.js** v18 or higher ([download](https://nodejs.org/))
- **Firebase Project** with Firestore enabled
- **Google Cloud Project** with Sheets API enabled (optional, for guest sync)
- **WhatsApp Account** for sending messages

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

**Required variables in `.env`:**

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `GOOGLE_SHEETS_ID` | Google Sheets spreadsheet ID (optional) |
| `RSVP_URL` | Local URL: `http://localhost:3000/rsvp.html` |
| `ADMIN_PASSWORD` | Password for admin dashboard |
| `INVITATION_IMAGE_PATH` | Path to invitation image |

### 3. Add Firebase Credentials

**Option A:** Save credentials file
- Download from Firebase Console → Project Settings → Service Accounts
- Save as `firebase-credentials.json` in project root

**Option B:** Use environment variables (already in `.env`)

### 4. Start the Server

```bash
npm start
# or
npm run dev
```

### 5. Open in Browser

| Page | URL |
|------|-----|
| Home | http://localhost:3000 |
| RSVP Form | http://localhost:3000/rsvp.html |
| Admin Dashboard | http://localhost:3000/admin/dashboard.html |
| Admin Designer | http://localhost:3000/admin/designer.html |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server (port 3000) |
| `npm run dev` | Same as start (development) |
| `npm run send-invitations` | Send WhatsApp invitations to all guests |
| `npm run test-firebase` | Test Firebase connection |
| `npm run test-sheets` | Test Google Sheets connection |
| `npm run test-whatsapp` | Test WhatsApp connection (shows QR) |

---

## Project Structure

```
wedding-invitation-system/
├── src/
│   ├── server.js              # Express server (main entry)
│   ├── config/
│   │   ├── firebase.js        # Firebase initialization
│   │   └── googleSheets.js    # Google Sheets API
│   ├── services/
│   │   ├── guestService.js    # Guest data management
│   │   ├── sendingService.js  # Message sending orchestration
│   │   └── whatsappService.js # WhatsApp automation
│   └── scripts/
│       ├── sendInvitations.js # Batch send script
│       └── test*.js           # Test scripts
├── public/                    # Static frontend files
│   ├── index.html             # Home page
│   ├── rsvp.html              # RSVP form
│   ├── confirmation.html      # Thank you page
│   ├── admin/                 # Admin pages
│   ├── css/                   # Stylesheets
│   ├── js/                    # Frontend JavaScript
│   └── media/                 # Audio, video, Lottie files
├── assets/
│   └── invitation.jpg         # Invitation image for WhatsApp
├── .env                       # Environment variables (not in git)
├── .env.example               # Example env file
└── firebase-credentials.json  # Firebase credentials (not in git)
```

---

## Troubleshooting

### Server won't start

**Port already in use:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000
# Kill it (replace PID)
taskkill /PID <PID> /F
```

**Missing environment variables:**
- Check `.env` file exists
- Verify all required variables are set
- Check for typos in variable names

### Firebase connection fails

- Verify `firebase-credentials.json` exists OR env variables are set
- Check Firebase project ID matches
- Ensure Firestore is enabled in Firebase Console
- Check Firestore security rules allow access

### WhatsApp issues

**QR code not showing:**
- Run in a terminal that supports QR codes
- Try a different terminal (PowerShell, CMD, VS Code terminal)

**Connection fails:**
- Delete `.wwebjs_auth/` folder and try again
- Check internet connection
- WhatsApp may be rate-limiting - wait and retry

### Google Sheets sync fails

- Verify spreadsheet is shared with service account email
- Check `GOOGLE_SHEETS_ID` in `.env`
- Ensure Google Sheets API is enabled in Google Cloud Console

### Reset everything

```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install

# Clear WhatsApp session
rm -rf .wwebjs_auth

# Restart
npm start
```

---

## Security Notes

**Never commit these files** (already in `.gitignore`):
- `.env`
- `firebase-credentials.json`
- `google-credentials.json`
- `.wwebjs_auth/`

---

## License

ISC - Private personal use only.
