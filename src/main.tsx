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
import App from './App';
import { installGrain } from './lib/grain';

installGrain();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
