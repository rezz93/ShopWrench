import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-check for Service Worker updates and reload when a new release takes control
const isProd = Boolean((import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD);
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && isProd) {
  navigator.serviceWorker.ready.then((reg) => {
    // Check for updates on focus and tab visibility change
    window.addEventListener('focus', () => {
      reg.update().catch(() => {});
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        reg.update().catch(() => {});
      }
    });
    // Periodic background check every 10 minutes
    setInterval(() => {
      reg.update().catch(() => {});
    }, 10 * 60 * 1000);
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
