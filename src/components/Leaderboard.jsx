import React, { useState } from 'react'

const Leaderboard = ({ data, totalTickets }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Generate avatar colors based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  // Get initials from name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)

  // Arrange top 3 as: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : 
                      top3.length === 2 ? [top3[1], top3[0], null] :
                      top3.length === 1 ? [null, top3[0], null] : []

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-center mb-8 relative">
        <h1 className="text-3xl font-bold text-gray-800">Leaderboard</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="absolute right-0 text-indigo-600 hover:text-indigo-800 transition-colors"
          aria-label="Show prize information"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

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

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-4 mb-12">
          {podiumOrder.map((person, idx) => {
            if (!person) return <div key={idx} className="w-32"></div>
            
            const position = idx === 1 ? 1 : idx === 0 ? 2 : 3
            const isFirst = position === 1
            
            return (
              <div
                key={person.name}
                className={`flex flex-col items-center ${isFirst ? 'mb-8' : ''}`}
              >
                {/* Crown for 1st place */}
                {isFirst && (
                  <div className="text-6xl mb-2">👑</div>
                )}
                
                {/* Avatar */}
                <div
                  className={`${getAvatarColor(person.name)} ${
                    isFirst ? 'w-28 h-28' : 'w-20 h-20'
                  } rounded-full flex items-center justify-center text-white font-bold ${
                    isFirst ? 'text-3xl' : 'text-xl'
                  } shadow-lg ring-4 ring-white mb-3`}
                >
                  {getInitials(person.name)}
                </div>
                
                {/* Name */}
                <div className={`font-bold text-gray-800 ${isFirst ? 'text-lg' : 'text-base'} mb-1`}>
                  {person.name}
                </div>
                
                {/* Tickets */}
                <div className={`font-bold ${isFirst ? 'text-yellow-500 text-2xl' : 'text-indigo-600 text-xl'}`}>
                  {person.tickets}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total Tickets Counter */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 text-center">
        <p className="text-gray-600 text-lg mb-2">Total Tickets Sold</p>
        <p className="text-6xl font-bold text-indigo-600">{totalTickets}</p>
      </div>

      {/* Rest of the list */}
      {rest.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          {rest.map((person, index) => (
            <div
              key={person.name}
              className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className={`${getAvatarColor(person.name)} w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md`}
                >
                  {getInitials(person.name)}
                </div>
                
                {/* Name */}
                <div>
                  <div className="font-bold text-gray-800">{person.name}</div>
                </div>
              </div>
              
              {/* Tickets */}
              <div className="font-bold text-gray-800 text-lg">{person.tickets}</div>
            </div>
          ))}
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center text-gray-500 text-xl">
          No ticket referral data found.
        </div>
      )}
    </div>
  )
}

export default Leaderboard

