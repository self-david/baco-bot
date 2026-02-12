import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ChatPage from './pages/ChatPage'
import ConfigPage from './pages/ConfigPage'
import MemoryPage from './pages/MemoryPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
