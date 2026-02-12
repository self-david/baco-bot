export default function PersonalityEditor({ personality, onChange, loading }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
          🎭
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Personalidad</h3>
          <p className="text-sm text-gray-400">Define cómo se comporta el bot</p>
        </div>
      </div>

      <textarea
        value={personality || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        rows={6}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 resize-none font-mono text-sm leading-relaxed"
        placeholder="Ej: Eres un asistente útil y amable..."
      />

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onChange("Eres un asistente sarcástico y divertido que hace bromas.")}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
        >
          🎭 Sarcástico
        </button>
        <button
          onClick={() => onChange("Eres un experto técnico muy formal y preciso.")}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
        >
          👔 Formal
        </button>
        <button
          onClick={() => onChange("Actúa como un pirata en todas tus respuestas.")}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
        >
          🏴‍☠️ Pirata
        </button>
      </div>
    </div>
  )
}
