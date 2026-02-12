import DashboardView from '../components/Dashboard/DashboardView'

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard Central</h2>
          <p className="text-gray-400">Estado del sistema y métricas de uso en tiempo real</p>
        </div>
      </div>

      <DashboardView />
    </div>
  )
}

export default DashboardPage
