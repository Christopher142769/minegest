import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Ignorer l'erreur removeChild qui est souvent un faux positif
    if (error.name === 'NotFoundError' && error.message && error.message.includes('removeChild')) {
      console.warn('Ignoring removeChild error in getDerivedStateFromError');
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Ignorer spécifiquement l'erreur removeChild qui est souvent un faux positif
    if (error.name === 'NotFoundError' && error.message.includes('removeChild')) {
      console.warn('Ignoring removeChild error - this is often a React internal issue');
      // Ne pas mettre hasError à true pour cette erreur spécifique
      return;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '20px'
        }}>
          <h2>Une erreur s'est produite</h2>
          <p>Veuillez rafraîchir la page.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Rafraîchir
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
