import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AIAssistantWidget from "../components/shared/AIAssistantWidget";
import VoiceNavOverlay from "../components/shared/VoiceNavOverlay";
import OfflineBanner from "../components/shared/OfflineBanner";
import GuestNavBar from "../components/guest/GuestNavBar";
import GuestBottomNav from "../components/guest/GuestBottomNav";

export default function GuestLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#EEF0FB]">
      <OfflineBanner />
      <GuestNavBar />
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
      <GuestBottomNav />
      <AIAssistantWidget />
      <VoiceNavOverlay />
    </div>
  );
}
