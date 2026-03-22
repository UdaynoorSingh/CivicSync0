import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVoiceNavStore } from "../store/voiceNavStore";
import { getVoiceConfig } from "../config/voiceNavConfig";
import { fetchTTSAudio, transcribeAudio, getVoiceIntent } from "../lib/voiceApi";

/**
 * Orchestration hook that drives the voice navigation loop:
 *  1. Page loads → look up route config → TTS greeting
 *  2. TTS finishes → start MediaRecorder (mic)
 *  3. Recording stops → STT transcribe
 *  4. Transcript → LLM intent router
 *  5. Intent → navigate (or stay / re-prompt)
 */
export function useVoiceNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isEnabled = useVoiceNavStore((s) => s.isEnabled);
  const phase = useVoiceNavStore((s) => s.phase);
  const setPhase = useVoiceNavStore((s) => s.setPhase);
  const setTranscript = useVoiceNavStore((s) => s.setTranscript);
  const setIntent = useVoiceNavStore((s) => s.setIntent);
  const setError = useVoiceNavStore((s) => s.setError);
  const reset = useVoiceNavStore((s) => s.reset);

  // Refs to manage MediaRecorder and audio playback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRunningRef = useRef(false);
  const abortRef = useRef(false);

  // ── Cleanup helper ─────────────────────
  const cleanup = useCallback(() => {
    abortRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    isRunningRef.current = false;
  }, []);

  // ── Step 1 & 2: Play TTS greeting ─────
  const playGreeting = useCallback(
    async (text: string): Promise<void> => {
      if (abortRef.current) return;
      setPhase("speaking");

      try {
        const base64Audio = await fetchTTSAudio(text);
        if (abortRef.current) return;

        // Decode base64 to AudioBuffer and play
        const binaryStr = atob(base64Audio);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (err) {
        console.error("[VoiceNav] TTS playback failed:", err);
        if (!abortRef.current) {
          setError("Unable to play audio. Please try again.");
        }
        throw err;
      }
    },
    [setPhase, setError],
  );

  // ── Step 3: Record microphone ──────────
  const recordMic = useCallback(async (): Promise<Blob> => {
    if (abortRef.current) throw new Error("Aborted");
    setPhase("listening");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    if (abortRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("Aborted");
    }

    return new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (chunks.length === 0) {
          reject(new Error("No audio recorded"));
        } else {
          resolve(new Blob(chunks, { type: "audio/webm" }));
        }
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        reject(new Error("Recording error"));
      };

      recorder.start();

      // ── Silence detection using AnalyserNode ──
      const audioCtx = new AudioContext();
      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      sourceNode.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let silenceStart = 0;
      const SILENCE_THRESHOLD = 20; // low energy threshold
      const SILENCE_DURATION = 2000; // 2s silence to stop
      const MAX_DURATION = 10000; // 10s max recording

      const startTime = Date.now();

      const checkSilence = () => {
        if (recorder.state !== "recording") return;
        if (abortRef.current) {
          recorder.stop();
          audioCtx.close();
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

        if (avg < SILENCE_THRESHOLD) {
          if (silenceStart === 0) silenceStart = Date.now();
          if (Date.now() - silenceStart > SILENCE_DURATION) {
            recorder.stop();
            audioCtx.close();
            return;
          }
        } else {
          silenceStart = 0;
        }

        // Hard timeout
        if (Date.now() - startTime > MAX_DURATION) {
          recorder.stop();
          audioCtx.close();
          return;
        }

        requestAnimationFrame(checkSilence);
      };

      requestAnimationFrame(checkSilence);
    });
  }, [setPhase]);

  // ── Full voice loop for one cycle ──────
  const runVoiceLoop = useCallback(async () => {
    if (isRunningRef.current || abortRef.current) return;
    isRunningRef.current = true;

    const config = getVoiceConfig(pathname);

    try {
      // Step 1-2: Play greeting
      await playGreeting(config.tts_greeting);
      if (abortRef.current) return;

      // Step 3: Record microphone
      const audioBlob = await recordMic();
      if (abortRef.current) return;

      // Step 4: Transcribe
      setPhase("processing");
      const transcript = await transcribeAudio(audioBlob);
      setTranscript(transcript);
      if (abortRef.current) return;

      if (!transcript.trim()) {
        setError("I didn't hear anything. Please try again.");
        isRunningRef.current = false;
        // Re-run loop after a short delay
        setTimeout(() => {
          if (!abortRef.current && isEnabled) {
            runVoiceLoop();
          }
        }, 2000);
        return;
      }

      // Step 5: Get intent
      const intent = await getVoiceIntent(pathname, config.valid_actions, transcript);
      setIntent(intent);
      if (abortRef.current) return;

      // Speak the response, then navigate
      if (intent.speak) {
        await playGreeting(intent.speak);
      }
      if (abortRef.current) return;

      // Handle navigate_and_fill: navigate + pass form data via route state
      if (intent.action === "navigate_and_fill" && intent.target) {
        reset();
        isRunningRef.current = false;
        navigate(intent.target, {
          state: { voiceFormData: intent.form_data },
        });
        return;
      }

      if (intent.action === "navigate" && intent.target && intent.target !== pathname) {
        // Reset before navigating – useEffect on pathname will re-trigger
        reset();
        isRunningRef.current = false;
        navigate(intent.target);
        return;
      }

      // "stay" or "error" – re-run loop
      reset();
      isRunningRef.current = false;
      setTimeout(() => {
        if (!abortRef.current && isEnabled) {
          runVoiceLoop();
        }
      }, 1000);
    } catch (err) {
      if (!abortRef.current) {
        console.error("[VoiceNav] Loop error:", err);
        setError("Something went wrong. Retrying...");
        isRunningRef.current = false;
        setTimeout(() => {
          if (!abortRef.current && isEnabled) {
            reset();
            runVoiceLoop();
          }
        }, 3000);
      }
    }
  }, [pathname, isEnabled, playGreeting, recordMic, setPhase, setTranscript, setIntent, setError, reset, navigate]);

  // ── Kick off loop when enabled + route changes ──
  useEffect(() => {
    if (!isEnabled) return;

    // Only run on citizen routes
    if (!pathname.startsWith("/citizen")) return;

    abortRef.current = false;
    isRunningRef.current = false;

    // Small delay to let page render before speaking
    const timer = setTimeout(() => {
      runVoiceLoop();
    }, 600);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [pathname, isEnabled, runVoiceLoop, cleanup]);

  // ── Cleanup on unmount ─────────────────
  useEffect(() => () => cleanup(), [cleanup]);

  /** Allow manual stop of the current recording */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { phase, stopRecording };
}
