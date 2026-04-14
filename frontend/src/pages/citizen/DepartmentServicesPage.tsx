import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  PlusCircle,
  CreditCard,
  Search,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import type { PostAuthRedirect } from "../../lib/authRedirect";
import { useSessionStore } from "../../store/sessionStore";
import { isCitizenUser } from "../../lib/authRedirect";
import {
  isDepartmentSlug,
  slugToComplaintDepartmentKey,
  slugToServiceType,
  departmentTitleI18nKey,
  type DepartmentSlug,
} from "../../lib/departmentContext";

export default function DepartmentServicesPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, role } = useSessionStore();
  const citizen = isCitizenUser(isAuthenticated, role);

  if (!isDepartmentSlug(slugParam)) {
    navigate("/citizen", { replace: true });
    return null;
  }
  const slug = slugParam as DepartmentSlug;

  const deptState = { departmentSlug: slug };

  const complaintState = {
    ...deptState,
    prefillDepartmentKey: slugToComplaintDepartmentKey(slug),
  };
  const serviceState: Record<string, unknown> = { ...deptState };
  const prefillServiceType = slugToServiceType(slug);
  if (prefillServiceType) serviceState.prefillServiceType = prefillServiceType;

  const goAuth = (path: string, state: Record<string, unknown>) => {
    const postAuthRedirect: PostAuthRedirect = { path, state };
    navigate("/login", { state: { postAuthRedirect } });
  };

  const onComplaint = () => {
    if (citizen) {
      navigate("/citizen/complaint/new", { state: complaintState });
    } else {
      goAuth("/citizen/complaint/new", complaintState);
    }
  };

  const onAddService = () => {
    if (citizen) {
      navigate("/citizen/service/new", { state: serviceState });
    } else {
      goAuth("/citizen/service/new", serviceState);
    }
  };

  const onBills = () => {
    if (citizen) {
      navigate("/citizen/bills", { state: deptState });
    } else {
      goAuth("/citizen/bills", deptState);
    }
  };

  const onTrack = () => {
    if (citizen) {
      navigate("/citizen/track", { state: deptState });
    } else {
      goAuth("/citizen/track", deptState);
    }
  };

  const actions = [
    {
      key: "complaint",
      labelKey: "registerComplaint" as const,
      Icon: FileText,
      color: "text-red-600",
      border: "border-red-200",
      bg: "bg-red-50",
      onClick: onComplaint,
      delay: 0,
    },
    {
      key: "service",
      labelKey: "addNewService" as const,
      Icon: PlusCircle,
      color: "text-purple-600",
      border: "border-purple-200",
      bg: "bg-purple-50",
      onClick: onAddService,
      delay: 0.05,
    },
    {
      key: "bills",
      labelKey: "billsMenu" as const,
      Icon: CreditCard,
      color: "text-blue-600",
      border: "border-blue-200",
      bg: "bg-blue-50",
      onClick: onBills,
      delay: 0.1,
    },
    {
      key: "track",
      labelKey: "trackStatus" as const,
      Icon: Search,
      color: "text-green-600",
      border: "border-green-200",
      bg: "bg-green-50",
      onClick: onTrack,
      delay: 0.15,
    },
  ];

  return (
    <div className="min-h-full bg-[#EEF0FB] px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate("/citizen")}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600"
          aria-label={t("back")}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {t(departmentTitleI18nKey(slug))}
        </h1>
      </div>

      <p className="text-sm text-gray-500 mb-4">{t("departmentChooseAction")}</p>

      <div className="space-y-3">
        {actions.map(
          ({ key, labelKey, Icon, color, border, bg, onClick, delay }) => (
            <motion.button
              key={key}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay }}
              whileTap={{ scale: 0.98 }}
              onClick={onClick}
              className={`w-full bg-white border-2 ${border} rounded-2xl p-4 flex items-center gap-4 shadow-sm text-left`}
            >
              <div
                className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}
              >
                <Icon size={26} className={color} />
              </div>
              <span className={`text-base font-bold ${color}`}>
                {t(labelKey)}
              </span>
            </motion.button>
          ),
        )}
      </div>
    </div>
  );
}
