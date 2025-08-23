import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import AdminDashboard from './AdminDashboard';
import GasoilDashboard from './GasoilDashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('Vendeur');

    const handleLogin = (loggedInUser) => {
        setUser(loggedInUser);
        setUserRole(loggedInUser.role);
    };

    if (!user) {
        return <LoginScreen onLogin={handleLogin} onRoleChange={setUserRole} />;
    }

    if (userRole === 'Gestionnaire') {
        return (
            <>
                <AdminDashboard />
                <ToastContainer />
            </>
        );
    }

    return (
        <>
            <GasoilDashboard user={user} />
            <ToastContainer />
        </>
    );
}

export default App;