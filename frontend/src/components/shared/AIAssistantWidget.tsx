import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Send, Loader2, Volume2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { aiResponses } from "../../data/dummyData";

interface Message {
  id: string;
  from: "ai" | "user";
  text: string;
}

const quickQuestions = [
  "How do I pay my bill?",
  "How to register a complaint?",
  "Track my request status",
  "Emergency contacts",
];

type VoiceState = "idle" | "recording" | "processing" | "speaking";

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const { pathname } = useLocation();
  const aiBaseUrl = import.meta.env.VITE_AI_API_URL as string;

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getResponses = () => aiResponses[pathname] ?? aiResponses.default;

  // ── Text chat (existing) ──────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch(`${aiBaseUrl}/get-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ que: text }),
      });

      if (res.ok) {
        const reply = await res.json();
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), from: "ai", text: reply.answer },
        ]);
      }
    } catch (err) {
      console.error("Could not send the message, please try again later", err);
    } finally {
      setTyping(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      const responses = getResponses();
      setMessages([{ id: "0", from: "ai", text: responses[0] }]);
    }
  };

  // ── Voice chat (REST-based, replaces LiveKit) ──
  const playBase64Audio = useCallback(async (base64: string) => {
    try {
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const buffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    } catch (err) {
      console.error("[Voice] Audio playback failed:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startVoiceChat = useCallback(async () => {
    if (voiceState !== "idle") return;
    setVoiceState("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunks.length === 0) {
          setVoiceState("idle");
          return;
        }

        const blob = new Blob(chunks, { type: "audio/webm" });
        setVoiceState("processing");

        // Send to /voice/chat (STT → RAG → TTS in one call)
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch(`${aiBaseUrl}/voice/chat`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Voice chat failed");

          const data = await res.json();

          // Add user's transcribed text as a message
          if (data.user_text) {
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), from: "user", text: data.user_text },
            ]);
          }

          // Add AI answer as a message
          if (data.answer) {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                from: "ai",
                text: data.answer,
              },
            ]);
          }

          // Play TTS audio if available
          if (data.audio_base64) {
            setVoiceState("speaking");
            await playBase64Audio(data.audio_base64);
          }
        } catch (err) {
          console.error("[Voice] Chat error:", err);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              from: "ai",
              text: "Sorry, voice chat failed. Please try typing instead.",
            },
          ]);
        }

        setVoiceState("idle");
      };

      recorder.start();

      // Silence detection
      const audioCtx = new AudioContext();
      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      sourceNode.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let silenceStart = 0;
      const startTime = Date.now();

      const checkSilence = () => {
        if (recorder.state !== "recording") return;

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

        if (avg < 20) {
          if (silenceStart === 0) silenceStart = Date.now();
          if (Date.now() - silenceStart > 2000) {
            recorder.stop();
            audioCtx.close();
            return;
          }
        } else {
          silenceStart = 0;
        }

        if (Date.now() - startTime > 15000) {
          recorder.stop();
          audioCtx.close();
          return;
        }

        requestAnimationFrame(checkSilence);
      };

      requestAnimationFrame(checkSilence);
    } catch (err) {
      console.error("[Voice] Mic access error:", err);
      setVoiceState("idle");
    }
  }, [voiceState, aiBaseUrl, playBase64Audio]);

  // Voice button label/icon
  const voiceIcon = () => {
    switch (voiceState) {
      case "recording":
        return <MicOff size={18} className="text-red-500" />;
      case "processing":
        return <Loader2 size={18} className="animate-spin" />;
      case "speaking":
        return <Volume2 size={18} className="text-blue-500" />;
      default:
        return <Mic size={18} />;
    }
  };

  const voiceTitle = () => {
    switch (voiceState) {
      case "recording":
        return "Listening… tap to stop";
      case "processing":
        return "Processing…";
      case "speaking":
        return "Speaking…";
      default:
        return "Tap to speak";
    }
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handleOpen}
        className="fixed bottom-16 right-4 z-40 w-16 h-16 rounded-full bg-[#1E3A5F] shadow-lg flex items-center justify-center text-white"
        title="AI Assistant"
      >
        <img src="/mascot/split_1_1.png" alt="Chatbot Mascot" className="w-12 h-12 object-contain drop-shadow" draggable={false} />
        <span className="absolute 1 top-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-24 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "70vh", height: "500px" }}
          >
            {/* Header */}
            <div className="bg-[#1E3A5F] text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-2">
                <img src="/mascot/split_1_1.png" alt="Mascot" className="w-6 h-6 object-contain" draggable={false} />
                <span className="font-semibold text-sm">
                  CivicSync AI Assistant
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.from === "user"
                        ? "bg-[#1E3A5F] text-white rounded-br-sm"
                        : "bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl rounded-bl-sm px-4 py-2">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.7,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {voiceState === "recording" && (
                <div className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-2">
                    <motion.div
                      className="w-3 h-3 bg-red-500 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                    <span className="text-sm text-red-600 font-medium">
                      Listening…
                    </span>
                  </div>
                </div>
              )}
              {voiceState === "processing" && (
                <div className="flex justify-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">
                      Thinking…
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Questions */}
            {messages.length <= 1 && (
              <div className="px-3 py-2 flex flex-wrap gap-1.5 bg-white border-t border-gray-100">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-2 py-1 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
              <button
                onClick={
                  voiceState === "recording" ? stopRecording : startVoiceChat
                }
                disabled={voiceState === "processing" || voiceState === "speaking"}
                className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={voiceTitle()}
              >
                {voiceIcon()}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Ask anything..."
                className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400 py-1"
              />
              <button
                onClick={() => sendMessage(input)}
                className="p-1.5 text-[#1E3A5F] hover:bg-blue-50 rounded-full transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
