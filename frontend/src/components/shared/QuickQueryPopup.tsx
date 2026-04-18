import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Send,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Suggestion {
  id: string;
  query: string;
  answer: string;
  category: string;
}

const suggestions: Suggestion[] = [
  {
    id: "s1",
    query: "Power Outage / Broken Lines",
    answer: "DO: Unplug sensitive appliances. Stay away from fallen lines. DON'T: Try to fix utility poles yourself or assume lines are dead.",
    category: "Electricity",
  },
  {
    id: "s2",
    query: "Sparking Transformers",
    answer: "DO: Clear the area and call the emergency hotline. DON'T: Throw water on electrical fires or stand near the transformer.",
    category: "Electricity",
  },
  {
    id: "s3",
    query: "Major Water Pipe Burst",
    answer: "DO: Turn off your main water valve if flooding your property and report the location. DON'T: Attempt to seal high-pressure main pipes.",
    category: "Water",
  },
  {
    id: "s4",
    query: "Contaminated / Muddy Water",
    answer: "DO: Boil water safely before drinking. Report the affected supply zone. DON'T: Consume foul-smelling tap water directly.",
    category: "Water",
  },
  {
    id: "s5",
    query: "Garbage Pile-up / Dumping",
    answer: "DO: Segregate waste properly and use covered local bins. DON'T: Burn garbage in public spaces or dump waste in street drains.",
    category: "Sanitation",
  },
  {
    id: "s6",
    query: "Clogged Public Sewers",
    answer: "DO: Keep children and pets away from overflowing manholes. DON'T: Pour cooking oil or solid waste down drains to worsen the block.",
    category: "Sanitation",
  },
  {
    id: "s7",
    query: "Deep Potholes / Broken Roads",
    answer: "DO: Drive slowly in affected areas and report the specific street landmark. DON'T: Fill potholes with loose debris or trash.",
    category: "Roads",
  },
  {
    id: "s8",
    query: "Streetlight Malfunction",
    answer: "DO: Note the pole number and report it to the municipal department. DON'T: Attempt to pry open the light's control box.",
    category: "Roads",
  },
  {
    id: "s9",
    query: "Stray Animal Aggression",
    answer: "DO: Slowly back away and call animal control or emergency services. DON'T: Provoke, throw stones, or run suddenly from aggressive strays.",
    category: "Emergency",
  },
  {
    id: "s10",
    query: "Reporting a Gas Leak",
    answer: "DO: Open all windows, evacuate immediately, and call emergency services. DON'T: Turn electrical switches on/off or use lighters nearby.",
    category: "Emergency",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Electricity: "bg-yellow-100 text-yellow-800",
  Water: "bg-blue-100 text-blue-700",
  Sanitation: "bg-green-100 text-green-700",
  Roads: "bg-slate-100 text-slate-700",
  Emergency: "bg-red-100 text-red-700",
};

interface QuickQueryPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickQueryPopup({
  open,
  onClose,
}: QuickQueryPopupProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  const [aiResponse, setAiResponse] = useState<{
    quick_fix_instructions: string[];
    safety_warning?: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiBaseUrl = import.meta.env.VITE_AI_API_URL as string;

  // focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      setQuery("");
      setSelected(null);
      setAiResponse(null);
      setAiError(null);
    }
  }, [open]);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (aiResponse || aiError) {
          setAiResponse(null);
          setAiError(null);
        } else if (selected) {
          setSelected(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, aiResponse, aiError, onClose]);

  const handleSend = async () => {
    if (!query.trim()) return;
    setIsLoadingFix(true);
    setAiError(null);
    setAiResponse(null);
    setSelected(null);
    try {
      const res = await fetch(`${aiBaseUrl}/get-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error("Failed to get response from server");
      const data = await res.json();
      setAiResponse(data);
    } catch (err) {
      setAiError("Failed to fetch quick fix. Please try again.");
    } finally {
      setIsLoadingFix(false);
    }
  };

  const filtered =
    query.trim().length === 0
      ? suggestions
      : suggestions.filter(
          (s) =>
            s.query.toLowerCase().includes(query.toLowerCase()) ||
            s.category.toLowerCase().includes(query.toLowerCase()) ||
            s.answer.toLowerCase().includes(query.toLowerCase()),
        );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed top-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "88vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#1E3A5F] px-4 py-3.5 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Lightbulb size={17} className="text-amber-300 shrink-0" />
                <span className="text-white font-semibold text-sm">
                  Quick Help
                </span>
                <span className="text-blue-300 text-xs font-medium ml-1">
                  Ask anything about CivicSync
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#1E3A5F] focus-within:ring-1 focus-within:ring-[#1E3A5F]/20 transition-all">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                    setAiResponse(null);
                    setAiError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSend();
                    }
                  }}
                  placeholder="Type your question here…"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setSelected(null);
                      setAiResponse(null);
                      setAiError(null);
                      inputRef.current?.focus();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!query.trim() || isLoadingFix}
                  className="bg-[#1E3A5F] text-white p-1.5 rounded-md hover:bg-[#1E3A5F]/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[30px]"
                >
                  {isLoadingFix ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              <AnimatePresence mode="wait">
                {isLoadingFix ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-10 flex flex-col items-center gap-3 text-center"
                  >
                    <Loader2
                      size={24}
                      className="animate-spin text-[#1E3A5F]"
                    />
                    <p className="text-sm text-gray-500">
                      Generating quick fix...
                    </p>
                  </motion.div>
                ) : aiError ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-10 flex flex-col items-center gap-3 text-center"
                  >
                    <AlertTriangle size={24} className="text-red-500" />
                    <p className="text-sm text-red-600 font-medium">
                      {aiError}
                    </p>
                    <button
                      onClick={handleSend}
                      className="mt-2 text-xs font-semibold px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Try Again
                    </button>
                  </motion.div>
                ) : aiResponse ? (
                  <motion.div
                    key="ai-response"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4 pb-2"
                  >
                    {/* Back */}
                    <button
                      onClick={() => setAiResponse(null)}
                      className="text-xs text-[#1E3A5F] font-medium flex items-center gap-1 hover:underline"
                    >
                      ← Back to results
                    </button>

                    {/* AI Response Header */}
                    <div className="bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-[#1E3A5F] mb-1 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[#1E3A5F]" /> AI
                        Powered Quick Fix
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {query}
                      </p>
                    </div>

                    {/* Quick Fix Instructions */}
                    {aiResponse.quick_fix_instructions &&
                      aiResponse.quick_fix_instructions.length > 0 && (
                        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3">
                            Suggested Solution:
                          </h4>
                          <ul className="space-y-3">
                            {aiResponse.quick_fix_instructions.map(
                              (instruction, idx) => (
                                <li
                                  key={idx}
                                  className="flex gap-3 text-sm text-gray-700"
                                >
                                  <span className="w-5 h-5 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="leading-relaxed whitespace-pre-line">
                                    {instruction}
                                  </span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Safety Warning */}
                    {aiResponse.safety_warning && (
                      <div className="bg-amber-50 border border-amber-200 shadow-sm rounded-xl p-4 flex gap-3">
                        <AlertTriangle
                          size={18}
                          className="text-amber-600 shrink-0 mt-0.5"
                        />
                        <div>
                          <h4 className="text-sm font-semibold text-amber-800 mb-1">
                            Safety Warning
                          </h4>
                          <p className="text-sm text-amber-700 leading-relaxed">
                            {aiResponse.safety_warning}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : selected ? (
                  /* ── Answer card ── */
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    {/* Back */}
                    <button
                      onClick={() => setSelected(null)}
                      className="text-xs text-[#1E3A5F] font-medium flex items-center gap-1 hover:underline"
                    >
                      ← Back to results
                    </button>

                    {/* Question */}
                    <div className="bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-[#1E3A5F] mb-1 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[selected.category]}`}
                        >
                          {selected.category}
                        </span>
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {selected.query}
                      </p>
                    </div>

                    {/* Answer */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-3.5 flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={13} className="text-white" />
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selected.answer}
                      </p>
                    </div>
                  </motion.div>
                ) : filtered.length > 0 ? (
                  /* ── Suggestion list ── */
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    className="space-y-2"
                  >
                    {query.trim() === "" && (
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide pb-1">
                        Suggested topics
                      </p>
                    )}
                    {filtered.map((s) => (
                      <motion.button
                        key={s.id}
                        layout
                        onClick={() => setSelected(s)}
                        className="w-full text-left flex items-center gap-3 bg-gray-50 hover:bg-[#1E3A5F]/5 border border-gray-100 hover:border-[#1E3A5F]/20 rounded-xl px-3.5 py-3 group transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">
                            {s.query}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block ${CATEGORY_COLORS[s.category]}`}
                          >
                            {s.category}
                          </span>
                        </div>
                        <ArrowRight
                          size={15}
                          className="text-gray-300 group-hover:text-[#1E3A5F] transition-colors shrink-0"
                        />
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  /* ── Empty state ── */
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-10 flex flex-col items-center gap-3 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Search size={20} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      No results found
                    </p>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Try a different keyword, or contact support via the Help
                      section.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer hint */}
            {!(selected || isLoadingFix || aiResponse || aiError) && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/80 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#1E3A5F]/50" />
                <p className="text-[11px] text-gray-400">
                  For complex issues use the{" "}
                  <span className="font-semibold text-[#1E3A5F]">
                    AI Assistant
                  </span>{" "}
                  button on the bottom-right.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
