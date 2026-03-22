import { create } from "zustand";

export type VoicePhase = "idle" | "speaking" | "listening" | "processing" | "error";

interface VoiceNavState {
  /** Current phase of the voice loop */
  phase: VoicePhase;
  /** Whether the user has enabled voice navigation */
  isEnabled: boolean;
  /** Last STT transcript */
  transcript: string;
  /** Last LLM intent response */
  lastIntent: { action: string; target: string; speak: string } | null;
  /** Error message for display */
  errorMessage: string;

  // ── Actions ────────────────────────────
  setPhase: (phase: VoicePhase) => void;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setTranscript: (text: string) => void;
  setIntent: (intent: { action: string; target: string; speak: string }) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

export const useVoiceNavStore = create<VoiceNavState>((set, get) => ({
  phase: "idle",
  isEnabled: false,
  transcript: "",
  lastIntent: null,
  errorMessage: "",

  setPhase: (phase) => set({ phase, errorMessage: phase === "error" ? get().errorMessage : "" }),

  enable: () => set({ isEnabled: true, phase: "idle" }),
  disable: () => set({ isEnabled: false, phase: "idle", transcript: "", lastIntent: null, errorMessage: "" }),
  toggle: () => {
    const cur = get().isEnabled;
    if (cur) {
      get().disable();
    } else {
      get().enable();
    }
  },

  setTranscript: (text) => set({ transcript: text }),
  setIntent: (intent) => set({ lastIntent: intent }),
  setError: (msg) => set({ phase: "error", errorMessage: msg }),

  reset: () => set({ phase: "idle", transcript: "", lastIntent: null, errorMessage: "" }),
}));
