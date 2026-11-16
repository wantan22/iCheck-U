import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { IS_ARTIFACT, IS_NATIVE } from './utils/env.js';
import App from './App.jsx';
import './index.css';
import { useStore } from './store/useStore.js';
import { unlockAudio } from './utils/alerts.js';

// Browsers only allow sound after a tap: unlock the alarm on the first tap anywhere.
window.addEventListener('pointerdown', unlockAudio, { once: true });

// Dev-only handle for debugging the demo state from the browser console.
if (import.meta.env.DEV) window.__ns = useStore;

// Offline support: the service worker caches the app so it opens with no internet.
// Only in production builds — in dev it would fight with hot reload.
if (import.meta.env.PROD && !IS_ARTIFACT && !IS_NATIVE && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        const ready = () => useStore.getState().setOfflineReady(true);
        if (reg.active) ready();
        navigator.serviceWorker.ready.then(ready);
      },
      () => useStore.getState().setOfflineReady(false),
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {IS_ARTIFACT ? <MemoryRouter><App /></MemoryRouter> : <BrowserRouter><App /></BrowserRouter>}
  </React.StrictMode>,
);
