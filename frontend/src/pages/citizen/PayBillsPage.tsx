import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MascotGuide from "../../components/shared/MascotGuide";
import type { MascotEmotion } from "../../components/shared/MascotGuide";
import { ArrowLeft, Zap, Droplets, Flame, Trash2 } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { getMyBills, type CitizenBill } from "../../lib/api";

type Category = "all" | "electricity" | "water" | "gas" | "waste";

const catConfig: Record<
  Exclude<Category, "all">,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bg: string;
  }
> = {
  electricity: { icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50" },
  water: { icon: Droplets, color: "text-blue-600", bg: "bg-blue-50" },
  gas: { icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
  waste: { icon: Trash2, color: "text-green-600", bg: "bg-green-50" },
};

interface UIBill {
  id: string;
  category: Exclude<Category, "all">;
  amount: number;
  dueDate: string;
  billingPeriod: string;
  previousBalance: number;
  currentCharges: number;
  taxes: number;
  status: "pending" | "overdue" | "paid";
  consumerNo: string;
}

const mapDepartmentToCategory = (
  bill: CitizenBill,
): Exclude<Category, "all"> => {
  const code = bill.department?.code?.toUpperCase() ?? "";
  if (code === "ELEC") return "electricity";
  if (code === "WATER") return "water";
  if (code === "GAS") return "gas";
  return "waste";
};

const mapBillToUI = (bill: CitizenBill): UIBill => ({
  id: bill._id,
  category: mapDepartmentToCategory(bill),
  amount: bill.amount,
  dueDate: new Date(bill.dueDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
  billingPeriod: bill.billingPeriod?.label ?? "-",
  previousBalance: bill.previousBalance,
  currentCharges: bill.currentCharges,
  taxes: bill.taxes,
  status: bill.status,
  consumerNo: bill.connectionNumber,
});

export default function PayBillsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState<Category>("all");
  const [bills, setBills] = useState<UIBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getMyBills();
        const mapped = res.bills.map(mapBillToUI);
        setBills(mapped.filter((b) => b.status !== "paid"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bills.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => (active === "all" ? bills : bills.filter((b) => b.category === active)),
    [active, bills],
  );

  const tabs: Category[] = ["all", "electricity", "water", "gas", "waste"];
  const tabLabel: Record<Category, string> = {
    all: t("allBills"),
    electricity: t("electricity"),
    water: t("water"),
    gas: t("gas"),
    waste: t("waste"),
  };

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{t("pendingBills")}</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              active === tab
                ? "bg-[#1E3A5F] text-white shadow"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tabLabel[tab]}
          </button>
        ))}
      </div>

      {/* ── Animated Mascot Guide ──────────────────────────────────── */}
      {(() => {
        let emotion: MascotEmotion = "happy";
        let msg = "";
        if (loading) {
          emotion = "loading";
          msg = t("mascotFetchingBills");
        } else if (error) {
          emotion = "sorry";
          msg = t("mascotCouldntLoadBills");
        } else if (filtered.length === 0) {
          emotion = "celebration";
          msg = t("mascotAllBillsPaid");
        } else {
          emotion = "pointing";
          msg = t("mascotTapToPay");
        }
        return (
          <MascotGuide
            emotion={emotion}
            message={msg}
            size="sm"
            className="mb-3"
          />
        );
      })()}

      {loading && <p className="text-sm text-gray-500">{t("loading")}</p>}

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm">
          {t("noPendingBills")}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((bill, i) => {
          const { icon: Icon, color, bg } = catConfig[bill.category];
          return (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon size={24} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 capitalize">
                    {t(bill.category)}
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      bill.status === "overdue"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {bill.status === "overdue" ? t("overdue") : t("pending")}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {t("dueDate")}: {bill.dueDate}
                </p>
                <p className="text-xs text-gray-400">{bill.consumerNo}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-gray-800">
                  Rs {bill.amount.toLocaleString("en-IN")}
                </p>
                <button
                  onClick={() => navigate(`/citizen/bills/${bill.id}`)}
                  className="mt-1 text-xs px-3 py-1.5 rounded-lg bg-[#1E3A5F] text-white font-semibold hover:bg-[#163050] transition-colors"
                >
                  {t("payNow")}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
