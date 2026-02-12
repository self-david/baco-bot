import ConfigView from '../components/Config/ConfigView'

function ConfigPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Configuración</h2>
          <p className="text-gray-400">Personaliza el comportamiento y modelo del bot</p>
        </div>
      </div>

      <ConfigView />
    </div>
  )
}

export default ConfigPage
