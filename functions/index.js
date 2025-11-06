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
    
    // Fetch data from the sheet
    // Columns: Event Name, Event ID, Order #, Order Date, First Name, Last Name, 
    // Email, Location 1, Location 2, Location 3, Attendee Status, Which company dancer referred you?
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: 'Tickets!A:L', // A through L for 12 columns
    })

    const rows = response.data.values || []
    
    // Skip header row if present
    const dataRows = rows.slice(1)
    
    // Parse the rows into structured data
    const tickets = []
    dataRows.forEach(row => {
      if (row.length >= 11) { // At least through Attendee Status
        const [
          eventName,
          eventId,
          orderId,
          orderDate,
          firstName,
          lastName,
          email,
          location1,
          location2,
          location3,
          attendeeStatus,
          referrer // Index 11, may not exist for all rows
        ] = row

        // Only include attending tickets
        if (attendeeStatus && attendeeStatus.toLowerCase().includes('attending')) {
          // Use Location 3 as the primary seat identifier (appears to be the seat number)
          const seat = location3?.trim()
          const referrerValue = referrer?.trim()
          
          tickets.push({
            eventId: eventId?.trim(),
            orderId: orderId?.trim(),
            seat: seat,
            firstName: firstName?.trim(),
            lastName: lastName?.trim(),
            email: email?.trim(),
            status: attendeeStatus?.trim(),
            referrer: referrerValue && referrerValue !== '' ? referrerValue : null,
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

    // Check for cache bypass parameter
    const bypassCache = req.query.nocache === 'true' || req.query.refresh === 'true'

    // Check if we have valid cached data
    const now = Date.now()
    if (!bypassCache && cachedData && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
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
    // Strategy: Eventbrite is the source of truth for tickets
    // Google Sheets is used to UPDATE referrer information for existing orders
    
    // Create a map of Order ID -> Referrer from Google Sheets
    const sheetsReferrerMap = new Map()
    sheetsTickets.forEach(ticket => {
      if (ticket.referrer && ticket.orderId) {
        // Store the referrer for this order ID
        sheetsReferrerMap.set(ticket.orderId, ticket.referrer)
      }
    })
    
    console.log(`Found referrer updates for ${sheetsReferrerMap.size} orders in Google Sheets`)
    
    const ticketMap = new Map()
    let updatedCount = 0
    
    // Add ALL Eventbrite tickets (source of truth)
    eventbriteTickets.forEach((ticket, index) => {
      const key = `eventbrite-${ticket.orderId}-${index}`
      
      // Check if Google Sheets has a referrer update for this order
      if (sheetsReferrerMap.has(ticket.orderId)) {
        const updatedReferrer = sheetsReferrerMap.get(ticket.orderId)
        if (updatedReferrer !== ticket.referrer) {
          ticket.referrer = updatedReferrer
          updatedCount++
        }
      }
      
      ticketMap.set(key, ticket)
    })
    
    console.log(`Updated ${updatedCount} Eventbrite tickets with referrer info from Google Sheets`)

    // Add any tickets from Google Sheets that don't exist in Eventbrite
    const eventbriteOrderIds = new Set(eventbriteTickets.map(t => t.orderId))
    let newFromSheetsCount = 0
    
    sheetsTickets.forEach((ticket, index) => {
      if (!eventbriteOrderIds.has(ticket.orderId)) {
        const key = `sheets-${ticket.orderId}-${ticket.seat || index}`
        ticketMap.set(key, ticket)
        newFromSheetsCount++
      }
    })
    
    console.log(`Added ${newFromSheetsCount} new tickets from Google Sheets not in Eventbrite`)

    // Count tickets per dancer
    const dancerTickets = {}
    let totalTickets = ticketMap.size

    ticketMap.forEach(ticket => {
      if (ticket.referrer) {
        // Skip N/A and null/empty referrers
        const referrerLower = ticket.referrer.toLowerCase().trim()
        if (referrerLower !== 'n/a' && referrerLower !== '') {
          if (!dancerTickets[ticket.referrer]) {
            dancerTickets[ticket.referrer] = 0
          }
          dancerTickets[ticket.referrer]++
        }
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
    let sheetsOnlyCount = 0
    ticketMap.forEach(ticket => {
      if (ticket.source === 'eventbrite') eventbriteCount++
      else if (ticket.source === 'sheets') sheetsOnlyCount++
    })

    const responseData = {
      success: true,
      totalTickets,
      leaderboard: leaderboardArray,
      lastUpdated: new Date().toISOString(),
      cached: false,
      dataSources: {
        fromEventbrite: eventbriteCount, // All tickets from Eventbrite (some may have updated referrers)
        onlyInSheets: sheetsOnlyCount, // Tickets only in Google Sheets (not in Eventbrite)
        referrersUpdated: updatedCount // How many Eventbrite tickets had referrer updated from Sheets
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

