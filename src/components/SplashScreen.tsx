import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isAssembled, setIsAssembled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAssembled(true);
    }, 500);

    const exitTimer = setTimeout(() => {
      onComplete();
    }, 3500); // 2.5s intro + 1s buffer/transition

    return () => {
      clearTimeout(timer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="fixed inset-0 z-[100] bg-[#0c0c0c] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Logo Assembly Stage */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Ancient Stone Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 border-2 border-amber-900/20 rounded-full"
        />
        
        {/* Holographic HUD Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.2, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-[-20px] border border-cyan-500/10 rounded-full border-dashed"
        />

        {/* The Relic Logo */}
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]">
          {/* Arindama Spear (Left) */}
          <motion.path
            d="M60 160 L100 40 L110 70 L70 170 Z"
            fill="url(#goldGradient)"
            initial={{ pathLength: 0, opacity: 0, y: 20 }}
            animate={{ pathLength: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          />
          
          {/* Ka-Laung Quill (Right) */}
          <motion.path
            d="M140 160 L100 40 L90 70 L130 170 Z"
            fill="url(#goldGradient)"
            initial={{ pathLength: 0, opacity: 0, y: 20 }}
            animate={{ pathLength: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4 }}
          />

          {/* Central Core */}
          <motion.circle
            cx="100"
            cy="100"
            r="15"
            fill="url(#coreGradient)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 1 }}
          />

          {/* Definitions */}
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#F9E076" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <radialGradient id="coreGradient">
              <stop offset="0%" stopColor="#00FFFF" />
              <stop offset="100%" stopColor="#008B8B" />
            </radialGradient>
          </defs>
        </svg>

        {/* Scanning Line */}
        <motion.div
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-[1px] bg-cyan-400/30 shadow-[0_0_10px_rgba(0,255,255,0.5)] z-10"
        />
      </div>

      {/* Text Elements */}
      <div className="mt-12 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="text-4xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 uppercase"
        >
          Khetra Ai
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1, delay: 2 }}
          className="mt-2 text-[10px] uppercase tracking-[0.4em] text-white font-medium"
        >
          The Future of Ancient Wisdom
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1, delay: 2.5 }}
          className="mt-6 text-[9px] uppercase tracking-[0.2em] text-amber-200/60 font-medium"
        >
          ဖန်တီးသူ MinThitSarAung
        </motion.p>
      </div>

      {/* Loading Bar */}
      <div className="absolute bottom-20 w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-amber-500 to-cyan-500"
        />
      </div>
    </motion.div>
  );
}
