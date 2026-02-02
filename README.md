# Wedding Invitation System

Local-only personal project (no deployment).

## Run Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   - Copy `.env.example` to `.env` if not already done.
   - Ensure `FIREBASE_credentials` etc. are set.

3. **Start Server**
   ```bash
   npm start
   ```

4. **Open in Browser**
   - **Home/RSVP:** [http://localhost:3000/](http://localhost:3000/)
   - **Test RSVP:** [http://localhost:3000/rsvp.html?phone=TEST](http://localhost:3000/rsvp.html?phone=TEST)
   - **Admin Dashboard:** [http://localhost:3000/admin/dashboard.html](http://localhost:3000/admin/dashboard.html)
   - **Designer:** [http://localhost:3000/admin/designer.html](http://localhost:3000/admin/designer.html)

## Troubleshooting
- **Server not running / port busy?**
  Run `taskkill /PID <PID> /F` if port 3000 is taken, or just restart VS Code.
- **Firebase/WhatsApp issues?**
  Check console logs. Ensure `.env` is correct.
