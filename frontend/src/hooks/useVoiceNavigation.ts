import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVoiceNavStore } from "../store/voiceNavStore";
import { getVoiceConfig, DEPT_CATEGORIES } from "../config/voiceNavConfig";
import { fetchTTSAudio, transcribeAudio, getVoiceIntent, extractFormField } from "../lib/voiceApi";
import { useSessionStore } from "../store/sessionStore";

/**
 * Orchestration hook that drives the voice navigation loop:
 *  1. Page loads → look up route config → TTS greeting
 *  2. TTS finishes → start MediaRecorder (mic)
 *  3. Recording stops → STT transcribe
 *  4. Transcript → LLM intent router
 *  5. Intent → navigate (or stay / re-prompt)
 *
 * On form pages (with form_fields config), switches to form-filling mode:
 *  1. Read the current field question via TTS (with options if applicable)
 *  2. Record user's answer
 *  3. Extract structured value via LLM
 *  4. Confirm via TTS → advance to next field
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

  // Form filling actions
  const startFormFilling = useVoiceNavStore((s) => s.startFormFilling);
  const setFieldValue = useVoiceNavStore((s) => s.setFieldValue);
  const setCurrentFieldIndex = useVoiceNavStore((s) => s.setCurrentFieldIndex);
  const setCurrentFieldLabel = useVoiceNavStore((s) => s.setCurrentFieldLabel);
  const exitFormFilling = useVoiceNavStore((s) => s.exitFormFilling);

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

  // ══════════════════════════════════════════════════════════
  // ── STANDARD NAVIGATION LOOP (existing behavior) ────────
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // ── FORM-FILLING LOOP (new: field-by-field) ─────────────
  // ══════════════════════════════════════════════════════════
  const runFormFillingLoop = useCallback(async () => {
    if (isRunningRef.current || abortRef.current) return;
    isRunningRef.current = true;

    const config = getVoiceConfig(pathname);
    const formFields = config.form_fields;
    if (!formFields || formFields.length === 0) {
      isRunningRef.current = false;
      return;
    }

    try {
      // Play initial greeting
      await playGreeting(config.tts_greeting);
      if (abortRef.current) return;

      // Initialize form filling mode in store
      startFormFilling(pathname, formFields.length);

      // Get pre-filled values from user profile (check sessionStore)
      const prefilledValues = getPrefilledValues(pathname);

      let fieldIndex = 0;

      while (fieldIndex < formFields.length) {
        if (abortRef.current) return;

        const field = formFields[fieldIndex];
        setCurrentFieldIndex(fieldIndex);
        setCurrentFieldLabel(field.label);

        if (field.show_if) {
          const currentFormValues = useVoiceNavStore.getState().formValues;
          if (currentFormValues[field.show_if.field] !== field.show_if.value) {
            fieldIndex++;
            continue;
          }
        }

        // Skip pre-filled fields if configured
        if (field.skip_if_prefilled && prefilledValues[field.key]) {
          const prefVal = prefilledValues[field.key];
          setFieldValue(field.key, prefVal);
          // Dispatch update event for form page
          dispatchFormUpdate(field.key, prefVal, field.step);
          fieldIndex++;
          continue;
        }

        // Resolve dynamic options (e.g. category depends on department)
        let fieldOptions = field.options ?? [];
        let ttsPrompt = field.tts_prompt;

        if (field.depends_on === "department") {
          const currentFormValues = useVoiceNavStore.getState().formValues;
          const selectedDept = currentFormValues["department"] ?? "";
          fieldOptions = DEPT_CATEGORIES[selectedDept] ?? [];
          if (fieldOptions.length > 0) {
            const optionsHindi = fieldOptions.join(", ");
            ttsPrompt = `${field.tts_prompt} विकल्प हैं: ${optionsHindi}।`;
          }
        }

        // Also append options to TTS prompt for select/radio fields with static options
        if (field.type !== "text" && fieldOptions.length > 0 && !field.depends_on) {
          // Already included in tts_prompt for most fields, so skip re-appending
        }

        let retries = 0;
        const MAX_RETRIES = 2;
        let fieldFilled = false;

        while (retries <= MAX_RETRIES && !fieldFilled) {
          if (abortRef.current) return;

          // 1. Ask the question via TTS
          await playGreeting(ttsPrompt);
          if (abortRef.current) return;

          if (field.type === "manual") {
            await new Promise(resolve => setTimeout(resolve, 8000));
            if (abortRef.current) return;
            fieldFilled = true;
            break;
          }

          // 2. Record user's answer
          const audioBlob = await recordMic();
          if (abortRef.current) return;

          // 3. Transcribe
          setPhase("processing");
          const transcript = await transcribeAudio(audioBlob);
          setTranscript(transcript);
          if (abortRef.current) return;

          if (!transcript.trim()) {
            retries++;
            if (retries <= MAX_RETRIES) {
              ttsPrompt = "मुझे कुछ सुनाई नहीं दिया। कृपया दोबारा बोलें।";
            }
            continue;
          }

          // Check for "go back" / "wapas" commands during form filling
          const lowerTranscript = transcript.toLowerCase();
          if (
            lowerTranscript.includes("wapas") ||
            lowerTranscript.includes("back") ||
            lowerTranscript.includes("peeche") ||
            lowerTranscript.includes("cancel")
          ) {
            await playGreeting("ठीक है, फॉर्म भरना रोक रहे हैं। आप डैशबोर्ड पर वापस जा रहे हैं।");
            exitFormFilling();
            reset();
            isRunningRef.current = false;
            navigate("/citizen");
            return;
          }

          // Check for "skip" command
          if (
            lowerTranscript.includes("skip") ||
            lowerTranscript.includes("chhod") ||
            lowerTranscript.includes("aage")
          ) {
            if (!field.required) {
              await playGreeting("ठीक है, इसे छोड़ रहे हैं।");
              fieldFilled = true;
              break;
            } else {
              ttsPrompt = "यह फ़ील्ड ज़रूरी है, कृपया इसका जवाब दें।";
              retries++;
              continue;
            }
          }

          // 4. Extract field value via LLM
          const result = await extractFormField(
            field.label,
            field.type,
            fieldOptions,
            transcript
          );
          if (abortRef.current) return;

          if (result.confidence === "high" && result.value) {
            // 5. Confirm via TTS
            await playGreeting(result.speak);
            if (abortRef.current) return;

            // 6. Store value
            setFieldValue(field.key, result.value);

            // 7. Dispatch update for form page to react to
            dispatchFormUpdate(field.key, result.value, field.step);

            fieldFilled = true;
          } else {
            // Low confidence — retry
            retries++;
            if (retries <= MAX_RETRIES) {
              ttsPrompt = result.speak || "माफ़ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बोलें।";
            } else {
              // Give up — tell user to fill manually
              await playGreeting("माफ़ कीजिए, मैं इसे समझ नहीं पा रहा। कृपया इसे स्क्रीन पर भरें।");
              fieldFilled = true; // Move on
            }
          }
        }

        fieldIndex++;

        // Check if we crossed a step boundary — notify form page to advance step
        if (fieldIndex < formFields.length) {
          const nextField = formFields[fieldIndex];
          const currentField = formFields[fieldIndex - 1];
          if (nextField.step > currentField.step) {
            // Special handling: Before moving to Step 3 in complaint form, remind user to upload photo
            if (pathname === "/citizen/complaint/new" && currentField.step === 2 && nextField.step === 3) {
              await playGreeting("चरण दो पूरा हुआ। कृपया समस्या की एक फोटो अपलोड करने के लिए स्क्रीन पर tap करें। फोटो अपलोड करने के बाद, मैं आगे बढ़ूँगा।");
              if (abortRef.current) return;

              // Wait for user to interact with the upload button
              await new Promise(resolve => setTimeout(resolve, 5000));
              if (abortRef.current) return;
            }

            // Announce step transition
            let stepMsg = "अगले चरण पर चलते हैं।";
            if (nextField.step === 2) {
              stepMsg = "चरण एक पूरा हुआ। अब चरण दो पर चलते हैं।";
            } else if (nextField.step === 3) {
              if (pathname === "/citizen/complaint/new") {
                stepMsg = "अब आखिरी चरण पर चलते हैं, स्थान की जानकारी भरें।";
              } else if (pathname === "/citizen/service/new") {
                stepMsg = ""; // Handled by the manual field's own tts_prompt
              }
            }
            
            if (stepMsg) {
              await playGreeting(stepMsg);
              if (abortRef.current) return;
            }

            // Dispatch step change
            dispatchStepChange(nextField.step);
          }
        }
      }

      // All fields complete
      if (!abortRef.current) {
        await playGreeting("बहुत अच्छा! फॉर्म पूरा हो गया है। कृपया स्क्रीन पर सारी जानकारी देखें और सबमिट बटन दबाएं।");

        // Advance to the last step for review
        const lastStep = formFields[formFields.length - 1].step;
        dispatchStepChange(lastStep);

        exitFormFilling();
        isRunningRef.current = false;

        // Fall into standard navigation loop for post-form interaction
        setTimeout(() => {
          if (!abortRef.current && isEnabled) {
            reset();
            runVoiceLoop();
          }
        }, 2000);
      }
    } catch (err) {
      if (!abortRef.current) {
        console.error("[VoiceNav] Form filling error:", err);
        setError("फॉर्म भरने में समस्या आई। दोबारा प्रयास कर रहे हैं...");
        exitFormFilling();
        isRunningRef.current = false;
        setTimeout(() => {
          if (!abortRef.current && isEnabled) {
            reset();
            runVoiceLoop(); // Fall back to standard nav
          }
        }, 3000);
      }
    }
  }, [
    pathname, isEnabled, playGreeting, recordMic, setPhase, setTranscript,
    setError, reset, navigate, startFormFilling, setFieldValue,
    setCurrentFieldIndex, setCurrentFieldLabel, exitFormFilling, runVoiceLoop,
  ]);

  // ── Kick off loop when enabled + route changes ──
  useEffect(() => {
    if (!isEnabled) return;

    // Only run on citizen routes
    if (!pathname.startsWith("/citizen")) return;

    abortRef.current = false;
    isRunningRef.current = false;

    const config = getVoiceConfig(pathname);
    const hasFormFields = config.form_fields && config.form_fields.length > 0;

    // Small delay to let page render before speaking
    const timer = setTimeout(() => {
      if (hasFormFields) {
        runFormFillingLoop();
      } else {
        runVoiceLoop();
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [pathname, isEnabled, runVoiceLoop, runFormFillingLoop, cleanup]);

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

// ── Helper: Dispatch custom events so form pages can react ──────────────────
function dispatchFormUpdate(key: string, value: string, step: number) {
  window.dispatchEvent(
    new CustomEvent("voice-form-update", {
      detail: { key, value, step },
    })
  );
}

function dispatchStepChange(step: number) {
  window.dispatchEvent(
    new CustomEvent("voice-step-change", {
      detail: { step },
    })
  );
}

/**
 * Get pre-filled values from sessionStore (user profile).
 * These are fields that can be skipped if the user already has them in their profile.
 */
function getPrefilledValues(pathname: string): Record<string, string> {
  try {
    // Access zustand store directly (outside React hook — getState is safe)
    const sessionState = useSessionStore.getState();
    const user = sessionState.user;
    if (!user) return {};

    const values: Record<string, string> = {};

    if (user.address?.state) values["state"] = user.address.state;
    if (user.districtName) values["district"] = user.districtName;
    if (user.address?.pincode) values["pincode"] = user.address.pincode;
    if (user.address?.street) values["streetAddress"] = user.address.street;

    // Service request page additional prefills
    if (pathname === "/citizen/service/new") {
      if (user.name) values["applicantName"] = user.name;
      if (user.mobile) {
        values["contactPhone"] = user.mobile.replace(/^\+91/, "").slice(-10);
      }
    }

    return values;
  } catch {
    return {};
  }
}
