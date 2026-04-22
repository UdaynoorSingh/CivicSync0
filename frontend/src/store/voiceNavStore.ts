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

  // ── Form Filling Mode ──────────────────
  /** Whether form-filling mode is active */
  formFillingActive: boolean;
  /** Index of the field currently being asked about */
  currentFieldIndex: number;
  /** Total number of fields in the current form */
  totalFields: number;
  /** Accumulated field key → value pairs */
  formValues: Record<string, string>;
  /** Route of the form we're currently filling */
  currentFormRoute: string;
  /** Label of the field currently being filled (for UI display) */
  currentFieldLabel: string;

  // ── Actions ────────────────────────────
  setPhase: (phase: VoicePhase) => void;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setTranscript: (text: string) => void;
  setIntent: (intent: { action: string; target: string; speak: string }) => void;
  setError: (msg: string) => void;
  reset: () => void;

  // ── Form Filling Actions ───────────────
  startFormFilling: (route: string, totalFields: number) => void;
  setFieldValue: (key: string, value: string) => void;
  setCurrentFieldIndex: (index: number) => void;
  setCurrentFieldLabel: (label: string) => void;
  nextField: () => void;
  exitFormFilling: () => void;
}

export const useVoiceNavStore = create<VoiceNavState>((set, get) => ({
  phase: "idle",
  isEnabled: false,
  transcript: "",
  lastIntent: null,
  errorMessage: "",

  // Form filling defaults
  formFillingActive: false,
  currentFieldIndex: 0,
  totalFields: 0,
  formValues: {},
  currentFormRoute: "",
  currentFieldLabel: "",

  setPhase: (phase) => set({ phase, errorMessage: phase === "error" ? get().errorMessage : "" }),

  enable: () => set({ isEnabled: true, phase: "idle" }),
  disable: () => set({
    isEnabled: false, phase: "idle", transcript: "", lastIntent: null, errorMessage: "",
    formFillingActive: false, currentFieldIndex: 0, totalFields: 0, formValues: {},
    currentFormRoute: "", currentFieldLabel: "",
  }),
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

  // ── Form Filling Actions ───────────────
  startFormFilling: (route, totalFields) => set({
    formFillingActive: true,
    currentFieldIndex: 0,
    totalFields,
    formValues: {},
    currentFormRoute: route,
    currentFieldLabel: "",
  }),

  setFieldValue: (key, value) => set((state) => ({
    formValues: { ...state.formValues, [key]: value },
  })),

  setCurrentFieldIndex: (index) => set({ currentFieldIndex: index }),
  setCurrentFieldLabel: (label) => set({ currentFieldLabel: label }),

  nextField: () => set((state) => ({
    currentFieldIndex: state.currentFieldIndex + 1,
  })),

  exitFormFilling: () => set({
    formFillingActive: false,
    currentFieldIndex: 0,
    totalFields: 0,
    currentFormRoute: "",
    currentFieldLabel: "",
    // Keep formValues so the form page can read the final values
  }),
}));
