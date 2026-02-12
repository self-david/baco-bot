import { useState, useEffect } from 'react'
import api from '../../api/client'

export default function ConversationList({ onSelect, selectedChatId }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await api.getConversations()
      if (data.conversations) {
        setConversations(data.conversations)
      }
      setLoading(false)
    } catch (err) {
      setError('Error cargando conversaciones')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-900 border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-white uppercase text-xs tracking-wider">Historial de Chats</h3>
        <button 
          onClick={loadConversations}
          className="text-gray-400 hover:text-white transition-colors"
          title="Refrescar"
        >
          🔄
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {conversations.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No hay conversaciones registradas.</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.chat_id}
              onClick={() => onSelect(conv.chat_id)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                selectedChatId === conv.chat_id 
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  selectedChatId === conv.chat_id ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {conv.chat_id.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium truncate text-sm">
                    {conv.chat_id.split('@')[0]}
                  </p>
                  <p className="text-[10px] opacity-60 truncate">
                    {conv.messages_count} mensajes • {new Date(conv.last_message * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
