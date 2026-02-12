export default function MessageList({ messages, loading, messagesEndRef }) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-4xl mb-2">👾</p>
          <p>Envía un mensaje para comenzar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.isUser
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-gray-800 text-gray-200 rounded-bl-none'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {msg.text}
            </p>
            <span className="text-xs opacity-50 mt-1 block">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      ))}
      
      {loading && (
        <div className="flex justify-start">
          <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  )
}
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.isUser
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-gray-800 text-gray-200 rounded-bl-none'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {msg.text}
            </p>
            <span className="text-xs opacity-50 mt-1 block">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      ))}
      
      {loading && (
        <div className="flex justify-start">
          <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        </div>
      )}
    </div>
  )
}
