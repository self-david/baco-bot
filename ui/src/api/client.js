import axios from 'axios'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const api = {
  // Chat
  sendMessage: async (chatId, message) => {
    const response = await apiClient.post('/chat', { chatId, message })
    return response.data
  },

  // Commands
  executeCommand: async (chatId, command) => {
    const response = await apiClient.post('/command', { chatId, command })
    return response.data
  },

  // Config (TODO: implementar en el backend)
  getConfig: async () => {
    const response = await apiClient.get('/config')
    return response.data
  },

  updateConfig: async (config) => {
    const response = await apiClient.post('/config', config)
    return response.data
  },

  // Models (TODO: implementar en el backend)
  getModels: async () => {
    const response = await apiClient.get('/models')
    return response.data
  },

  // Memory (TODO: implementar en el backend)
  getMemory: async (chatId) => {
    const response = await apiClient.get(`/memory/${chatId}`)
    return response.data
  },

  clearMemory: async (chatId) => {
    const response = await apiClient.delete(`/memory/${chatId}`)
    return response.data
  },

  getConversations: async () => {
    const response = await apiClient.get('/conversations')
    return response.data
  },

  getStats: async () => {
    const response = await apiClient.get('/stats')
    return response.data
  },

  getMemories: async (chatId) => {
    const response = await apiClient.get(`/memories/${chatId}`)
    return response.data
  }
}

export default api
