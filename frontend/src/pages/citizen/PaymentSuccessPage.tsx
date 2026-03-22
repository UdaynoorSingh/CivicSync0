import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Download, MessageSquare, Home } from "lucide-react";
import MascotGuide from "../../components/shared/MascotGuide";
import { useTranslation } from "../../lib/i18n";
import {
  downloadPaymentReceipt,
  getPaymentById,
  type PaymentSummary,
} from "../../lib/api";

interface SuccessBillState {
  category: "electricity" | "water" | "gas" | "waste";
  amount: number;
}

interface PaymentSuccessState {
  bill?: SuccessBillState;
  payment?: PaymentSummary;
}

export default function PaymentSuccessPage() {
  const { state } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const locationState = (state as PaymentSuccessState) ?? {};
  const [payment, setPayment] = useState<PaymentSummary | undefined>(
    locationState.payment,
  );
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const bill = locationState.bill;

  useEffect(() => {
    const paymentId = params.get("paymentId");
    if (!paymentId || payment) return;

    void (async () => {
      try {
        const res = await getPaymentById(paymentId);
        setPayment({
          id: res.payment._id,
          paymentFor: res.payment.paymentFor,
          amount: res.payment.amount,
          status: res.payment.status,
          method: res.payment.method,
          receiptNumber: res.payment.receiptNumber,
          receiptUrl: res.payment.receiptUrl,
          paidAt: res.payment.paidAt,
        });
      } catch {
        // Keep page usable even if fetching payment details fails.
      }
    })();
  }, [params, payment]);

  const paidDate = payment?.paidAt ? new Date(payment.paidAt) : new Date();

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
        className="mb-6"
      >
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={52} className="text-green-500" />
        </div>
      </motion.div>

      <MascotGuide
        emotion="celebration"
        message={t("mascotPaymentSuccess")}
        size="md"
        className="justify-center mb-2"
      />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-800 font-display mb-1">
          {t("paymentSuccess")}
        </h1>
        <p className="text-gray-500">{t("paymentProcessedOk")}</p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-5 mb-6"
      >
        {[
          [t("transactionId"), payment?.id ?? payment?.receiptNumber ?? "-"],
          [t("receipt"), payment?.receiptNumber ?? "-"],
          [t("service"), bill ? `${bill.category} Bill` : "Utility Bill"],
          [
            t("amount"),
            payment?.amount != null
              ? `Rs ${payment.amount.toLocaleString("en-IN")}`
              : bill
                ? `Rs ${bill.amount.toLocaleString("en-IN")}`
                : "-",
          ],
          [
            t("date"),
            paidDate.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          ],
          [t("status"), payment?.status === "success" ? t("paid") : t("approved")],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="flex justify-between py-2 border-b border-gray-50 text-sm last:border-0"
          >
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-gray-800">{val}</span>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-3"
      >
        <button
          onClick={() => {
            if (!payment?.id) return;
            setDownloadError("");
            setDownloading(true);
            void (async () => {
              try {
                await downloadPaymentReceipt(payment.id);
              } catch (err) {
                setDownloadError(
                  err instanceof Error
                    ? err.message
                    : "Failed to download receipt.",
                );
              } finally {
                setDownloading(false);
              }
            })();
          }}
          disabled={!payment?.id || downloading}
          className="w-full py-3 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] font-semibold flex items-center gap-2 justify-center hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <Download size={18} />{" "}
          {downloading ? "Downloading..." : t("downloadReceipt")}
        </button>
        {downloadError ? (
          <p className="text-red-600 text-xs text-center">{downloadError}</p>
        ) : null}
        <button className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold flex items-center gap-2 justify-center hover:bg-gray-50 transition-colors">
          <MessageSquare size={18} /> {t("sendSms")}
        </button>
        <button
          onClick={() => navigate("/citizen")}
          className="w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-semibold flex items-center gap-2 justify-center hover:bg-[#163050] transition-colors"
        >
          <Home size={18} /> {t("goHome")}
        </button>
      </motion.div>
    </div>
  );
}
