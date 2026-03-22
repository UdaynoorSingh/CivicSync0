import { motion } from "framer-motion";
import { useTranslation } from "../../lib/i18n";

interface Props {
  countdown: number;
  onDismiss: () => void;
}

export default function IdleOverlay({ countdown, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
      >
        {/* Countdown ring */}
        <div className="relative w-20 h-20 mx-auto mb-5">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#DC2626"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / 15)}`}
              className="transition-all duration-1000"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-red-600">
            {countdown}
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {t("stillThere")}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {t("sessionEnds")} <strong>{countdown}s</strong>
        </p>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-semibold text-base hover:bg-[#163050] transition-colors btn-touch"
        >
          {t("imHere")}
        </button>
      </motion.div>
    </motion.div>
  );
}
