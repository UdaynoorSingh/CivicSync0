import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth } from "../../firebase";
import * as api from "../../lib/api";
import { useSessionStore } from "../../store/sessionStore";

declare global {
  interface Window {
    headRecaptchaVerifier?: RecaptchaVerifier;
    headConfirmationResult?: ConfirmationResult;
  }
}

const formatIndianPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+91${digits}`;
};

const firebaseErrorMessage = (err: unknown): string => {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code)
      : "";

  if (code === "auth/invalid-phone-number") {
    return "Please enter a valid Indian mobile number.";
  }
  if (code === "auth/invalid-verification-code") {
    return "Invalid OTP. Please try again.";
  }
  if (code === "auth/code-expired" || code === "auth/session-expired") {
    return "OTP session expired. Please request a new OTP.";
  }
  if (
    code === "auth/captcha-check-failed" ||
    code === "auth/missing-recaptcha-token"
  ) {
    return "reCAPTCHA verification failed. Please refresh and retry.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Try again later.";
  }
  if (code === "auth/billing-not-enabled") {
    return "Firebase Phone Auth billing is not enabled. Use Firebase test mode and configured test numbers, or enable billing.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
};

export default function HeadAdminFirebaseLoginPage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeadAdminSession } = useSessionStore();

  useEffect(() => {
    const prefilled = (location.state as { phone?: string } | null)?.phone;
    if (prefilled) setPhoneInput(prefilled);
  }, [location.state]);

  const formattedPhone = useMemo(
    () => formatIndianPhone(phoneInput),
    [phoneInput],
  );

  const initRecaptcha = () => {
    if (window.headRecaptchaVerifier) return window.headRecaptchaVerifier;
    window.headRecaptchaVerifier = new RecaptchaVerifier(
      auth,
      "head-recaptcha-root",
      { size: "invisible" },
    );
    return window.headRecaptchaVerifier;
  };

  const handleSendOtp = async () => {
    setError("");
    if (!/^\+91\d{10}$/.test(formattedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setSendingOtp(true);
    try {
      const verifier = initRecaptcha();
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        verifier,
      );
      window.headConfirmationResult = confirmation;
      setOtpSent(true);
    } catch (err) {
      setError(firebaseErrorMessage(err));
      if (window.headRecaptchaVerifier) {
        void window.headRecaptchaVerifier.clear();
        window.headRecaptchaVerifier = undefined;
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!window.headConfirmationResult) {
      setError("Please request OTP first.");
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const credential = await window.headConfirmationResult.confirm(otp.trim());
      const firebaseToken = await credential.user.getIdToken();
      const result = await api.headAdminFirebaseLogin(firebaseToken);

      localStorage.setItem("authToken", result.token);
      setHeadAdminSession({
        id: result.admin.id,
        name: result.admin.name,
        mobile: result.admin.mobile,
        role: "head_admin",
      });
      navigate("/head-admin", { replace: true });
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF0FB] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-7">
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Head Admin Firebase OTP Login
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Sign in as head admin using your registered phone number.
        </p>

        {!otpSent && (
          <>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="9876543210"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4"
              disabled={sendingOtp}
            />
            <p className="text-xs text-gray-500 mb-4">
              OTP will be sent to: <strong>{formattedPhone}</strong>
            </p>
            <button
              onClick={() => void handleSendOtp()}
              disabled={sendingOtp}
              className="w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-semibold disabled:opacity-60"
            >
              {sendingOtp ? "Sending OTP..." : "Send OTP"}
            </button>
          </>
        )}

        {otpSent && (
          <>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Enter OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit OTP"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4"
              disabled={verifyingOtp}
            />
            <button
              onClick={() => void handleVerifyOtp()}
              disabled={verifyingOtp}
              className="w-full py-3 rounded-xl bg-[#16A34A] text-white font-semibold disabled:opacity-60"
            >
              {verifyingOtp ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {error ? <p className="text-red-600 text-sm mt-4">{error}</p> : null}
        <div id="head-recaptcha-root" />
      </div>
    </div>
  );
}
