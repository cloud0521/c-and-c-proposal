# RSVP response sheet setup

1. Open the Google Sheet that should hold the RSVP records.
2. Choose **Extensions → Apps Script**, replace its code with `Code.gs`, then save.
3. Choose **Deploy → New deployment → Web app**. Run as **Me** and set access to **Anyone**.
4. Copy the Web app URL into a new `.env` file in the project root:

   `VITE_RSVP_ENDPOINT=your-web-app-url`

5. Restart the app or redeploy it.

The script automatically creates a `Responses` tab with timestamp, name, role, RSVP, and message fields.
