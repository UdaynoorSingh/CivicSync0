import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Mail, Loader2 } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import {
  downloadPaymentReceipt,
  sendPaymentReceiptByEmail,
} from "../../lib/api";

export default function ReceiptOptionsModal({
  open,
  onClose,
  paymentId,
  receiptNumber,
}: {
  open: boolean;
  onClose: () => void;
  paymentId: string;
  receiptNumber?: string;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail("");
      setError("");
      setSuccessMsg("");
    }
  }, [open]);

  const handleDownload = async () => {
    if (!paymentId) return;
    setError("");
    setSuccessMsg("");
    setDownloading(true);
    try {
      await downloadPaymentReceipt(paymentId);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("receiptEmailFailed"),
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!paymentId) return;
    setError("");
    setSuccessMsg("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("enterEmailAddress"));
      return;
    }
    setSending(true);
    try {
      const res = await sendPaymentReceiptByEmail(paymentId, trimmed);
      setSuccessMsg(res.message ?? t("receiptEmailSent"));
      setEmail("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("receiptEmailFailed"),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label={t("close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/45"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-options-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed left-1/2 top-1/2 z-[61] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl border border-gray-100"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2
                  id="receipt-options-title"
                  className="text-lg font-bold text-gray-800"
                >
                  {t("receiptOptionsTitle")}
                </h2>
                {receiptNumber ? (
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                    {receiptNumber}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                aria-label={t("close")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={downloading || !paymentId}
                onClick={() => void handleDownload()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                {downloading ? t("downloading") : t("downloadReceiptBtn")}
              </button>

              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Mail size={14} />
                  {t("sendReceiptEmailLabel")}
                </p>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholderReceipt")}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 mb-2 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
                <button
                  type="button"
                  disabled={sending || !paymentId}
                  onClick={() => void handleSend()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] font-semibold text-sm hover:bg-blue-50 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Mail size={18} />
                  )}
                  {sending ? t("sending") : t("sendReceiptEmailBtn")}
                </button>
              </div>

              {error ? (
                <p className="text-red-600 text-xs text-center">{error}</p>
              ) : null}
              {successMsg ? (
                <p className="text-emerald-600 text-xs text-center font-medium">
                  {successMsg}
                </p>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
