import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { initializeCollectionState } from './state/collectionState'
import { StorageNotice } from './kit/StorageNotice'

const root = createRoot(document.getElementById('root')!)
initializeCollectionState()
const content = <><App /><StorageNotice /></>
root.render(
  <StrictMode>
    {import.meta.env.BASE_URL === '/' ? <BrowserRouter>{content}</BrowserRouter> : <HashRouter>{content}</HashRouter>}
  </StrictMode>,
)
