import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

document.documentElement.dataset.theme =
  localStorage.getItem('schedule3d-theme') === 'light' ? 'light' : 'dark'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
