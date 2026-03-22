import { useEffect, useRef, useState, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "../store/sessionStore";
import IdleOverlay from "../components/shared/IdleOverlay";
import AIAssistantWidget from "../components/shared/AIAssistantWidget";
import VoiceNavOverlay from "../components/shared/VoiceNavOverlay";
import OfflineBanner from "../components/shared/OfflineBanner";
import CitizenNavBar from "../components/citizen/CitizenNavBar";
import CitizenBottomNav from "../components/citizen/CitizenBottomNav";

const IDLE_TIMEOUT = 60_000; // 60 seconds

export default function KioskLayout() {
  const navigate = useNavigate();
  const logout = useSessionStore((s) => s.logout);
  const [showIdle, setShowIdle] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    setShowIdle(false);
    setCountdown(15);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setShowIdle(true);
      countdownTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer.current!);
            logout();
            navigate("/", { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT);
  }, [logout, navigate]);

  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [resetTimer]);

  return (
    <div className="flex flex-col min-h-screen bg-[#EEF0FB]">
      <OfflineBanner />
      <CitizenNavBar />
      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <CitizenBottomNav />
      <AIAssistantWidget />
      <VoiceNavOverlay />
      {showIdle && <IdleOverlay countdown={countdown} onDismiss={resetTimer} />}
    </div>
  );
}

