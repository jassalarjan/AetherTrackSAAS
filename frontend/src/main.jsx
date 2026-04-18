import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@/styles/index.css';
import '@/styles/animations.css';
import '@/styles/mobile-layout.css';
import '@/styles/mobile-responsive.css';
import { registerSW } from 'virtual:pwa-register';
import { installFrontendTelemetry } from '@/shared/services/telemetry';

const updateViewportUnits = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const viewport = window.visualViewport;
  const width = viewport?.width || window.innerWidth;
  const height = viewport?.height || window.innerHeight;

  document.documentElement.style.setProperty('--app-vw', `${width * 0.01}px`);
  document.documentElement.style.setProperty('--app-vh', `${height * 0.01}px`);
  document.documentElement.style.setProperty('--app-height', `${height}px`);
};

updateViewportUnits();
window.addEventListener('resize', updateViewportUnits, { passive: true });
window.addEventListener('orientationchange', updateViewportUnits, { passive: true });
window.visualViewport?.addEventListener('resize', updateViewportUnits, { passive: true });
installFrontendTelemetry();

// CONSOLE DISABLED FOR PRODUCTION - Enable for development/debugging
// Uncomment the code below to enable console in production
/*
if (typeof window !== 'undefined') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}
*/

// Register Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    // App is ready to work offline
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);