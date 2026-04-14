import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Loader2, AlertCircle } from "lucide-react";
import { useVoiceNavStore } from "../../store/voiceNavStore";
import { useVoiceNavigation } from "../../hooks/useVoiceNavigation";

/**
 * Floating overlay showing the current voice navigation phase.
 * Rendered inside KioskLayout alongside the AI chat widget.
 */
export default function VoiceNavOverlay() {
  const isEnabled = useVoiceNavStore((s) => s.isEnabled);
  const phase = useVoiceNavStore((s) => s.phase);
  const transcript = useVoiceNavStore((s) => s.transcript);
  const errorMessage = useVoiceNavStore((s) => s.errorMessage);
  const toggle = useVoiceNavStore((s) => s.toggle);

  // Activate the orchestration hook
  const { stopRecording } = useVoiceNavigation();

  return (
    <>
      {/* ── Toggle Button ─────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        className={`fixed bottom-16 left-4 z-1100 w-16 h-16 rounded-full shadow-lg flex items-end justify-center pt-2 transition-colors duration-300 ${
          isEnabled
            ? "bg-emerald-600 text-white"
            : "bg-white text-gray-600 border border-gray-200"
        }`}
        title={isEnabled ? "Disable Voice Navigation" : "Enable Voice Navigation"}
      >
        <img src="/mascot/split_3_1.png" alt="Voice Mascot" className="w-12 h-12 object-contain drop-shadow" draggable={false} />
      </motion.button>

      {/* ── Phase Indicator ───────────────────────────── */}
      <AnimatePresence>
        {isEnabled && phase !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-32 left-4 z-1100 w-72 rounded-2xl shadow-2xl overflow-hidden bg-white border border-gray-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2a5280] text-white px-4 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                Voice Navigation
              </span>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Speaking Phase */}
              {phase === "speaking" && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Volume2 size={20} className="text-[#1E3A5F]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Speaking…</p>
                    <p className="text-xs text-gray-500">Listening to your assistant</p>
                  </div>
                  {/* Sound wave animation */}
                  <div className="flex items-center gap-0.5 ml-auto">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-[#1E3A5F] rounded-full"
                        animate={{ height: [8, 20, 8] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.8,
                          delay: i * 0.12,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Listening Phase */}
              {phase === "listening" && (
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <Mic size={20} className="text-red-500" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Listening…</p>
                    <p className="text-xs text-gray-500">Speak now, I'm listening</p>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* Processing Phase */}
              {phase === "processing" && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Loader2 size={20} className="text-amber-600 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Processing…</p>
                    {transcript && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        You said: "{transcript}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error Phase */}
              {phase === "error" && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700">Error</p>
                    <p className="text-xs text-gray-500">
                      {errorMessage || "Something went wrong. Retrying…"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Disabled indicator ────────────────────────── */}
      {!isEnabled && (
        <div className="fixed bottom-32 left-4 z-1100">
          <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 rounded-full px-3 py-1.5 text-xs shadow-sm">
            <MicOff size={12} />
            Voice Nav Off
          </div>
        </div>
      )}
    </>
  );
}
