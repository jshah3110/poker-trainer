import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js', {
        scope: import.meta.env.BASE_URL,
      })
      .then(reg => {
        console.log('[SW] Registered, scope:', reg.scope);
      })
      .catch(err => {
        console.warn('[SW] Registration failed:', err);
      });
  });
}
