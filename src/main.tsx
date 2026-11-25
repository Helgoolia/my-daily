import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Viewer } from './components/Viewer.tsx'
import { startClarity } from './lib/clarity'

startClarity()

// A shared week opens the read-only viewer: the snapshot lives in the link after #s=
const shared = location.hash.startsWith('#s=') ? location.hash.slice(3) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shared ? <Viewer code={shared} /> : <App />}
  </StrictMode>,
)
