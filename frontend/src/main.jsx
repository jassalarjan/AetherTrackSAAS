import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@/styles/index.css';
import '@/styles/animations.css';
import '@/styles/mobile-responsive.css';
import { registerSW } from 'virtual:pwa-register';

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