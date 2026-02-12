import { useState, useEffect, useRef } from 'react'
import api from '../../api/client'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

export default function ChatView() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState('user-test-1')
  const [viewMode, setViewMode] = useState('user') // user, admin, non-whitelist
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Cargar historial al cambiar chatId
  useEffect(() => {
    loadHistory()
  }, [chatId])

  const loadHistory = async () => {
    try {
      const data = await api.getMemory(chatId)
      if (data.history) {
        // Transformar historial de DB al formato de UI
        const formattedMessages = data.history.map(msg => ({
          text: msg.content,
          isUser: msg.role === 'user',
          timestamp: msg.timestamp || new Date()
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleSendMessage = async (text) => {
    // Agregar mensaje del usuario inmediatamente
    const userMsg = { text, isUser: true, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Simular diferentes roles cambiando el prefijo del chatId si es necesario
      // Por ahora usamos el chatId tal cual
      
      let response
      if (text.startsWith('/')) {
        response = await api.executeCommand(chatId, text)
        const botMsg = { 
          text: typeof response.result === 'string' ? response.result : JSON.stringify(response.result, null, 2), 
          isUser: false, 
          timestamp: new Date() 
        }
        setMessages(prev => [...prev, botMsg])
      } else {
        response = await api.sendMessage(chatId, text)
        const botMsg = { 
          text: response.botResponse, 
          isUser: false, 
          timestamp: new Date() 
        }
        setMessages(prev => [...prev, botMsg])
      }

    } catch (error) {
      const errorMsg = { 
        text: `Error: ${error.response?.data?.error || error.message}`, 
        isUser: false, 
        timestamp: new Date() 
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (confirm('¿Estás seguro de borrar el historial de este chat?')) {
      try {
        await api.clearMemory(chatId)
        setMessages([])
      } catch (error) {
        alert('Error al borrar historial')
      }
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
      {/* Chat Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            AI
          </div>
          <div>
            <h3 className="font-medium text-white">Asistente Virtual</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              En línea
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('user')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'user' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              User
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'admin' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Admin
            </button>
          </div>
          
          <input 
            type="text" 
            value={chatId} 
            onChange={(e) => setChatId(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1 text-sm text-gray-300 w-32 focus:outline-none focus:border-primary-500"
            placeholder="Chat ID"
          />

          <button 
            onClick={handleClearHistory}
            className="text-gray-400 hover:text-red-400 transition-colors"
            title="Borrar historial"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} loading={loading} />
      <div ref={messagesEndRef} />

      {/* Input */}
      <MessageInput onSend={handleSendMessage} disabled={loading} />
    </div>
  )
}
