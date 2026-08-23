import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/ToastProvider';
import { CompanyProvider } from './context/CompanyContext';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './modern-theme.css';
import './liquid-glass.css';
import './dashboard-polish.css';
import './i18n';
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights();

// Automatically reload if a new version was deployed and dynamic chunk load failed
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = Number(sessionStorage.getItem('last_vite_preload_reload') || '0');
  if (Date.now() - lastReload > 10000) {
    sessionStorage.setItem('last_vite_preload_reload', String(Date.now()));
    console.warn('Vite preload error detected. Reloading to get latest application version...');
    window.location.reload();
  }
});


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <CompanyProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </CompanyProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
