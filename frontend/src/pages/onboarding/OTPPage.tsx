import { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useSessionStore } from "../../store/sessionStore";
import { useTranslation } from "../../lib/i18n";
import * as api from "../../lib/api";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function OTPPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const phone = (state as { phone?: string })?.phone ?? "";
  const { setCitizenSession } = useSessionStore();
  const { t } = useTranslation();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resend, setResend] = useState(RESEND_COOLDOWN);
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
    if (e.key === "Enter") void handleVerify();
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
    
    if (!window.confirmationResult) {
      setError("Session expired. Please request OTP again.");
      return;
    }

    setError("");
    setLoading(true);
    
    try {
      const credential = await window.confirmationResult.confirm(otp);
      
      const firebaseToken = await credential.user.getIdToken();
      
      const result = await api.firebaseLogin(firebaseToken);

      localStorage.setItem("authToken", result.token);

      const user = result.user;
      const districtObj = typeof user.district === "object" && user.district !== null ? user.district : null;

      setCitizenSession({
        id: user.id || (user as any)._id || "",
        name: user.name,
        mobile: user.mobile,
        preferredLanguage: user.preferredLanguage,
        district: typeof user.district === "string" ? user.district : (districtObj?._id ?? (districtObj as any)?.id),
        districtName: districtObj?.name,
        address: (user as any).address,
        createdAt: (user as any).createdAt,
      });
      
      navigate("/citizen", { replace: true });
      
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: string }).code) : "";
        
      if (code === "auth/invalid-verification-code") setError("Invalid OTP. Please try again.");
      else if (code === "auth/code-expired") setError("OTP expired. Please request a new one.");
      else setError(err instanceof Error ? err.message : "Verification failed. Try again.");
      
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex flex-col items-center justify-between py-10 px-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-white shadow-lg border-4 border-blue-100 flex items-center justify-center mx-auto mb-3">
          <img src="/apple-touch-icon.png" alt="logo" className="p-1 h-15 w-20 rounded-full" />
        </div>
        <h1 className="text-2xl font-black text-[#1E3A5F] font-display">
          CivicSync
        </h1>
        <p className="text-sm text-gray-500">Smart Interactive Kiosk</p>
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
          {t("enterOtp")}
        </h2>
        <p className="text-center text-sm text-gray-400 mb-6">
          {t("sentTo")} <strong className="text-gray-700">{phone}</strong>
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

        {error && (
          <p className="text-red-500 text-xs text-center mb-3">{error}</p>
        )}

        <button
          onClick={() => void handleVerify()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#16A34A] text-white font-bold text-base hover:bg-green-700 transition-colors btn-touch mb-4 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Verifying…
            </>
          ) : (
            t("verifyBtn")
          )}
        </button>

        <p className="text-center text-sm text-gray-400">
          {t("didntReceive")}{" "}
          {resend > 0 ? (
            <span>
              {t("resendIn")}{" "}
              <strong className="text-gray-700">{resend}s</strong>
            </span>
          ) : (
            <button
              onClick={handleResend}
              className="text-blue-600 font-semibold hover:underline disabled:opacity-60"
            >
              {t("resend")}
            </button>
          )}
        </p>
      </motion.div>

      <button
        onClick={() => navigate("/login")}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        {t("changeMobile")}
      </button>
    </div>
  );
}