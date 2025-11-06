import React from 'react'

const SkeletonLoader = ({ onInfoClick }) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-center mb-8 relative">
        <h1 className="text-3xl font-bold text-gray-800">Leaderboard</h1>
        <button 
          onClick={onInfoClick}
          className="absolute right-0 text-indigo-600 hover:text-indigo-800 transition-colors"
          aria-label="Show prize information"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-4 mb-12 animate-pulse">
        {/* 2nd Place */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-300 rounded-full mb-3"></div>
          <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
          <div className="h-6 w-12 bg-gray-300 rounded"></div>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-6xl mb-2">👑</div>
          <div className="w-28 h-28 bg-gray-300 rounded-full mb-3"></div>
          <div className="h-5 w-32 bg-gray-300 rounded mb-2"></div>
          <div className="h-7 w-16 bg-gray-300 rounded"></div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-300 rounded-full mb-3"></div>
          <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
          <div className="h-6 w-12 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Total Tickets Counter Placeholder */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 text-center">
        <p className="text-gray-600 text-lg mb-2">Total Tickets Sold</p>
        <div className="h-16 w-32 bg-gray-300 rounded-lg mx-auto animate-pulse"></div>
      </div>

      {/* Rest of the list */}
      <div className="bg-white rounded-3xl shadow-xl p-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-300 rounded-full"></div>
              <div className="h-5 w-32 bg-gray-300 rounded"></div>
            </div>
            <div className="h-6 w-12 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SkeletonLoader

