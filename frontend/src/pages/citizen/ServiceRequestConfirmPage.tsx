import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, ArrowRight } from "lucide-react";
import MascotGuide from "../../components/shared/MascotGuide";
import { useTranslation } from "../../lib/i18n";

interface SRResult {
  referenceNumber: string;
  status: string;
  serviceType: string;
  requestType: string;
  department: string;
  district: string;
  createdAt: string;
}

const SERVICE_ICONS: Record<string, string> = {
  electricity: "⚡",
  water: "💧",
  gas: "🔥",
};

export default function ServiceRequestConfirmPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sr = state as SRResult | null;

  if (!sr) {
    navigate("/citizen/service/new", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex flex-col items-center justify-center px-6 py-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-full max-w-sm"
      >
        {/* Success mascot */}
        <div className="flex flex-col items-center mb-6">
          <MascotGuide
            emotion="celebration"
            message={t("mascotAppSubmitted")}
            size="lg"
            className="justify-center mb-3"
          />
          <h1 className="text-2xl font-black text-gray-800 text-center">
            {t("applicationSubmitted")}
          </h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            {t("srReceivedMsg")}
          </p>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5 space-y-3 text-sm">
          {/* Ref number highlight */}
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{t("referenceNumber")}</p>
            <p className="font-black text-lg text-[#1E3A5F] font-mono tracking-wide">
              {sr.referenceNumber}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {t("saveForTracking")}
            </p>
          </div>

          {[
            [
              t("serviceLabel"),
              `${SERVICE_ICONS[sr.serviceType] ?? ""} ${sr.serviceType} Connection`,
            ],
            [t("requestTypeLabel"), sr.requestType.replace("_", " ")],
            [t("departmentLabel"), sr.department],
            [t("districtLabel"), sr.district],
            [t("statusLabel"), sr.status],
            [
              t("submittedOnLabel"),
              new Date(sr.createdAt).toLocaleDateString("en-IN", {
                dateStyle: "medium",
              }),
            ],
          ].map(([label, val]) => (
            <div
              key={label}
              className="flex justify-between border-b border-gray-50 pb-2 last:border-0"
            >
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-gray-800 capitalize">
                {val}
              </span>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 mb-5">
          📋 {t("srProcessingNote")}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => navigate("/citizen/track")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold"
          >
            <ClipboardList size={18} />
            {t("trackApplication")}
          </button>
          <button
            onClick={() => navigate("/citizen")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm"
          >
            {t("backToDashboard")} <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
