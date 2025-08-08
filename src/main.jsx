
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'

// Register service worker for PWA + push
registerSW({ immediate: true })

const root = createRoot(document.getElementById('root'))
root.render(<App />)
