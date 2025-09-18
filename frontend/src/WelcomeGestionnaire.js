import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
        setWelcomeMessage(
            <>
                Bienvenue <br className="d-block d-sm-none" /> Mr <span className="text-white">{message}</span>
            </>
        );
        const timer = setTimeout(() => {
            onFinish();
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="welcome-page-bg d-flex align-items-center justify-content-center min-vh-100 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="welcome-container"
            >
                <div className="row g-4 mb-4 justify-content-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="col-auto text-center animated-icon-container"
                    >
                        <CustomShield className="icon-pulse-grow" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.8 }}
                        className="col-auto text-center animated-icon-container"
                    >
                        <CustomCrown className="icon-float-shine" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.8 }}
                        className="col-auto text-center animated-icon-container"
                    >
                        <CustomUser className="icon-rotate-glow" />
                    </motion.div>
                </div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="welcome-title text-center"
                >
                    {welcomeMessage}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    className="welcome-subtitle text-center mt-3"
                >
                    Votre espace de gestion premium est prêt.
                </motion.p>

                <div className="d-flex justify-content-center mt-5">
                    <div className="loading-spinner"></div>
                </div>
            </motion.div>
        </div>
    );
}