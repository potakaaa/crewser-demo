import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/fraunces/latin-500.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/syne/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/device.css';
import './styles/app.css';
import './styles/dashboard.css';
import './styles/timeline.css';
import './styles/screens.css';
import './styles/notifications.css';
import './styles/nav-home.css';
import './styles/note-detail.css';
import bebasUrl from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url';
import App from './App';
import { installGrain } from './lib/grain';
import { useDemo } from './store';

// Poster (Bebas Neue) is the default font theme: start fetching it now instead of when the first headline renders.
// Only when it will be used, or the browser warns about an unused preload.
if (useDemo.getState().fontTheme === 'poster') {
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'font';
  preload.type = 'font/woff2';
  preload.crossOrigin = 'anonymous';
  preload.href = bebasUrl;
  document.head.appendChild(preload);
}

installGrain();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
