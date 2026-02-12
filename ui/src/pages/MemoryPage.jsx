import MemoryView from '../components/Memory/MemoryView'

function MemoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Memoria</h2>
          <p className="text-gray-400">Visualiza y administra el historial de conversaciones guardadas</p>
        </div>
      </div>

      <MemoryView />
    </div>
  )
}

export default MemoryPage
