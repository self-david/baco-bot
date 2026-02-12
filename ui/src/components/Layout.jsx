import { NavLink } from 'react-router-dom'

function Layout({ children }) {
  const navItems = [
    { path: '/chat', label: '💬 Chat', icon: '💬' },
    { path: '/config', label: '⚙️ Configuración', icon: '⚙️' },
    { path: '/memory', label: '🧠 Memoria', icon: '🧠' },
    { path: '/dashboard', label: '📊 Dashboard', icon: '📊' }
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Baco Bot</h1>
              <p className="text-sm text-gray-400">Interfaz de Pruebas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">API Conectada</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-3 font-medium transition-colors relative ${
                  isActive
                    ? 'text-primary-400 border-b-2 border-primary-500'
                    : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 bg-gray-950">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>Baco Bot UI v1.0.0 - Powered by Ollama & React</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
