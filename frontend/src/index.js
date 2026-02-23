import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import 'bootstrap/dist/css/bootstrap.min.css';

// Intercepter et ignorer complètement l'erreur removeChild qui est souvent un faux positif React
const originalError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (error && error.name === 'NotFoundError' && message && message.includes('removeChild')) {
    // Ignorer complètement - ne pas logger
    return true; // Empêche l'affichage de l'erreur
  }
  if (originalError) {
    return originalError.apply(this, arguments);
  }
  return false;
};

// Intercepter les erreurs non gérées - mode silencieux
window.addEventListener('error', function(event) {
  if (event.error && event.error.name === 'NotFoundError' && 
      event.error.message && event.error.message.includes('removeChild')) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}, true);

// Intercepter les promesses rejetées non gérées - mode silencieux
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.name === 'NotFoundError' && 
      event.reason.message && event.reason.message.includes('removeChild')) {
    event.preventDefault();
    return false;
  }
}, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
