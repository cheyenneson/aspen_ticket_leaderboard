# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for the Aspen Ticket Leaderboard to pull additional ticket data and referrer updates.

## Overview

The system now combines data from two sources:
1. **Eventbrite API** - Primary ticket sales data
2. **Google Sheets** - Manual updates and corrections to referrer information

When there are duplicates (same Order ID + Seat Number), the Google Sheets referrer data takes priority, allowing you to manually correct or update referrer information.

## Step 1: Set Up Google Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Name it something like "aspen-ticket-leaderboard"
   - Click "Create and Continue"
   - Skip the optional steps and click "Done"

5. Create and Download Service Account Key:
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Click "Create" - this will download a JSON file

## Step 2: Prepare Your Google Sheet

1. Create or open your Google Sheet with ticket data
2. Make sure your sheet has the following columns (in order):
   - Column A: Event Name
   - Column B: Event ID
   - Column C: Order ID
   - Column D: Order Date
   - Column E: First Name
   - Column F: Last Name
   - Column G: Email
   - Column H: Quantity
   - Column I: Section
   - Column J: Seat/Row Number
   - Column K: Status
   - Column L: Referrer (Dancer Name)

3. Share the sheet with the service account:
   - Copy the service account email from the JSON file (looks like `name@project-id.iam.gserviceaccount.com`)
   - Click "Share" on your Google Sheet
   - Paste the service account email
   - Give it "Viewer" permissions
   - Click "Send"

4. Get your Google Sheet ID:
   - It's in the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy this ID for the next step

## Step 3: Configure Firebase Functions

You need to set up three configuration values in Firebase:

### 3.1 Convert Service Account JSON to Base64

Open a terminal and run:

```bash
# Replace path/to/service-account.json with your actual file path
base64 -i path/to/service-account.json | tr -d '\n'
```

This will output a long base64-encoded string. Copy this entire string.

### 3.2 Set Firebase Configuration

Run these commands in your terminal (replace the placeholder values):

```bash
# Set the Google Sheets ID
firebase functions:config:set sheets.id="YOUR_SHEET_ID_HERE"

# Set the service account (paste the base64 string from step 3.1)
firebase functions:config:set sheets.service_account="BASE64_ENCODED_JSON_HERE"
```

### 3.3 Verify Configuration

```bash
firebase functions:config:get
```

You should see something like:

```json
{
  "eventbrite": {
    "token": "YOUR_EVENTBRITE_TOKEN"
  },
  "sheets": {
    "id": "YOUR_SHEET_ID",
    "service_account": "LONG_BASE64_STRING"
  }
}
```

## Step 4: Install Dependencies and Deploy

```bash
# Install the new dependency
cd functions
npm install

# Deploy the updated function
cd ..
firebase deploy --only functions
```

## Step 5: Test the Integration

After deployment, test the integration:

```bash
curl https://YOUR_FUNCTION_URL/api/tickets
```

The response will now include a `dataSources` field showing:
- `eventbrite`: Number of tickets from Eventbrite only
- `sheets`: Number of new tickets found only in Google Sheets
- `updatedBySheets`: Number of tickets where Google Sheets updated the referrer

Example response:

```json
{
  "success": true,
  "totalTickets": 250,
  "leaderboard": [
    { "name": "Ashley Gold", "tickets": 45 },
    { "name": "Kiana Lewis", "tickets": 32 }
  ],
  "lastUpdated": "2025-11-06T12:00:00.000Z",
  "cached": false,
  "dataSources": {
    "eventbrite": 230,
    "sheets": 5,
    "updatedBySheets": 15
  }
}
```

## How Deduplication Works

The system uses **Order ID + Seat Number** as a unique identifier for each ticket. When processing:

1. All Eventbrite tickets are loaded first
2. Google Sheets tickets are then processed
3. If a ticket exists in both sources:
   - The ticket is only counted once (no duplicate)
   - If Google Sheets has a referrer value, it replaces the Eventbrite referrer
4. If a ticket only exists in Google Sheets:
   - It's added as a new ticket

This allows you to:
- Manually add tickets that aren't in Eventbrite
- Update/correct referrer information for existing tickets
- Never worry about double-counting

## Updating the Sheet Name or Range

If your sheet is named something other than "Sheet1" or you want to use a different range, edit `functions/index.js`:

```javascript
// Around line 49
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: GOOGLE_SHEETS_ID,
  range: 'Sheet1!A:L', // Change this to your sheet name/range
})
```

Common alternatives:
- `'My Tickets!A:L'` - Sheet named "My Tickets"
- `'Sheet1!A2:L'` - Skip header row, start from row 2
- `'Responses!A:M'` - Sheet named "Responses" with 13 columns

## Troubleshooting

### "Google Sheets not configured, skipping"

This is normal if you haven't set up Google Sheets yet. The function will still work with Eventbrite data only.

### "Error fetching Google Sheets data"

Check the function logs:

```bash
firebase functions:log
```

Common issues:
- Service account doesn't have permission to access the sheet
- Sheet ID is incorrect
- Service account JSON is malformed
- Sheet structure doesn't match expected columns

### Test Locally

You can test with the Firebase emulator:

```bash
firebase emulators:start --only functions
```

Then visit `http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/api/tickets`

## Security Notes

- The service account only has read access to your Google Sheet
- Store service account credentials securely using Firebase config (not in code)
- The base64 encoding is just for storage format, not security
- Never commit the service account JSON file to version control
- Add the JSON file to `.gitignore`

## Support

If you need help, check the Firebase Functions logs:

```bash
firebase functions:log --only api
```

Look for messages starting with:
- "Fetched X tickets from Google Sheets" - Success
- "Google Sheets not configured" - Configuration issue
- "Error fetching Google Sheets data" - API or permission issue

