import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { initializeCollectionState } from './state/collectionState'
import { initializeSharedStorage } from './lib/sharedStorage'
import { StorageNotice } from './kit/StorageNotice'

const root = createRoot(document.getElementById('root')!)
const Router = import.meta.env.BASE_URL === '/' ? BrowserRouter : HashRouter

async function start() {
  try {
    await initializeSharedStorage()
    initializeCollectionState()
    root.render(
      <StrictMode>
        <Router>
          <App />
          <StorageNotice />
        </Router>
      </StrictMode>,
    )
  } catch {
    root.render(
      <aside role="alert" className="storage-notice">
        Could not load shared data from MiSTer.
        <button onClick={() => void start()}>Retry</button>
      </aside>,
    )
  }
}

void start()
