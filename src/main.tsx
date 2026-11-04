import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { getSyncStatus, initializeSharedStorage, subscribeToSync, syncSharedStorage } from './lib/sharedStorage'

const root = createRoot(document.getElementById('root')!)

function StorageNotice() {
  const status = useSyncExternalStore(subscribeToSync, getSyncStatus)
  if (status !== 'offline' && status !== 'conflict') return null

  return (
    <aside role="alert" className="storage-notice">
      {status === 'conflict'
        ? 'Another device changed the same data. Reload to discard your unsynced changes.'
        : 'Changes have not been saved to MiSTer.'}
      {status === 'conflict'
        ? <button onClick={() => window.location.reload()}>Reload</button>
        : <button onClick={() => void syncSharedStorage()}>Retry</button>}
    </aside>
  )
}

async function start() {
  try {
    await initializeSharedStorage()
    root.render(
      <StrictMode>
        <BrowserRouter>
          <App />
          <StorageNotice />
        </BrowserRouter>
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
