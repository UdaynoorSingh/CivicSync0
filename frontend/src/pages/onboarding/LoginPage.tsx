import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Smartphone, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useSessionStore } from "../../store/sessionStore";
import { useTranslation } from "../../lib/i18n";
import * as api from "../../lib/api";

import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth } from "../../firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

type LoginRole = "citizen" | "admin" | "head_admin";

const formatIndianPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+91${digits}`;
};

export default function LoginPage() {
  const [role, setRole] = useState<LoginRole>("citizen");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAdminSession, loginGuest } = useSessionStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formattedPhone = useMemo(() => formatIndianPhone(phone), [phone]);

  const initRecaptcha = () => {
    if (window.recaptchaVerifier) return window.recaptchaVerifier;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-root", {
      size: "invisible",
    });
    return window.recaptchaVerifier;
  };

  const handleCitizenSubmit = async () => {
    setError("");
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      const verifier = initRecaptcha();
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        verifier,
      );
      
      window.confirmationResult = confirmation;
      
      navigate("/otp", { state: { phone: formattedPhone } });
      
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: string }).code) : "";
      
      if (code === "auth/invalid-phone-number") setError("Invalid mobile number format.");
      else if (code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError(err instanceof Error ? err.message : "Failed to send OTP.");
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async () => {
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.adminLogin(username.trim(), password);
      setAdminSession({
        id: res.admin.id,
        name: res.admin.name,
        username: res.admin.username,
        email: res.admin.email,
        role: res.admin.role as "admin" | "superadmin",
        district:
          typeof res.admin.district === "string"
            ? res.admin.district
            : undefined,
        department: res.admin.department,
      });
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleHeadAdminSubmit = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid mobile number.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await api.sendHeadAdminOTP(cleaned);
      navigate("/head-admin/otp", { state: { phone: cleaned } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex flex-col items-center justify-between py-10 px-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-full bg-white shadow-lg border-4 border-blue-100 flex items-center justify-center mx-auto mb-3">
          <img src="/apple-touch-icon.png" alt="logo" className="p-1 h-15 w-20 rounded-full" />
        </div>
        <h1 className="text-2xl font-black text-[#1E3A5F] font-display">
          CivicSync
        </h1>
        <p className="text-sm text-gray-500">Smart Interactive Kiosk</p>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-7 relative"
      >
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            {role === "citizen" ? (
              <Smartphone size={26} className="text-[#1E3A5F]" />
            ) : role === "admin" ? (
              <Lock size={26} className="text-[#1E3A5F]" />
            ) : (
              <ShieldCheck size={26} className="text-[#1E3A5F]" />
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-gray-800 mb-5">
          {role === "citizen"
            ? t("enterMobile")
            : role === "admin"
              ? t("adminLogin")
              : "Head Admin Login"}
        </h2>

        <div className="grid grid-cols-3 rounded-xl overflow-hidden bg-gray-100 p-1 mb-6 gap-1">
          {([
            ["citizen", t("user")],
            ["admin", t("admin")],
            ["head_admin", "Head"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setRole(value);
                setError("");
              }}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                role === value
                  ? "bg-[#1E3A5F] text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(role === "citizen" || role === "head_admin") && (
          <>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">
              {t("mobileNumber")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (role === "citizen"
                  ? void handleCitizenSubmit()
                  : void handleHeadAdminSubmit())
              }
              placeholder="98765 XXXXX"
              maxLength={15}
              disabled={loading}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4 disabled:opacity-60"
            />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button
              onClick={
                role === "citizen" ? handleCitizenSubmit : handleHeadAdminSubmit
              }
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold text-base hover:bg-[#163050] transition-colors btn-touch disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending OTP...
                </>
              ) : (
                t("sendOtp")
              )}
            </button>
            {role === "head_admin" && (
              <button
                onClick={() =>
                  navigate("/head-admin/firebase-login", {
                    state: { phone: phone.replace(/\D/g, "") },
                  })
                }
                className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Login with Firebase OTP
              </button>
            )}
            {role === "citizen" && (
              <button
                onClick={() => {
                  loginGuest();
                  navigate("/guest");
                }}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Continue as Guest
              </button>
            )}
          </>
        )}

        {role === "admin" && (
          <>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">
              {t("username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              disabled={loading}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4 disabled:opacity-60"
            />
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">
              {t("password")}
            </label>
            <div className="relative mb-4">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleAdminSubmit()}
                placeholder="........"
                disabled={loading}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 pr-12 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button
              onClick={handleAdminSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#1E3A5F] text-white font-bold text-base hover:bg-[#163050] transition-colors btn-touch disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                t("loginBtn")
              )}
            </button>
          </>
        )}
        
        <div id="recaptcha-root" />
        
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-gray-400 text-xs"
      >
        <p>{t("govtInitiative")}</p>
        <p className="mt-0.5">{t("govtHindi")}</p>
      </motion.div>
    </div>
  );
}