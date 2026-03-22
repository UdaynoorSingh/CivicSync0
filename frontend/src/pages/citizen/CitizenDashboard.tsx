import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  Droplets,
  Flame,
  Trash2,
  FileText,
  CreditCard,
  PlusCircle,
  Search,
  MapPin,
  Receipt,
  Clock,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import MascotGuide from "../../components/shared/MascotGuide";
import {
  getMyBills,
  getMyComplaints,
  getMyServiceRequests,
  getMyPayments,
  type CitizenBill,
} from "../../lib/api";

type BillCategory = "electricity" | "water" | "gas" | "waste";

const billConfig: Record<
  BillCategory,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
  }
> = {
  electricity: { icon: Zap, color: "text-yellow-400" },
  water: { icon: Droplets, color: "text-blue-300" },
  gas: { icon: Flame, color: "text-orange-400" },
  waste: { icon: Trash2, color: "text-green-400" },
};

const services = [
  {
    key: "registerComplaint",
    icon: FileText,
    color: "text-red-500",
    border: "border-red-200",
    bg: "bg-red-50",
    to: "/citizen/complaint/new",
  },
  {
    key: "payBills",
    icon: CreditCard,
    color: "text-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
    to: "/citizen/bills",
  },
  {
    key: "newServiceRequest",
    icon: PlusCircle,
    color: "text-purple-600",
    border: "border-purple-200",
    bg: "bg-purple-50",
    to: "/citizen/service/new",
  },
  {
    key: "trackStatus",
    icon: Search,
    color: "text-green-600",
    border: "border-green-200",
    bg: "bg-green-50",
    to: "/citizen/track",
  },
];

// ── Activity item built from real API data ────────────────────────────────────
interface ActivityItem {
  id: string;
  type: "complaint" | "service_request" | "payment";
  label: string;
  sub: string;
  right: string;
  timestamp: number; // ms — for sorting
  iconKey:
    | "complaint"
    | "service"
    | "electricity"
    | "water"
    | "gas"
    | "receipt";
  statusBadge?: { label: string; color: string };
  to: string;
}

const ACTIVITY_ICONS: Record<
  ActivityItem["iconKey"],
  {
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    bg: string;
    iconColor: string;
  }
