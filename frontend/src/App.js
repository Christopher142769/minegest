import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen'; // Importez le nouveau composant
import AdminDashboard from './AdminDashboard';
import WelcomeGestionnaire from './WelcomeGestionnaire';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Vendeur');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false); // Nouvel état pour l'inscription
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setUserRole(loggedInUser.role);
  };
  
  const handleRegisterSuccess = () => {
      setIsRegistering(false); // Retourne à l'écran de connexion après l'inscription
  };

  const handleWelcomeFinish = useCallback(() => {
    setIsTransitioning(true);
    // Délai plus long pour permettre le démontage complet de WelcomeGestionnaire
    setTimeout(() => {
      setShowWelcome(false);
      // Délai supplémentaire avant de monter AdminDashboard
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  }, []);

  if (!user) {
    return isRegistering ? (
      <RegisterScreen onRegisterSuccess={handleRegisterSuccess} onBackToLogin={() => setIsRegistering(false)} />
    ) : (
      <LoginScreen onLogin={handleLogin} onRoleChange={setUserRole} onGoToRegister={() => setIsRegistering(true)} />
    );
  }

  // Le reste de votre code reste le même...
  if (userRole === 'Gestionnaire') {
    if (showWelcome) {
      return <WelcomeGestionnaire key="welcome-screen" onFinish={handleWelcomeFinish} />;
    }
    
    if (isTransitioning) {
      return <div key="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
    }

    return <AdminDashboard key={`admin-dashboard-${user?.id || 'default'}`} user={user} />;
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
