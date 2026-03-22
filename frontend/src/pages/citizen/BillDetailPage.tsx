import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Droplets, Flame, Trash2 } from "lucide-react";
import MascotGuide from "../../components/shared/MascotGuide";
import { useTranslation } from "../../lib/i18n";
import {
  createPaymentOrder,
  getBillById,
  markPaymentFailure,
  verifyPayment,
  type CitizenBill,
  type PaymentMethod,
} from "../../lib/api";
import { useSessionStore } from "../../store/sessionStore";

const catIcon = {
  electricity: Zap,
  water: Droplets,
  gas: Flame,
  waste: Trash2,
};

const banks = [
  "Punjab National Bank",
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
];

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
  prefill?: {
    name?: string;
    contact?: string;
  };
  method?: {
    upi?: boolean;
    card?: boolean;
    netbanking?: boolean;
    wallet?: boolean;
  };
  theme?: {
    color?: string;
  };
}

interface SuccessBillState {
  category: "electricity" | "water" | "gas" | "waste";
  amount: number;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const isMongoObjectId = (value?: string): boolean =>
  Boolean(value && /^[a-f\d]{24}$/i.test(value));

const loadRazorpayScript = async (): Promise<boolean> => {
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const mapDepartmentToCategory = (
  bill: CitizenBill,
): "electricity" | "water" | "gas" | "waste" => {
  const code = bill.department?.code?.toUpperCase() ?? "";
  if (code === "ELEC") return "electricity";
  if (code === "WATER") return "water";
  if (code === "GAS") return "gas";
  return "waste";
};

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sessionUser = useSessionStore((s) => s.user);

  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [bank, setBank] = useState(banks[0]);
  const [isPaying, setIsPaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<CitizenBill | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Bill id is missing.");
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getBillById(id);
        setBill(res.bill);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bill.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const category = useMemo(
    () => (bill ? mapDepartmentToCategory(bill) : "electricity"),
    [bill],
  );

  const Icon = catIcon[category];

  const handlePay = async () => {
    setError(null);

    if (!id || !isMongoObjectId(id)) {
      setError("Invalid backend bill id.");
      return;
    }

    if (!bill) {
      setError("Bill details are not loaded yet.");
      return;
    }

    setIsPaying(true);

    try {
      const checkoutLoaded = await loadRazorpayScript();
      if (!checkoutLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      const orderRes = await createPaymentOrder({
        paymentFor: "bill",
        billId: id,
      });

      const options: RazorpayOptions = {
        key: orderRes.keyId,
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: "CivicSync",
        description: `${category} bill payment`,
        order_id: orderRes.order.id,
        prefill: {
          name: sessionUser?.name,
          contact: sessionUser?.mobile,
        },
        method: {
          upi: method === "upi",
          card: method === "card",
          netbanking: method === "netbanking",
          wallet: false,
        },
        modal: {
          ondismiss: () => {
            void markPaymentFailure({
              razorpay_order_id: orderRes.order.id,
              reason: "Checkout closed by user.",
            });
          },
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            const verified = await verifyPayment(response);
            const successBill: SuccessBillState = {
              category,
              amount: bill.amount,
            };

            navigate(`/citizen/bills/success?paymentId=${verified.payment.id}`, {
              replace: true,
              state: {
                bill: successBill,
                payment: verified.payment,
              },
            });
          } catch (verifyErr) {
            await markPaymentFailure({
              razorpay_order_id: orderRes.order.id,
              reason:
                verifyErr instanceof Error
                  ? verifyErr.message
                  : "Payment verification failed.",
            });
            setError(
              verifyErr instanceof Error
                ? verifyErr.message
                : "Payment verification failed.",
            );
          }
        },
        theme: { color: "#1E3A5F" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start payment.");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
        <MascotGuide emotion="loading" message={t("mascotLoadingBill")} size="sm" className="mb-3" />
        <p className="text-sm text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
        <button onClick={() => navigate(-1)} className="text-gray-600 mb-3">
          <ArrowLeft size={22} />
        </button>
        <MascotGuide emotion="sorry" message={t("mascotBillNotFound")} size="sm" className="mb-3" />
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? "Bill not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-600">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{t("billBreakdown")}</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm mb-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
            <Icon size={24} className="text-yellow-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800 capitalize">{t(category)} Bill</p>
            <p className="text-xs text-gray-400">
              {bill.billingPeriod?.label ?? "-"} - {bill.connectionNumber}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {[
            [t("previousBalance"), `Rs ${bill.previousBalance}`],
            [t("currentCharges"), `Rs ${bill.currentCharges}`],
            [t("taxes"), `Rs ${bill.taxes}`],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between text-gray-600">
              <span>{label}</span>
              <span>{val}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base text-gray-800">
            <span>{t("totalAmount")}</span>
            <span className="text-[#1E3A5F]">Rs {bill.amount.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm mb-4"
      >
        <h2 className="font-bold text-gray-800 mb-3">{t("choosePayment")}</h2>
        <div className="flex gap-2 mb-4">
          {(["upi", "card", "netbanking"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                method === m
                  ? "border-[#1E3A5F] text-[#1E3A5F] bg-blue-50"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              {m === "upi" ? t("upi") : m === "card" ? "Card" : "Net Banking"}
            </button>
          ))}
        </div>

        {method === "upi" && (
          <div>
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center mb-3">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto rounded-lg bg-white border border-gray-200 p-1 grid grid-cols-5 gap-0.5">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${Math.random() > 0.5 ? "bg-gray-800" : "bg-white"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">civicsync@upi</p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mb-3">{t("or")}</p>
            <label className="text-xs font-medium text-gray-600 block mb-1">{t("upiId")}</label>
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="phone@upi"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        )}

        {method === "card" && (
          <div className="space-y-3">
            {[
              [t("cardNumber"), cardNo, setCardNo, "1234 5678 9012 3456"],
              [t("cardHolderName"), cardName, setCardName, "Full Name"],
            ].map(([label, val, setter, ph]) => (
              <div key={String(label)}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{String(label)}</label>
                <input
                  value={String(val)}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  placeholder={String(ph)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            ))}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 block mb-1">{t("expiryDate")}</label>
                <input
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 block mb-1">{t("cvv")}</label>
                <input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="***"
                  maxLength={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>
        )}

        {method === "netbanking" && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">{t("selectBank")}</label>
            <div className="space-y-2">
              {banks.map((b) => (
                <button
                  key={b}
                  onClick={() => setBank(b)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${bank === b ? "border-[#1E3A5F] text-[#1E3A5F] bg-blue-50" : "border-gray-200 text-gray-700"}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {error && (
        <div className="mb-3">
          <MascotGuide emotion="sorry" message={t("mascotPaymentFailed")} size="sm" className="mb-2" />
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {!error && (
        <MascotGuide
          emotion={isPaying ? "loading" : "pointing"}
          message={isPaying ? t("mascotProcessingPayment") : t("mascotChoosePayment")}
          size="sm"
          className="mb-3"
        />
      )}

      <button
        onClick={handlePay}
        disabled={isPaying}
        className="w-full py-4 rounded-2xl bg-[#16A34A] text-white font-bold text-base shadow-md hover:bg-green-700 transition-colors btn-touch mb-4 disabled:opacity-60"
      >
        {isPaying
          ? "Processing..."
          : `${t("payBtn")} Rs ${bill.amount.toLocaleString("en-IN")}`}
      </button>
    </div>
  );
}