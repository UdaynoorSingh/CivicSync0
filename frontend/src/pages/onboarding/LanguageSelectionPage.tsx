import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore, type Language } from "../../store/sessionStore";
import { useTranslation } from "../../lib/i18n";

const languages: { code: Language; name: string; sub: string }[] = [
  { code: "en", name: "English", sub: "WELCOME" },
  { code: "hi", name: "हिंदी", sub: "स्वागत है" },
  { code: "as", name: "অসমীয়া", sub: "স্বাগতম" },
];

export default function LanguageSelectionPage() {
  const { language, setLanguage } = useSessionStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setTimeout(() => navigate("/login"), 350);
  };

  return (
    <div className="min-h-screen bg-splash-gradient flex flex-col items-center justify-center px-6 py-12">
      {/* Icon */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-16 h-16 rounded-full bg-white/15 border border-white/20 flex items-center justify-center mb-8"
      >
        <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="white"
            strokeWidth="2.5"
            opacity="0.8"
          />
          <ellipse
            cx="24"
            cy="24"
            rx="10"
            ry="20"
            stroke="white"
            strokeWidth="2.5"
            opacity="0.8"
          />
          <line
            x1="4"
            y1="24"
            x2="44"
            y2="24"
            stroke="white"
            strokeWidth="2.5"
            opacity="0.8"
          />
        </svg>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-4xl font-black text-white font-display mb-2"
      >
        CivicSync Kiosk
      </motion.h1>
      <motion.p
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-blue-200 text-base mb-10"
      >
        {t("splashTagline")}
      </motion.p>

      {/* Language Cards */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-5 mb-10"
      >
        {languages.map(({ code, name, sub }, i) => {
          const isSelected = language === code;
          return (
            <motion.button
              key={code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.1 }}
              whileHover={!isSelected ? { scale: 1.06, y: -3 } : {}}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(code)}
              className={`
                w-24 h-30 rounded-2xl flex flex-col items-center justify-center
                text-center transition-all duration-200 cursor-pointer select-none
                ${
                  isSelected
                    ? "bg-white text-[#1E3A5F] shadow-2xl ring-4 ring-blue-300/50 scale-105"
                    : "bg-white/10 text-white border border-white/25 hover:bg-white/20 hover:border-white/40"
                }
              `}
            >
              <p
                className={`text-xl font-bold leading-tight ${isSelected ? "text-[#1E3A5F]" : "text-white"}`}
              >
                {name}
              </p>
              <p
                className={`text-[11px] mt-1.5 tracking-wide font-medium ${isSelected ? "text-blue-500" : "text-white/60"}`}
              >
                {sub}
              </p>

              {/* Checkmark slot — always occupies space to keep uniform height */}
              <div className="mt-3 w-7 h-7 flex items-center justify-center mx-auto">
                {isSelected ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 12 12"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                ) : (
                  /* Empty placeholder so height stays constant */
                  <div className="w-7 h-7 rounded-full border border-white/20" />
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Pulsing tap hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col items-center gap-2"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white text-xs tracking-widest uppercase"
        >
          {t("selectLanguage")} • ভাষা বাছনি কৰক • भाषा चुनें
        </motion.p>
      </motion.div>
    </div>
  );
}
