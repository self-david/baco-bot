export default function ModelSelector({ models, selectedModel, onChange, loading }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
          🧠
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Modelo de IA</h3>
          <p className="text-sm text-gray-400">Selecciona el cerebro del bot</p>
        </div>
      </div>

      <div className="relative">
        <select
          value={selectedModel || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="" disabled>Seleccionar modelo...</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          ▼
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
        <p>💡 El modelo seleccionado debe estar descargado en Ollama (`ollama pull {selectedModel || 'modelo'}`).</p>
      </div>
    </div>
  )
}
