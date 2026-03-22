import { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useSessionStore } from "../../store/sessionStore";
import * as api from "../../lib/api";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function HeadAdminOTPPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const phone = (state as { phone?: string })?.phone ?? "";
  const { setHeadAdminSession } = useSessionStore();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resend, setResend] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) navigate("/login", { replace: true });
  }, [phone, navigate]);

  useEffect(() => {
    if (resend <= 0) return;
    const id = setInterval(() => setResend((v) => v - 1), 1000);
    return () => clearInterval(id);
  }, [resend]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const updated = [...digits];
    updated[i] = val.slice(-1);
    setDigits(updated);
    if (val && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
    setError("");
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") {
      void handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    const arr = pasted
      .split("")
      .concat(Array(OTP_LENGTH).fill(""))
      .slice(0, OTP_LENGTH);
    setDigits(arr);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await api.verifyHeadAdminOTP(phone, otp);
      setHeadAdminSession({
        id: res.admin.id,
        name: res.admin.name,
        mobile: res.admin.mobile,
        role: "head_admin",
      });
      navigate("/head-admin", { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Verification failed. Try again.",
      );
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError("");
    try {
      await api.sendHeadAdminOTP(phone);
      setResend(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex flex-col items-center justify-between py-10 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-black text-[#1E3A5F] font-display">
          Head Admin OTP Verification
        </h1>
        <p className="text-sm text-gray-500">OTP is printed in backend console</p>
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-7"
      >
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <ShieldCheck size={28} className="text-[#1E3A5F]" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-gray-800 mb-1">
          Enter OTP
        </h2>
        <p className="text-center text-sm text-gray-400 mb-6">
          Sent to <strong className="text-gray-700">{phone}</strong>
        </p>

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="w-11 h-12 border-2 border-gray-200 rounded-xl text-center text-xl font-bold text-gray-800 bg-gray-50 focus:outline-none focus:border-[#1E3A5F] transition-colors disabled:opacity-60"
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}

        <button
          onClick={() => void handleVerify()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#16A34A] text-white font-bold text-base hover:bg-green-700 transition-colors btn-touch mb-4 disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <p className="text-center text-sm text-gray-400">
          {resend > 0 ? (
            <span>
              Resend in <strong className="text-gray-700">{resend}s</strong>
            </span>
          ) : (
            <button
              onClick={() => void handleResend()}
              disabled={resendLoading}
              className="text-blue-600 font-semibold hover:underline disabled:opacity-60"
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </p>
      </motion.div>

      <button
        onClick={() => navigate("/login")}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Back to Login
      </button>
    </div>
  );
}
