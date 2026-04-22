# CivicSync Voice Navigation Documentation

This document explains the internal working of the voice navigation pipeline in CivicSync, which enables seamless, voice-driven interaction for visually impaired or non-tech-savvy users in India.

## 1. High-Level Flow

1. **User lands on a page** → The system speaks a localized greeting (TTS).
2. **System Listens** → Microphone turns on and records until the user stops speaking.
3. **Transcription (STT)** → The recorded audio is converted to text.
4. **Intent Resolution** → A large language model determines the user's intended action based on the spoken text and the available valid actions on the current page.
5. **Execution** → The application navigates to a new route, possibly with pre-filled form data, or gives feedback via TTS.

---

## 2. Frontend Architecture

### 2.1 State Management (`store/voiceNavStore.ts`)
A Zustand store (`useVoiceNavStore`) acts as the single source of truth for the voice assistant. It tracks:
* **`isEnabled`**: Boolean flag toggling the feature on/off globally.
* **`phase`**: Enum representing the current loop state (`idle`, `speaking`, `listening`, `processing`, `error`).
* **`transcript`**: The resolved text from the latest user recording.
* **`lastIntent`**: Structured JSON defining the recognized command and routing info.

### 2.2 The Orchestrator Hook (`hooks/useVoiceNavigation.ts`)
This React hook controls the lifecycle and continuous playback/recording loop:
* **TTS Playback (`playGreeting`)**: Uses the `AudioContext` and `BufferSource` APIs to seamlessly play the base64-encoded audio received from the backend. 
* **Mic Recording & Silence Detection (`recordMic`)**: Obtains a `MediaStream` from the browser microphone. It pipes the stream via `AnalyserNode` to continuously monitor frequency data. If the signal drops below a set `SILENCE_THRESHOLD` for `2000ms`, the recording automatically halts and prepares it as a `webm` Blob for transcription.
* **Event Loop (`runVoiceLoop`)**: Automates the sequential async flow (Greet → Record → Transcribe → Intent Match → React Router Navigation).
* **Navigation Pre-Fill**: If the intent router designates an action of `navigate_and_fill`, it pushes the LLM-extracted structured JSON as `voiceFormData` into React Router's state (`navigate(target, { state: ... })`).

### 2.3 Mapping Validation (`config/voiceNavConfig.ts`)
The `getVoiceConfig(pathname)` module controls how the voice feature behaves on each specific page. It defines:
* The initial **TTS Greeting** text.
* An array of **Valid Actions** (`valid_actions`) declaring where the user is allowed to navigate from the current page and describing the intent context.

### 2.4 Voice API File (`lib/voiceApi.ts`)
Fetches endpoints on the FastAPI server instance, passing Web Audio Blobs using `FormData` APIs and receiving JSON metadata in return.

---

## 3. Backend Architecture (FastAPI Proxy)

The logic sits inside `ai_backend/server.py` and `ai_backend/Voice_Navigation.py`. It orchestrates external AI layers.

### 3.1 Text-to-Speech (`/voice/tts`)
* **Service**: Sarvam AI (`bulbul:v2` model).
* **Process**: Accepts text (typically Hindi) from the React frontend, contacts Sarvam's API with `anushka` speaker properties, and returns base64-encoded WAV strings back to the client.

### 3.2 Speech-to-Text Transcription (`/voice/stt`)
* **Service**: Groq (hosting OpenAI's `whisper-large-v3`).
* **Process**: Accepts the `webm` audio upload payload, proxies it natively via Groq's low-latency inference endpoints, and streams back the recognized Hindi / Hinglish text string.

### 3.3 Intent Router (`/voice/intent`)
* **Service**: Groq (hosting `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`).
* **Implementation (`Voice_Navigation.py`)**: 
    - Takes three critical pieces of input: `current_route`, `valid_actions` config, and `user_text`.
    - Formats a restrictive **System Prompt**, enforcing the LLM to map the `user_text` only to the options presented in `valid_actions`.
    - It enforces JSON mode response output formatting via the LLM API using the keys: `action` (navigate, stay, error), `target` (/path), and `speak` (friendly Hindi confirmation text).
    - It runs through a unified `call_llm_with_fallback_async` script, building high availability across deepseek, groq, etc.

## 4. Example Lifecycle (Home Page -> Register Complaint)
1. **React**: User enters `/citizen`. 
2. **Hook**: Calls TTS with "Namaste, aap kya karna chahte hain?"
3. **User Speaks**: "Bijli kharab hai, complaint dalna hai."
4. **Hook**: Detects silence, stops Mic, posts `webm` to `/voice/stt`.  
5. **Backend**: Groq Whisper transcribes: "bijli kharab hai complaint dalna hai".
6. **Hook**: Sends transcript to `/voice/intent` alongside `valid_actions`.
7. **Backend**: LLM infers this matches the "Register a new complaint" valid action. Responds with target `{"action": "navigate_and_fill", "target": "/citizen/register-complaint", "speak": "Theek hai, chaliye shikayat darj karte hain."}`.
8. **React**: The hook speaks the confirmation audio via `/voice/tts`.
9. **React**: `navigate()` activates changing the DOM, and passes the required form intent parameters along. Loop restarts.
