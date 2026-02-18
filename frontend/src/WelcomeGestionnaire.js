import React, { useEffect, useState } from 'react';
import './WelcomePage.css';

// SVG personnalisé pour un look plus exclusif et pro
const CustomCrown = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon-gold">
        <path d="M12 2L2 9h4v13h12V9h4L12 2zm0 2.828L18.172 9H5.828L12 4.828zM8 11h8v9H8v-9zm2 2v5h4v-5h-4z"/>
    </svg>
);

const CustomShield = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon-green">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15.5l-3.5-3.5 1.41-1.41L11 14.67l4.59-4.58 1.41 1.41-6 6z"/>
    </svg>
);

const CustomUser = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon-indigo">
        <path d="M12 4a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4zm0 2c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2zm-2 9v1h4v-1c0-2.209-1.791-4-4-4s-4 1.791-4 4v1h2v-1c0-1.105.895-2 2-2s2 .895 2 2zM3 17h18c-1.11-2.22-3.41-4-6-4H9c-2.59 0-4.89 1.78-6 4z"/>
    </svg>
);

export default function WelcomeGestionnaire({ onFinish }) {
    const [welcomeMessage, setWelcomeMessage] = useState(null);

    useEffect(() => {
        let isMounted = true;
        let timer = null;
        
        const initializeWelcome = () => {
            const user = JSON.parse(localStorage.getItem('user'));
            
            let message = '';
            if (user) {
                // Logique spécifique pour l'administrateur avec le nom complet
                if (user.role === 'Gestionnaire' && user.username === 'admin') {
                    message = 'Christian GUIDIBI';
                } else {
                    // Logique pour tous les autres utilisateurs (gestionnaires, etc.)
                    message = user.username;
                }
            }
            
            if (isMounted) {
                setWelcomeMessage(
                    <>
                        Bienvenue <br className="d-block d-sm-none" /> Mr <span className="text-white">{message}</span>
                    </>
                );
            }
            
            timer = setTimeout(() => {
                if (isMounted && onFinish) {
                    onFinish();
                }
            }, 5000);
        };
        
        initializeWelcome();
        
        return () => {
            isMounted = false;
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [onFinish]);

    return (
        <div className="welcome-page-bg d-flex align-items-center justify-content-center min-vh-100 p-4">
            <div className="welcome-container">
                <div className="row g-4 mb-4 justify-content-center">
                    <div className="col-auto text-center animated-icon-container">
                        <CustomShield className="icon-green" />
                    </div>
                    <div className="col-auto text-center animated-icon-container">
                        <CustomCrown className="icon-gold" />
                    </div>
                    <div className="col-auto text-center animated-icon-container">
                        <CustomUser className="icon-indigo" />
                    </div>
                </div>

                <h1 className="welcome-title text-center">
                    {welcomeMessage}
                </h1>

                <p className="welcome-subtitle text-center">
                    Votre espace de gestion premium est prêt.
                </p>

                <div className="d-flex justify-content-center mt-5">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        </div>
    );
}