import React, { useState, Suspense } from 'react';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Chargement asynchrone de AdminDashboard pour éviter les conflits de démontage
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Vendeur');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setUserRole(loggedInUser.role);
  };
  
  const handleRegisterSuccess = () => {
      setIsRegistering(false);
  };

  if (!user) {
    return isRegistering ? (
      <RegisterScreen onRegisterSuccess={handleRegisterSuccess} onBackToLogin={() => setIsRegistering(false)} />
    ) : (
      <LoginScreen onLogin={handleLogin} onRoleChange={setUserRole} onGoToRegister={() => setIsRegistering(true)} />
    );
  }

  // Chargement direct d'AdminDashboard après connexion (WelcomeGestionnaire désactivé)
  if (userRole === 'Gestionnaire') {
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>}>
        <AdminDashboard key={`admin-dashboard-${user?.id || 'default'}`} user={user} />
      </Suspense>
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
