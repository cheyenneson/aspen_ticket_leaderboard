import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Enable CORS for your React app
app.use(cors())
app.use(express.json())

// Eventbrite API configuration
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN
const EVENTBRITE_ORG_ID = process.env.EVENTBRITE_ORG_ID

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

// Endpoint to fetch ticket data
app.get('/api/tickets', async (req, res) => {
  try {
    if (!EVENTBRITE_TOKEN) {
      throw new Error('EVENTBRITE_TOKEN not found in environment variables')
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

    console.log('Fetching fresh data from Eventbrite')

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

    // Fetch all events in parallel
    const attendeeArrays = await Promise.all(
      eventIds.map(eventId => fetchEventAttendees(eventId))
    )
    
    // Flatten all attendees into one array
    const allAttendees = attendeeArrays.flat()

    // Process the attendees data
    const dancerTickets = {}
    let totalTickets = 0

    allAttendees.forEach(attendee => {
      if (attendee.status === 'Attending' || attendee.status === 'Checked In') {
        totalTickets++

        // Check for dancer referral in answers
        if (attendee.answers && Array.isArray(attendee.answers)) {
          attendee.answers.forEach(answer => {
            // Look for the question about which dancer referred them
            if (answer.question && 
                answer.question.toLowerCase().includes('which company dancer referred you') &&
                answer.answer) {
              
              const dancerName = answer.answer.trim()
              
              // Skip empty answers and N/A
              if (dancerName && dancerName.toLowerCase() !== 'n/a') {
                if (!dancerTickets[dancerName]) {
                  dancerTickets[dancerName] = 0
                }
                dancerTickets[dancerName]++
              }
            }
          })
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

    const responseData = {
      success: true,
      totalTickets,
      leaderboard: leaderboardArray,
      lastUpdated: new Date().toISOString(),
      cached: false
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
    tokenConfigured: !!EVENTBRITE_TOKEN,
    cacheAge: cacheTimestamp ? Math.floor((Date.now() - cacheTimestamp) / 1000) : null
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Eventbrite token configured: ${EVENTBRITE_TOKEN ? 'Yes' : 'No'}`)
  console.log(`Cache duration: ${CACHE_DURATION / 1000} seconds`)
})
