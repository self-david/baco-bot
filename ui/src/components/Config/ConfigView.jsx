import { useState, useEffect } from 'react'
import api from '../../api/client'
import ModelSelector from './ModelSelector'
import PersonalityEditor from './PersonalityEditor'

export default function ConfigView() {
  const [config, setConfig] = useState({
    modelo: '',
    personalidad: '',
    whitelist: []
  })
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [configData, modelsData] = await Promise.all([
        api.getConfig(),
        api.getModels()
      ])
      
      setConfig(configData)
      setModels(modelsData.models || [])
    } catch (error) {
      console.error('Error loading config:', error)
      setMessage({ type: 'error', text: 'Error cargando configuración' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      await api.updateConfig({
        modelo: config.modelo,
        personalidad: config.personalidad
      })
      setMessage({ type: 'success', text: 'Configuración guardada correctamente' })
      
      // Ocultar mensaje después de 3s
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error guardando configuración' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Feedback Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <ModelSelector 
          models={models} 
          selectedModel={config.modelo} 
          onChange={(val) => setConfig(prev => ({ ...prev, modelo: val }))}
          loading={loading || saving}
        />
        
        <PersonalityEditor 
          personality={config.personalidad} 
          onChange={(val) => setConfig(prev => ({ ...prev, personalidad: val }))}
          loading={loading || saving}
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="btn-primary min-w-[150px] flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Guardando...
            </>
          ) : (
            <>
              💾 Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  )
}
