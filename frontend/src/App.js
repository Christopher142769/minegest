import React, { useState } from 'react';
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

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setUserRole(loggedInUser.role);
  };
  
  const handleRegisterSuccess = () => {
      setIsRegistering(false); // Retourne à l'écran de connexion après l'inscription
  };

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
      return <WelcomeGestionnaire onFinish={() => setShowWelcome(false)} />;
    }

    return (
      <>
        {/* L'utilisateur est passé au tableau de bord en tant que "prop" */}
        <AdminDashboard user={user} />
        <ToastContainer />
      </>
    );
  }

  // Autres rôles si besoin
  return (
    <>
      <h1>Bienvenue {user.name}</h1>
      <ToastContainer />
    </>
  );
}

export default App;
