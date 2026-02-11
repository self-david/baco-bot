const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib')
const { OllamaEmbeddings } = require('@langchain/ollama')
const { Document } = require('@langchain/core/documents')
const fs = require('fs')
const path = require('path')

const VECTOR_STORE_PATH = path.join(__dirname, '..', 'vector_store')

class VectorMemory {
    constructor() {
        this.vectorStore = null
        this.embeddings = new OllamaEmbeddings({
            model: 'nomic-embed-text', // Modelo recomendado, rápido y ligero
            baseUrl: 'http://127.0.0.1:11434',
        })
    }

    async init() {
        if (fs.existsSync(VECTOR_STORE_PATH)) {
            console.log('📂 Cargando vector store existente...')
            this.vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, this.embeddings)
        } else {
            console.log('🆕 Creando nuevo vector store...')
            // Inicializar con un documento dummy para crear la estructura
            this.vectorStore = await HNSWLib.fromDocuments(
                [new Document({ pageContent: "Inicialización de memoria", metadata: { type: "system" } })],
                this.embeddings
            )
            await this.save()
        }
    }

    async save() {
        if (this.vectorStore) {
            await this.vectorStore.save(VECTOR_STORE_PATH)
        }
    }

    async addMemory(text, metadata = {}) {
        if (!this.vectorStore) await this.init()
        await this.vectorStore.addDocuments([
            new Document({ 
                pageContent: text, 
                metadata: { ...metadata, timestamp: new Date().toISOString() } 
            })
        ])
        await this.save()
    }

    async searchMemories(query, k = 3) {
        if (!this.vectorStore) await this.init()
        const results = await this.vectorStore.similaritySearch(query, k)
        return results.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata
        }))
    }
}

// Singleton
const vectorMemory = new VectorMemory()

module.exports = vectorMemory
