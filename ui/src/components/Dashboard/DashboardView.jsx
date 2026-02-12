import { useState, useEffect } from 'react'
import api from '../../api/client'
import StatsCard from './StatsCard'

export default function DashboardView() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalReminders: 0,
    whitelistCount: 0,
    totalMemories: 0
  })
  const [loading, setLoading] = useState(true)
  const [sysStatus, setSysStatus] = useState({
    api: 'online',
    ollama: 'checking...',
    database: 'connected'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await api.getStats()
      if (data) setStats(data)
      
      // Check Ollama status
      try {
        const modelData = await api.getModels()
        setSysStatus(prev => ({ ...prev, ollama: modelData.models?.length > 0 ? 'online' : 'no models' }))
      } catch (e) {
        setSysStatus(prev => ({ ...prev, ollama: 'offline' }))
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading stats:', error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Mensajes Totales" 
          value={stats.totalMessages.toLocaleString()} 
          icon="💬" 
          color="blue" 
        />
        <StatsCard 
          title="Recordatorios" 
          value={stats.totalReminders.toLocaleString()} 
          icon="🔔" 
          color="yellow" 
        />
        <StatsCard 
          title="Usuarios Whitelist" 
          value={stats.whitelistCount.toLocaleString()} 
          icon="👥" 
          color="green" 
        />
        <StatsCard 
          title="Memorias IA" 
          value={stats.totalMemories.toLocaleString()} 
          icon="🧠" 
          color="purple" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Card */}
        <div className="lg:col-span-1 bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-primary-500 rounded-full"></span>
            Estado del Sistema
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-950/50 rounded-2xl border border-gray-800/50">
              <span className="text-gray-400 font-medium">API Server</span>
              <span className="flex items-center gap-2 text-green-400 text-sm font-bold bg-green-400/10 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-950/50 rounded-2xl border border-gray-800/50">
              <span className="text-gray-400 font-medium">IA (Ollama)</span>
              <span className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full ${sysStatus.ollama === 'online' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {sysStatus.ollama === 'online' && <span className="w-2 h-2 rounded-full bg-green-400"></span>}
                {sysStatus.ollama.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-950/50 rounded-2xl border border-gray-800/50">
              <span className="text-gray-400 font-medium">Database (SQLite)</span>
              <span className="flex items-center gap-2 text-green-400 text-sm font-bold bg-green-400/10 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                CONNECTED
              </span>
            </div>
          </div>
          
          <button 
            onClick={loadData}
            className="w-full mt-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-all border border-gray-700 active:scale-95"
          >
            Refrescar Estado
          </button>
        </div>

        {/* Info/Quick Actions Card */}
        <div className="lg:col-span-2 bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-xl flex flex-col justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-primary-600/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 transform group-hover:rotate-12 transition-transform duration-500">
              🚀
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">¡Bienvenido al Panel de Baco Bot!</h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
              Desde aquí puedes monitorear el rendimiento y la salud de tu bot de WhatsApp.
              Configura la personalidad en la pestaña correspondiente o revisa lo que el bot ha recordado en la sección de memoria.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
