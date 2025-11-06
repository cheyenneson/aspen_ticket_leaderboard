# Aspen Ballet Ticket Leaderboard

A React + Tailwind CSS application that displays a leaderboard of company dancers based on ticket sales referrals, with live data from Eventbrite.

## Features

- 📊 Visual leaderboard with podium-style display for top 3 performers
- 🎨 Beautiful light-mode UI with gradient backgrounds
- 🔄 Live data fetching from Eventbrite API
- 📈 Automatic data refresh every 5 minutes
- 🏆 Crown icon for the top performer
- 🎁 Prize information modal

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Eventbrite API

Create a `.env` file in the root directory:

```env
EVENTBRITE_TOKEN=your_eventbrite_private_token_here
PORT=3001
```

To get your Eventbrite token:
1. Go to https://www.eventbrite.com/account-settings/apps
2. Create a new private token
3. Copy the token to your `.env` file

### 3. Update Event IDs (if needed)

In `server.js`, update the `eventIds` array with your actual Eventbrite event IDs:

```javascript
const eventIds = [
  '1849540227609', // December 16, 7:30 PM
  '1859770326109', // December 17, 7:30 PM
  // ... add your event IDs
]
```

### 4. Run the Application

**Option 1: Run both server and client together (recommended)**
```bash
npm run dev:all
```

**Option 2: Run separately**
```bash
# Terminal 1 - Start the API server
npm run server

# Terminal 2 - Start the React app
npm run dev
```

### 5. Open Your Browser

Navigate to **http://localhost:5173** to see your leaderboard!

## How It Works

### Server (server.js)
- Connects to Eventbrite API using your private token
- Fetches attendee data from all specified events
- Processes responses to "Which company dancer referred you?" questions
- Calculates total tickets and individual dancer counts
- Serves data via REST API at `http://localhost:3001/api/tickets`

### Client (React App)
- Fetches live data from the local server
- Displays leaderboard with automatic sorting
- Auto-refreshes data every 5 minutes
- Shows total tickets sold across all events

## API Endpoints

### GET /api/tickets
Returns leaderboard data:
```json
{
  "success": true,
  "totalTickets": 249,
  "leaderboard": [
    {
      "name": "Dancer Name",
      "tickets": 42
    }
  ],
  "lastUpdated": "2025-11-05T12:00:00.000Z"
}
```

### GET /api/health
Health check endpoint:
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T12:00:00.000Z"
}
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Troubleshooting

**"Error loading data"**
- Make sure the server is running (`npm run server`)
- Check that your `.env` file exists with a valid `EVENTBRITE_TOKEN`
- Verify your event IDs are correct in `server.js`

**No data showing**
- Check the server console for errors
- Verify your Eventbrite token has the correct permissions
- Ensure the question "Which company dancer referred you?" exists in your event registration

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **API**: Eventbrite API v3
- **Environment**: dotenv for configuration
