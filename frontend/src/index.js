import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import 'bootstrap/dist/css/bootstrap.min.css';

// Intercepter et ignorer l'erreur removeChild qui est souvent un faux positif React
const originalError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (error && error.name === 'NotFoundError' && message && message.includes('removeChild')) {
    console.warn('Ignoring removeChild error - this is often a React internal issue');
    return true; // Empêche l'affichage de l'erreur
  }
  if (originalError) {
    return originalError.apply(this, arguments);
  }
  return false;
};

// Intercepter les erreurs non gérées
window.addEventListener('error', function(event) {
  if (event.error && event.error.name === 'NotFoundError' && 
      event.error.message && event.error.message.includes('removeChild')) {
    console.warn('Ignoring removeChild error from event listener');
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true);

// Intercepter les promesses rejetées non gérées
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.name === 'NotFoundError' && 
      event.reason.message && event.reason.message.includes('removeChild')) {
    console.warn('Ignoring removeChild error from unhandled rejection');
    event.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
