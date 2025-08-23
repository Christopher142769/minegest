import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Crown, UserCog } from 'lucide-react';

export default function WelcomeGestionnaire({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 5000); // 5 secondes avant de passer à AdminDashboard
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl p-8 sm:p-12 flex flex-col items-center max-w-lg w-full border border-white/20"
      >
        <motion.div
          className="flex gap-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <Crown className="text-yellow-400 w-12 h-12 drop-shadow-lg animate-bounce" />
          <ShieldCheck className="text-green-400 w-12 h-12 drop-shadow-lg animate-pulse" />
          <UserCog className="text-blue-400 w-12 h-12 drop-shadow-lg animate-spin-slow" />
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl font-extrabold text-center bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent drop-shadow-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Bienvenue <span className="font-black">Christian GUIDIBI</span>
        </motion.h1>

        <motion.p
          className="text-center text-white/80 mt-4 text-lg sm:text-xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          Accédez à votre espace de gestion premium
        </motion.p>

        <motion.div
          className="absolute w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -z-10"
          initial={{ scale: 0 }}
          animate={{ scale: [0.5, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}
