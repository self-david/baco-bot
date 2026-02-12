import { useState, useRef, useEffect } from 'react'

export default function MessageInput({ onSend, disabled }) {
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message)
      setMessage('')
      // Pequeño timeout para asegurar que el DOM se actualice si es necesario, 
      // aunque el useEffect por [disabled] debería bastar al terminar el loading.
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 bg-gray-900">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-gray-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 placeholder-gray-500"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3 font-medium transition-colors"
        >
          Enviar
        </button>
      </div>
    </form>
  )
}
