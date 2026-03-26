import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('race-hub-root') ?? document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
