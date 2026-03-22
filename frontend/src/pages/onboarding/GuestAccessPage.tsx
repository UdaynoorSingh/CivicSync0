import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserX, HeadphonesIcon } from "lucide-react";
import { useTranslation } from "../../lib/i18n";

export default function GuestAccessPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <UserX size={28} className="text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 font-display mb-2">
            {t("guestMode")}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {t("guestDesc")}
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {/* <button
            onClick={() => navigate("/citizen/track")}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Search size={20} className="text-blue-600" />
            </div>
            <span className="font-semibold text-gray-800">
              {t("trackStatusGuest")}
            </span>
          </button> */}

          <button
            onClick={() => navigate("/citizen/help")}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <HeadphonesIcon size={20} className="text-green-600" />
            </div>
            <span className="font-semibold text-gray-800">
              {t("helpGuest")}
            </span>
          </button>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="w-full py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold text-base btn-touch"
        >
          Login with Mobile Number
        </button>
      </motion.div>
    </div>
  );
}
