import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Loader2, CheckCircle } from "lucide-react";

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  title: string;
  description: string;
  loadingLabel?: string;
  successMessage?: string;
}

export default function EmailModal({
  open,
  onClose,
  onSubmit,
  title,
  description,
  loadingLabel = "Sending...",
  successMessage = "Sent successfully!",
}: EmailModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEmail("");
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF0FB] flex items-center justify-center">
                    <Mail size={18} className="text-[#1E3A5F]" />
                  </div>
                  <h2 className="font-bold text-gray-800">{title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <p className="text-sm text-gray-500">{description}</p>

                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter recipient email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1E3A5F] transition-colors"
                    disabled={loading || success}
                  />
                  {error && (
                    <p className="text-red-500 text-xs mt-1.5">{error}</p>
                  )}
                </div>

                {success && (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">{successMessage}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || success || !email.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm hover:bg-[#163050] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        {loadingLabel}
                      </>
                    ) : (
                      <>
                        <Mail size={15} />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}