import { useState, useEffect } from 'react'
import Leaderboard from './components/Leaderboard'
import SkeletonLoader from './components/SkeletonLoader'

function App() {
  const [leaderboardData, setLeaderboardData] = useState([])
  const [totalTickets, setTotalTickets] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    // Fetch live data from the server
    const fetchData = async () => {
      try {
        // Determine API URL based on environment
        const isProduction = window.location.hostname !== 'localhost'
        const apiUrl = isProduction 
          ? '/api'  // Use relative path in production (Firebase rewrites to function)
          : 'http://127.0.0.1:5001/aspen-leaderboard/us-central1/api/api'  // Use Firebase emulator in development
        
        console.log('Fetching from:', apiUrl)
        const response = await fetch(`${apiUrl}/tickets`)
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setLeaderboardData(data.leaderboard)
          setTotalTickets(data.totalTickets)
        } else {
          throw new Error(data.error || 'Failed to fetch data')
        }
      } catch (error) {
        console.error('Error fetching ticket data:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Optional: Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <SkeletonLoader onInfoClick={() => setIsModalOpen(true)} />
        
        {/* Info Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Close button */}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="float-right text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Ticket Sales for{' '}
                  <a 
                    href="https://www.aspen-ballet.com/nutcracker" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    The Nutcracker
                  </a>
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  Sell tickets to help us spread the magic! The top seller wins their choice of:
                </p>
              </div>
              
              {/* Prize Options */}
              <div className="flex justify-center items-center gap-8 flex-wrap">
                <div className="flex flex-col items-center">
                  <img 
                    src="/pointe.png" 
                    alt="Pointe Shoes" 
                    className="w-32 h-32 object-contain mb-3"
                  />
                  <p className="font-semibold text-gray-800">New Pair of Pointe Shoes</p>
                </div>
                
                <div className="text-4xl font-bold text-gray-400">OR</div>
                
                <div className="flex flex-col items-center">
                  <img 
                    src="/tucanos.png" 
                    alt="Tucanos" 
                    className="w-32 h-32 object-contain mb-3"
                  />
                  <p className="font-semibold text-gray-800">$100 Tucanos Gift Card</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-red-600 mb-4">Error loading data</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <Leaderboard data={leaderboardData} totalTickets={totalTickets} />
    </div>
  )
}

export default App

