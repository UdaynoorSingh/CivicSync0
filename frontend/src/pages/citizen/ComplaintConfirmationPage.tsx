import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Home } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import MascotGuide from "../../components/shared/MascotGuide";

export default function ComplaintConfirmationPage() {
  const { state } = useLocation();
  const { refNo, category, location } = (state ?? {}) as {
    refNo?: string;
    category?: string;
    location?: string;
  };
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resolutionDate = new Date(
    Date.now() + 14 * 86400000,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
      >
        <div className="flex items-center justify-center mx-auto mb-2">
          <MascotGuide emotion="celebration" size="lg" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-800 font-display mb-1">
          {t("complaintFiled")}
        </h1>
        <p className="text-gray-500 text-sm">
          {t("weWillLookInto")}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-5 mb-6 space-y-3"
      >
        {[
          [t("complaintId"), refNo ?? "CMP-2026-XXXX"],
          [t("complaintCategory"), category ?? "Civic Issue"],
          [t("complaintLocation"), location ?? "Chandigarh"],
          [t("estimatedResolution"), resolutionDate],
          [t("complaintStatus"), t("statusPendingReview")],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0"
          >
            <span className="text-gray-500">{String(label)}</span>
            <span className="font-semibold text-gray-800 text-right max-w-[55%]">
              {String(val)}
            </span>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="w-full max-w-sm space-y-3"
      >
        <button
          onClick={() => navigate("/citizen/track")}
          className="w-full py-3 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] font-semibold flex items-center gap-2 justify-center hover:bg-blue-50"
        >
          <Search size={18} /> {t("trackComplaint")}
        </button>
        <button
          onClick={() => navigate("/citizen")}
          className="w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-semibold flex items-center gap-2 justify-center hover:bg-[#163050]"
        >
          <Home size={18} /> {t("goHome")}
        </button>
      </motion.div>
    </div>
  );
}
