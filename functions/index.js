const functions = require('firebase-functions')
const express = require('express')
const cors = require('cors')
const { google } = require('googleapis')

const app = express()

// Enable CORS
app.use(cors({ origin: true }))
app.use(express.json())

// Get configuration from Firebase config
const EVENTBRITE_TOKEN = functions.config().eventbrite?.token
const GOOGLE_SHEETS_ID = functions.config().sheets?.id
const GOOGLE_SERVICE_ACCOUNT = functions.config().sheets?.service_account ? 
  JSON.parse(Buffer.from(functions.config().sheets.service_account, 'base64').toString()) : null

// Event IDs for all Nutcracker performances
const eventIds = [
  '1849540227609',
  '1859770326109',
  '1859794378049',
  '1859807366899'
]

// Simple in-memory cache
let cachedData = null
let cacheTimestamp = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Function to fetch data from Google Sheets
async function fetchGoogleSheetsData() {
  if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT) {
    console.log('Google Sheets not configured, skipping')
    return []
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_SERVICE_ACCOUNT,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    
    // Fetch data from the sheet - adjust range as needed
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:L', // Adjust range to match your sheet
    })

    const rows = response.data.values || []
    
    // Skip header row if present
    const dataRows = rows.slice(1)
    
    // Parse the rows into structured data
    const tickets = []
    dataRows.forEach(row => {
      if (row.length >= 12) {
        const [
          eventName,
          eventId,
          orderId,
          orderDate,
          firstName,
          lastName,
          email,
          quantity,
          section,
          seat,
          status,
          referrer
        ] = row

        // Only include attending tickets
        if (status && status.toLowerCase().includes('attending')) {
          tickets.push({
            eventId: eventId?.trim(),
            orderId: orderId?.trim(),
            seat: seat?.trim(),
            firstName: firstName?.trim(),
            lastName: lastName?.trim(),
            email: email?.trim(),
            status: status?.trim(),
            referrer: referrer?.trim(),
            source: 'sheets'
          })
        }
      }
    })

    console.log(`Fetched ${tickets.length} tickets from Google Sheets`)
    return tickets
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    return []
  }
}

// Endpoint to fetch ticket data
app.get('/api/tickets', async (req, res) => {
  try {
    if (!EVENTBRITE_TOKEN) {
      throw new Error('EVENTBRITE_TOKEN not configured. Run: firebase functions:config:set eventbrite.token="YOUR_TOKEN"')
    }

    // Check if we have valid cached data
    const now = Date.now()
    if (cachedData && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      console.log('Returning cached data')
      return res.json({
        ...cachedData,
        cached: true,
        cacheAge: Math.floor((now - cacheTimestamp) / 1000) // seconds
      })
    }

    console.log('Fetching fresh data from Eventbrite and Google Sheets')

    // Fetch orders from Eventbrite (in parallel for speed)
    const fetchEventAttendees = async (eventId) => {
      let attendees = []
      let page = 1
      let hasMorePages = true

      while (hasMorePages) {
        const url = `https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?page=${page}`
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${EVENTBRITE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Eventbrite API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        attendees = attendees.concat(data.attendees || [])

        hasMorePages = data.pagination && data.pagination.has_more_items
        page++
      }

      return attendees
    }

    // Fetch all events in parallel (both Eventbrite and Google Sheets)
    const [attendeeArrays, sheetsTickets] = await Promise.all([
      Promise.all(eventIds.map(eventId => fetchEventAttendees(eventId))),
      fetchGoogleSheetsData()
    ])
    
    // Flatten all attendees into one array
    const allAttendees = attendeeArrays.flat()

    // Process Eventbrite attendees into a normalized format
    const eventbriteTickets = []
    allAttendees.forEach(attendee => {
      if (attendee.status === 'Attending' || attendee.status === 'Checked In') {
        // Extract referrer from answers
        let referrer = null
        if (attendee.answers && Array.isArray(attendee.answers)) {
          attendee.answers.forEach(answer => {
            if (answer.question && 
                answer.question.toLowerCase().includes('which company dancer referred you') &&
                answer.answer) {
              const dancerName = answer.answer.trim()
              if (dancerName && dancerName.toLowerCase() !== 'n/a') {
                referrer = dancerName
              }
            }
          })
        }

        // Get assigned seat info if available
        const seat = attendee.assigned_number || attendee.barcodes?.[0]?.barcode || null
        
        eventbriteTickets.push({
          orderId: attendee.order_id,
          seat: seat,
          email: attendee.profile?.email,
          firstName: attendee.profile?.first_name,
          lastName: attendee.profile?.last_name,
          referrer: referrer,
          source: 'eventbrite'
        })
      }
    })

    console.log(`Fetched ${eventbriteTickets.length} tickets from Eventbrite, ${sheetsTickets.length} from Google Sheets`)

    // Merge and deduplicate tickets
    // Use a Map with orderId-seat as the key to track unique tickets
    const ticketMap = new Map()
    
    // First, add Eventbrite tickets
    eventbriteTickets.forEach(ticket => {
      const key = `${ticket.orderId}-${ticket.seat || 'unknown'}`
      ticketMap.set(key, ticket)
    })

    // Then, add/update with Google Sheets tickets (they take priority for referrer data)
    sheetsTickets.forEach(ticket => {
      const key = `${ticket.orderId}-${ticket.seat || 'unknown'}`
      const existingTicket = ticketMap.get(key)
      
      if (existingTicket) {
        // Update existing ticket with Google Sheets referrer (if it has one)
        if (ticket.referrer) {
          existingTicket.referrer = ticket.referrer
          existingTicket.source = 'sheets' // Mark as updated from sheets
        }
      } else {
        // Add new ticket from sheets
        ticketMap.set(key, ticket)
      }
    })

    // Count tickets per dancer
    const dancerTickets = {}
    let totalTickets = ticketMap.size

    ticketMap.forEach(ticket => {
      if (ticket.referrer) {
        if (!dancerTickets[ticket.referrer]) {
          dancerTickets[ticket.referrer] = 0
        }
        dancerTickets[ticket.referrer]++
      }
    })

    // Convert to array and sort by ticket count
    const leaderboardArray = Object.entries(dancerTickets)
      .map(([name, tickets]) => ({
        name,
        tickets
      }))
      .sort((a, b) => b.tickets - a.tickets)

    // Calculate some stats about data sources
    let eventbriteCount = 0
    let sheetsCount = 0
    let updatedBySheetsCount = 0
    ticketMap.forEach(ticket => {
      if (ticket.source === 'eventbrite') eventbriteCount++
      else if (ticket.source === 'sheets') {
        sheetsCount++
        // Check if it was an update (exists in both)
        if (eventbriteTickets.some(et => `${et.orderId}-${et.seat || 'unknown'}` === `${ticket.orderId}-${ticket.seat || 'unknown'}`)) {
          updatedBySheetsCount++
        }
      }
    })

    const responseData = {
      success: true,
      totalTickets,
      leaderboard: leaderboardArray,
      lastUpdated: new Date().toISOString(),
      cached: false,
      dataSources: {
        eventbrite: eventbriteCount,
        sheets: sheetsCount - updatedBySheetsCount, // Only count new tickets from sheets
        updatedBySheets: updatedBySheetsCount
      }
    }

    // Update cache
    cachedData = responseData
    cacheTimestamp = Date.now()

    res.json(responseData)

  } catch (error) {
    console.error('Error fetching Eventbrite data:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    tokenConfigured: !!EVENTBRITE_TOKEN
  })
})

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app)

