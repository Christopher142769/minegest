import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import AdminDashboard from './AdminDashboard';
import WelcomeGestionnaire from './WelcomeGestionnaire';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Vendeur');
  const [showWelcome, setShowWelcome] = useState(true);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setUserRole(loggedInUser.role);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} onRoleChange={setUserRole} />;
  }

  if (userRole === 'Gestionnaire') {
    if (showWelcome) {
      return <WelcomeGestionnaire onFinish={() => setShowWelcome(false)} />;
    }

    return (
      <>
        <AdminDashboard />
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
