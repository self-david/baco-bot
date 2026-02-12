import { useState, useEffect } from 'react'
import api from '../../api/client'
import ConversationList from './ConversationList'
import MessageList from '../Chat/MessageList'

export default function MemoryView() {
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [history, setHistory] = useState([])
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'facts'

  useEffect(() => {
    if (selectedChatId) {
      loadData()
    }
  }, [selectedChatId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load History
      const historyData = await api.getMemory(selectedChatId)
      if (historyData.history) {
        const formattedMessages = historyData.history.map(msg => ({
          text: msg.content,
          isUser: msg.role === 'user',
          timestamp: msg.timestamp || new Date()
        }))
        setHistory(formattedMessages)
      }

      // Load Memories (Facts)
      try {
        const memoryData = await api.getMemories(selectedChatId)
        if (memoryData.memories) {
          setMemories(memoryData.memories)
        }
      } catch (e) {
        console.error('Error loading explicit memories', e)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (!selectedChatId) return
    
    if (confirm(`¿Estás seguro de borrar todo el historial de "${selectedChatId}"?`)) {
      try {
        await api.clearMemory(selectedChatId)
        setHistory([])
        alert('Historial borrado')
      } catch (error) {
        alert('Error al borrar historial')
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
      {/* Sidebar - Lista de Conversaciones */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800">
        <ConversationList 
          onSelect={setSelectedChatId} 
          selectedChatId={selectedChatId} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-950/30">
        {selectedChatId ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white mb-0.5">Historial: {selectedChatId.split('@')[0]}</h3>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{history.length} mensajes</span>
                  <span>{memories.length} hechos recordados</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-gray-800 rounded-lg p-1 mr-4">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-primary-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('facts')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'facts' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    🧠 Hechos
                  </button>
                </div>

                <button 
                  onClick={loadData}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-colors"
                  title="Refrescar datos"
                >
                  🔄
                </button>
                <button 
                  onClick={handleClearHistory}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-colors border border-red-500/20"
                  title="Borrar historial"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
               {activeTab === 'chat' ? (
                 <MessageList messages={history} loading={loading} />
               ) : (
                 <div className="h-full overflow-y-auto p-6 space-y-4">
                   {memories.length === 0 ? (
                     <div className="text-center text-gray-500 py-12">
                       <div className="text-4xl mb-4">🌪️</div>
                       <p>No he detectado hechos importantes sobre este usuario todavía.</p>
                       <p className="text-sm opacity-70 mt-2">La IA analiza la conversación en busca de nombres, preferencias y datos clave.</p>
                     </div>
                   ) : (
                     memories.map((mem) => (
                       <div key={mem.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl hover:border-purple-500/30 transition-colors group">
                         <div className="flex justify-between items-start mb-2">
                           <span className="text-xs font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded">
                             {mem.category}
                           </span>
                           <span className="text-xs text-gray-600">
                             {new Date(mem.created_at || Date.now()).toLocaleDateString()}
                           </span>
                         </div>
                         <p className="text-gray-200 font-medium">{mem.content}</p>
                         <p className="text-xs text-gray-600 mt-2 italic border-t border-gray-800 pt-2 group-hover:text-gray-500 transition-colors">
                            Fuente: "...{mem.conversation_context?.substring(0, 50)}..."
                         </p>
                       </div>
                     ))
                   )}
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-50">
               📁
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">Selecciona una conversación</h3>
            <p className="max-w-xs mx-auto text-sm">
              Explora el historial y la memoria a largo plazo de tus usuarios.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
