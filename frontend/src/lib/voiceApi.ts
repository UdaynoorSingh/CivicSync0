// ── Voice Navigation API Service ─────────────────────────────────────────────
// Calls the FastAPI proxy endpoints for TTS, STT, and Intent routing.

const AI_BASE = (import.meta.env.VITE_AI_API_URL as string) || "http://localhost:8000";

/**
 * Call Sarvam TTS via backend proxy.
 * Returns a base64-encoded WAV string.
 */
export async function fetchTTSAudio(text: string, language = "hi-IN"): Promise<string> {
  const res = await fetch(`${AI_BASE}/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS failed: ${err}`);
  }

  const data = await res.json();
  return data.audio_base64 as string;
}

/**
 * Call Groq Whisper STT via backend proxy.
 * Sends an audio blob and returns the transcribed text.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  const res = await fetch(`${AI_BASE}/voice/stt`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`STT failed: ${err}`);
  }

  const data = await res.json();
  return data.text as string;
}

/**
 * Call Groq LLaMA intent router via backend proxy.
 * Returns the parsed intent JSON.
 */
export interface VoiceFormData {
  department?: string;
  category?: string;
  description?: string;
  urgency?: string;
  state?: string;
  district?: string;
  pincode?: string;
  streetAddress?: string;
  scope?: string;
}

export interface VoiceIntent {
  action: "navigate" | "navigate_and_fill" | "stay" | "error";
  target: string;
  speak: string;
  form_data?: VoiceFormData;
}

export async function getVoiceIntent(
  currentRoute: string,
  validActions: Array<{ intent: string; description: string; target_route: string }>,
  userText: string,
): Promise<VoiceIntent> {
  const res = await fetch(`${AI_BASE}/voice/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_route: currentRoute,
      valid_actions: validActions,
      user_text: userText,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Intent failed: ${err}`);
  }

  return (await res.json()) as VoiceIntent;
}
