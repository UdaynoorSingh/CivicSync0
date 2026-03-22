import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "../../lib/i18n";

export default function SplashScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Auto-advance after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => navigate("/language"), 10000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-splash-gradient flex flex-col items-center justify-between py-16 px-6">
      {/* Logo + Brand */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Animated globe icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="white"
                strokeWidth="2"
                opacity="0.6"
              />
              <ellipse
                cx="24"
                cy="24"
                rx="10"
                ry="20"
                stroke="white"
                strokeWidth="2"
                opacity="0.6"
              />
              <line
                x1="4"
                y1="24"
                x2="44"
                y2="24"
                stroke="white"
                strokeWidth="2"
                opacity="0.6"
              />
              <line
                x1="24"
                y1="4"
                x2="24"
                y2="44"
                stroke="white"
                strokeWidth="2"
                opacity="0.4"
              />
            </svg>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl font-black text-white font-display mb-4"
        >
          CivicSync Kiosk
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-lg text-blue-100 max-w-sm leading-relaxed mb-12"
        >
          {t("splashTagline")}
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/language")}
          className="px-10 py-4 rounded-2xl bg-white text-civic-navy font-bold text-lg shadow-xl hover:bg-blue-50 transition-colors"
        >
          {t("touchToBegin")}
        </motion.button>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="text-center text-white/60 text-sm"
      >
        <p>{t("govtInitiative")}</p>
        <p className="mt-0.5 text-white/40">{t("govtHindi")}</p>
      </motion.div>
    </div>
  );
}
