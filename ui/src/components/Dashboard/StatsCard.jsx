export default function StatsCard({ title, value, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  return (
    <div className={`p-6 rounded-2xl bg-gray-900 border ${colorClasses[color] || colorClasses.blue} shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]} bg-opacity-20`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
        </div>
      </div>
      <div>
        <h4 className="text-gray-400 text-sm font-medium mb-1">{title}</h4>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  )
}