> = {
  complaint: { Icon: FileText, bg: "bg-red-50", iconColor: "text-red-500" },
  service: {
    Icon: PlusCircle,
    bg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  electricity: { Icon: Zap, bg: "bg-yellow-50", iconColor: "text-yellow-500" },
  water: { Icon: Droplets, bg: "bg-blue-50", iconColor: "text-blue-500" },
  gas: { Icon: Flame, bg: "bg-orange-50", iconColor: "text-orange-500" },
  receipt: { Icon: Receipt, bg: "bg-green-50", iconColor: "text-green-600" },
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  submitted: { label: "Submitted", color: "bg-yellow-100 text-yellow-700" },
  acknowledged: { label: "Acknowledged", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-indigo-100 text-indigo-700" },
  escalated: { label: "Escalated", color: "bg-orange-100 text-orange-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  under_review: { label: "Under Review", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  processing: { label: "Processing", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  success: { label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  initiated: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
  refunded: { label: "Refunded", color: "bg-purple-100 text-purple-700" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

interface DashboardBill {
  id: string;
  category: BillCategory;
  amount: number;
}

const mapDepartmentToCategory = (bill: CitizenBill): BillCategory => {
  const code = bill.department?.code?.toUpperCase() ?? "";
  if (code === "ELEC") return "electricity";
  if (code === "WATER") return "water";
  if (code === "GAS") return "gas";
  return "waste";
};

export default function CitizenDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bills, setBills] = useState<DashboardBill[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Load pending bills for the top strip
  useEffect(() => {
    void (async () => {
      try {
        const res = await getMyBills();
        const mapped = res.bills
          .filter((bill) => bill.status !== "paid")
          .slice(0, 4)
          .map((bill) => ({
            id: bill._id,
            category: mapDepartmentToCategory(bill),
            amount: bill.amount,
          }));
        setBills(mapped);
      } catch {
        setBills([]);
      }
    })();
  }, []);

  // Load real recent activity in parallel
  useEffect(() => {
    void (async () => {
      setLoadingActivity(true);
      try {
        const [complaintsRes, srsRes, paymentsRes] = await Promise.allSettled([
          getMyComplaints(),
          getMyServiceRequests(),
          getMyPayments(),
        ]);

        const items: ActivityItem[] = [];

        // Complaints
        if (complaintsRes.status === "fulfilled") {
          const complaints = complaintsRes.value.complaints as Array<{
            _id: string;
            referenceNumber: string;
            category: string;
            status: string;
            createdAt: string;
            department?: { name?: string };
          }>;
          for (const c of complaints) {
            items.push({
              id: `complaint-${c._id}`,
              type: "complaint",
              label: `${c.department?.name ? c.department.name + " — " : ""}${c.category}`,
              sub: `Filed: ${fmtDate(c.createdAt)}`,
              right: c.referenceNumber,
              timestamp: new Date(c.createdAt).getTime(),
              iconKey: "complaint",
              statusBadge: STATUS_BADGE[c.status],
              to: "/citizen/track",
            });
          }
        }

        // Service requests
        if (srsRes.status === "fulfilled") {
          for (const sr of srsRes.value.serviceRequests) {
            const iconKey: ActivityItem["iconKey"] =
              sr.serviceType === "electricity"
                ? "electricity"
                : sr.serviceType === "water"
                  ? "water"
                  : sr.serviceType === "gas"
                    ? "gas"
                    : "service";
            items.push({
              id: `sr-${sr._id}`,
              type: "service_request",
              label: sr.requestType.replace(/_/g, " "),
              sub: `Applied: ${fmtDate(sr.createdAt)}`,
              right: sr.referenceNumber,
              timestamp: new Date(sr.createdAt).getTime(),
              iconKey,
              statusBadge: STATUS_BADGE[sr.status],
              to: "/citizen/track",
            });
          }
        }

        // Payments
        if (paymentsRes.status === "fulfilled") {
          for (const p of paymentsRes.value.payments) {
            items.push({
              id: `payment-${p._id}`,
              type: "payment",
              label: p.paymentFor === "bill" ? "Bill Payment" : "Service Fee",
              sub: `${p.paidAt ? "Paid" : "Initiated"}: ${fmtDate(p.paidAt ?? p.createdAt)}`,
              right: fmtAmount(p.amount),
              timestamp: new Date(p.paidAt ?? p.createdAt).getTime(),
              iconKey: "receipt",
              statusBadge: STATUS_BADGE[p.status],
              to: "/citizen/track",
            });
          }
        }

        // Sort newest first, cap at 5
        items.sort((a, b) => b.timestamp - a.timestamp);
        setActivity(items.slice(0, 5));
      } catch {
        setActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    })();
  }, []);

  const visibleBills = useMemo(() => bills, [bills]);

  return (
    <div className="pb-4">
      {visibleBills.length > 0 && <div className="bg-[#1E3A5F] px-4 pb-5 pt-2">
        <div className="grid grid-cols-4 gap-2 mt-1">
          {visibleBills.map((bill) => {
            const { icon: Icon, color } = billConfig[bill.category];
            return (
              <motion.button
                key={bill.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/citizen/bills/${bill.id}`)}
                className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-colors"
              >
                <Icon size={22} className={color} />
                <span className="text-[10px] text-blue-100 capitalize">
                  {t(bill.category)}
                </span>
                <span className="text-sm font-bold text-white">
                  Rs {bill.amount.toLocaleString("en-IN")}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div> }

      <div className="px-4 pt-4 space-y-5">
        <section>
          <MascotGuide
            emotion="happy"
            message={t("mascotWelcomeBack")}
            size="sm"
            className="mb-3"
          />
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            {t("civicServices")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {services.map(({ key, icon: Icon, color, border, bg, to }, i) => (
              <motion.button
                key={key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(to)}
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
            ))}
          </div>
        </section>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/citizen/map")}
          className="w-full bg-[#EA580C] text-white rounded-2xl py-3.5 flex items-center justify-center gap-2.5 font-bold text-base shadow-md shadow-orange-200 hover:bg-orange-700 transition-colors"
        >
          <MapPin size={20} />
          {t("viewComplaintMap")}
        </motion.button>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            {t("recentActivity")}
          </h2>

          {loadingActivity ? (
            /* Skeleton */
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm animate-pulse"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/5" />
                    <div className="h-2.5 bg-gray-100 rounded w-2/5" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-8 shadow-sm flex flex-col items-center gap-2 text-gray-400">
              <Clock size={28} className="opacity-40" />
              <p className="text-sm font-medium">{t("noRecentActivity")}</p>
              <p className="text-xs text-center">
                {t("activityAppearHere")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item, i) => {
                const { Icon, bg, iconColor } = ACTIVITY_ICONS[item.iconKey];
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(item.to)}
                    className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon size={17} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate capitalize">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 max-w-[40%]">
                      <span className="text-xs font-bold text-gray-700 truncate">
                        {item.right}
                      </span>
                      {item.statusBadge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${item.statusBadge.color}`}
                        >
                          {item.statusBadge.label}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {!loadingActivity && activity.length > 0 && (
            <button
              onClick={() => navigate("/citizen/track")}
              className="mt-5 w-full bg-civic-orange text-white rounded-2xl py-3.5 flex items-center justify-center font-semibold text-sm shadow-md shadow-orange-200 hover:bg-orange-700 transition-colors"
            >
              {t("viewAllActivity")}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
