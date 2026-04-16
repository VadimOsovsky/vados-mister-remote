import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const AUTH_KEY = 'mister_auth';
if (!localStorage.getItem(AUTH_KEY)) {
  const login = window.prompt('Login:');
  const password = login ? window.prompt('Password:') : null;
  const host = password ? window.prompt('MiSTer IP:') : null;
  if (login && password && host) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ login, password }));
    localStorage.setItem('mister_host', host);
  }
}

if (localStorage.getItem(AUTH_KEY)) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
