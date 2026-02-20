import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import ErrorBoundary from './ErrorBoundary';
import AdminDashboard from './AdminDashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Vendeur');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setUserRole(loggedInUser.role);
    // Délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  };
  
  const handleRegisterSuccess = () => {
      setIsRegistering(false);
  };

  useEffect(() => {
    // Réinitialiser isReady quand l'utilisateur change
    if (user) {
      setIsReady(false);
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [user]);

  if (!user) {
    return isRegistering ? (
      <RegisterScreen onRegisterSuccess={handleRegisterSuccess} onBackToLogin={() => setIsRegistering(false)} />
    ) : (
      <LoginScreen onLogin={handleLogin} onRoleChange={setUserRole} onGoToRegister={() => setIsRegistering(true)} />
    );
  }

  // Chargement direct d'AdminDashboard après connexion (WelcomeGestionnaire désactivé)
  if (userRole === 'Gestionnaire') {
    if (!isReady) {
      return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
    }
    
    return (
      <ErrorBoundary>
        <AdminDashboard key={`admin-dashboard-${user?.id || 'default'}`} user={user} />
      </ErrorBoundary>
    );
  }

  // Autres rôles si besoin
  return (
    <div key="other-role">
      <h1>Bienvenue {user.name}</h1>
      <ToastContainer />
    </div>
  );
}

export default App;
