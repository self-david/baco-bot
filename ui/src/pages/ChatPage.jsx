import ChatView from '../components/Chat/ChatView'

function ChatPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Chat de Prueba</h2>
        <p className="text-gray-400">Simula conversaciones y comandos con el bot.</p>
      </div>

      <ChatView />
    </div>
  )
}

export default ChatPage
