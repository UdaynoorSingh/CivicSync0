import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, CreditCard, PlusCircle, Search, MapPin } from "lucide-react";
import { useTranslation } from "@/lib/i18n"
import MascotGuide from "@/components/shared/MascotGuide";
import GuestNotifications from "@/components/guest/GuestNotifications";

const services = [
  {
    key: "registerComplaint",
    icon: FileText,
    color: "text-red-500",
    border: "border-red-200",
    bg: "bg-red-50",
  },
  {
    key: "payBills",
    icon: CreditCard,
    color: "text-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
  },
  {
    key: "newServiceRequest",
    icon: PlusCircle,
    color: "text-purple-600",
    border: "border-purple-200",
    bg: "bg-purple-50",
    redirectTo: "/citizen/service/new",
  },
  {
    key: "trackStatus",
    icon: Search,
    color: "text-green-600",
    border: "border-green-200",
    bg: "bg-green-50",
  },
];

export default function GuestAccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleServiceClick = () => {
    navigate("/login");
  };

  const handleMapClick = () => {
    navigate("/guest/map");
  };

  const visibleServices = useMemo(() => services, []);

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 space-y-5">
        <section>
          <MascotGuide
            emotion="happy"
            message={t("mascotWelcomeGuest")}
            size="sm"
            className="mb-3"
          />
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            {t("civicServices")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {visibleServices.map(
              ({ key, icon: Icon, color, border, bg }, i) => (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleServiceClick()}
                  className={`bg-white border-2 ${border} rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}
                  >
                    <Icon size={26} className={color} />
                  </div>
                  <span
                    className={`text-sm font-bold ${color} text-center leading-tight`}
                  >
                    {t(key)}
                  </span>
                </motion.button>
              ),
            )}
          </div>
        </section>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleMapClick}
          className="w-full bg-[#EA580C] text-white rounded-2xl py-3.5 flex items-center justify-center gap-2.5 font-bold text-base shadow-md shadow-orange-200 hover:bg-orange-700 transition-colors"
        >
          <MapPin size={20} />
          {t("viewComplaintMap")}
        </motion.button>

        <GuestNotifications />
      </div>
    </div>
  );
}
