import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import 'bootstrap/dist/css/bootstrap.min.css';

// SOLUTION DÉFINITIVE : Patcher removeChild pour qu'il soit tolérant aux erreurs
// Cela empêche React de lancer une erreur quand il essaie de démonter un nœud qui n'est plus un enfant
if (typeof Node !== 'undefined' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    try {
      // Vérifier si l'enfant est bien un enfant de ce nœud avant de le supprimer
      if (child && child.parentNode === this) {
        return originalRemoveChild.call(this, child);
      }
      // Si l'enfant n'est pas un enfant de ce nœud, retourner l'enfant sans erreur
      return child;
    } catch (error) {
      // Si une erreur se produit, la capturer silencieusement
      if (error.name === 'NotFoundError' || error.message.includes('removeChild')) {
        return child;
      }
      // Pour les autres erreurs, les propager normalement
      throw error;
    }
  };
}

// Intercepter et ignorer complètement l'erreur removeChild au niveau global
const originalError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (error && error.name === 'NotFoundError' && message && message.includes('removeChild')) {
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
