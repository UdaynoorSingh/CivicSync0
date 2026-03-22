import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-splash-gradient flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="mb-6"
      >
        <span className="text-8xl">🔍</span>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-6xl font-black text-white font-display mb-3">
          404
        </h1>
        <p className="text-xl text-blue-200 mb-2">Page Not Found</p>
        <p className="text-blue-300/70 text-sm mb-8 max-w-xs">
          This page doesn't exist or has been moved. Return to the kiosk home
          screen.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex gap-3"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 border border-white/20 text-white font-semibold hover:bg-white/25 transition-colors"
        >
          <ArrowLeft size={18} /> Go Back
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#1E3A5F] font-bold hover:bg-blue-50 transition-colors shadow-lg"
        >
          <Home size={18} /> Home
        </button>
      </motion.div>
    </div>
  );
}
