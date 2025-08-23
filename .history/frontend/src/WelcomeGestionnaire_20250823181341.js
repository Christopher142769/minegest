import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

// SVG personnalisé pour un look plus exclusif
const CustomCrown = () => (
  <svg className="w-16 h-16 text-yellow-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L2 9h4v13h12V9h4L12 2zm0 2.828L18.172 9H5.828L12 4.828zM8 11h8v9H8v-9zm2 2v5h4v-5h-4z"/>
  </svg>
);

const CustomShield = () => (
  <svg className="w-16 h-16 text-green-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15.5l-3.5-3.5 1.41-1.41L11 14.67l4.59-4.58 1.41 1.41-6 6z"/>
  </svg>
);

const CustomUser = () => (
  <svg className="w-16 h-16 text-indigo-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 4a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4zm0 2c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2zm-2 9v1h4v-1c0-2.209-1.791-4-4-4s-4 1.791-4 4v1h2v-1c0-1.105.895-2 2-2s2 .895 2 2zM3 17h18c-1.11-2.22-3.41-4-6-4H9c-2.59 0-4.89 1.78-6 4z"/>
  </svg>
);

export default function WelcomeGestionnaire({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 5000); // 5 secondes
    return () => clearTimeout(timer);
  }, [onFinish]);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
        when: 'beforeChildren',
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
      {/* Effet de fond subtil pour un look premium */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-gray-950 to-gray-950 animate-pulse-slow-1" />
      </div>
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900 via-gray-950 to-gray-950 animate-pulse-slow-2" />
      </div>
      
      {/* Conteneur principal avec des animations fluides */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 bg-white/5 backdrop-blur-3xl shadow-2xl rounded-3xl p-8 sm:p-14 flex flex-col items-center max-w-lg w-full border border-white/10 transform transition-all duration-300 hover:scale-105"
      >
        <motion.div variants={itemVariants} className="flex gap-8 mb-8 items-end">
          <CustomShield className="animate-fade-in-up transition-transform duration-500 hover:scale-110" />
          <CustomCrown className="animate-fade-in-up transition-transform duration-500 hover:scale-110" />
          <CustomUser className="animate-fade-in-up transition-transform duration-500 hover:scale-110" />
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl font-extrabold text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg leading-tight"
        >
          <span className="text-white">Bienvenue</span> <br className="sm:hidden" /> Christian GUIDIBI
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-center text-white/70 mt-4 text-xl sm:text-2xl font-light"
        >
          Votre espace de gestion premium est prêt
        </motion.p>
      </motion.div>
    </div>
  );
}