import { motion, AnimatePresence } from "framer-motion";

// ── Emotion → Image mapping ──────────────────────────────────────────────────
export type MascotEmotion =
  | "happy"        // split_1_1 — waving, welcoming
  | "thinking_ai"  // split_2_5 — AI lightbulb, verifying
  | "sorry"        // split_2_2 — apologetic, error
  | "pointing"     // split_3_1 — directing to next step
  | "neutral"      // split_1_5 — calm, standing
  | "loading"      // split_3_2 — patiently waiting
  | "celebration"  // split_3_5 — thumbs up, success
  | "thinking";    // split_2_4 — pondering

const EMOTION_MAP: Record<MascotEmotion, string> = {
  happy:       "/mascot/split_1_1.png",
  thinking_ai: "/mascot/split_2_5.png",
  sorry:       "/mascot/split_2_2.png",
  pointing:    "/mascot/split_3_1.png",
  neutral:     "/mascot/split_1_5.png",
  loading:     "/mascot/split_3_2.png",
  celebration: "/mascot/split_3_5.png",
  thinking:    "/mascot/split_2_4.png",
};

// ── Props ────────────────────────────────────────────────────────────────────
interface MascotGuideProps {
  emotion: MascotEmotion;
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { img: "w-16 h-16", bubble: "text-xs max-w-[180px]" },
  md: { img: "w-24 h-24", bubble: "text-xs max-w-[220px]" },
  lg: { img: "w-32 h-32", bubble: "text-sm max-w-[260px]" },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function MascotGuide({
  emotion,
  message,
  size = "md",
  className = "",
}: MascotGuideProps) {
  const s = SIZE_MAP[size];

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {/* Mascot character with float + crossfade */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        className="shrink-0"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={emotion}
            src={EMOTION_MAP[emotion]}
            alt={`Mascot — ${emotion}`}
            className={`${s.img} object-contain drop-shadow-md`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            draggable={false}
          />
        </AnimatePresence>
      </motion.div>

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, scale: 0.85, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.15 }}
            className={`relative bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-md border border-gray-100 ${s.bubble}`}
          >
            {/* Tail pointing to mascot */}
            <div className="absolute -left-1.5 bottom-2 w-3 h-3 bg-white border-l border-b border-gray-100 rotate-45" />
            <p className="text-gray-700 font-medium leading-snug relative z-10">
              {message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
