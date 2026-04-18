import os
import json
import httpx
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from Quick_suggestions import get_quick_fix
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional
from Similar_complaint import check_complaint
from ChatBot import Query_answer
from Ai_image_Validator import process_complaint
import tempfile
from llm_fallback import call_llm_with_fallback_async
from Voice_Navigation import get_voice_intent

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://civic-sync0.vercel.app", 
        "http://localhost:5173" # Good to keep for local testing!
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class QueryRequest(BaseModel):
    query: str

@app.post("/get-fix")
def get_fix(request_data: QueryRequest):
    try:
        response = get_quick_fix(request_data.query)
        return response 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ComplaintRequest(BaseModel):
    prev_complaint: List[str]
    complaint: str

@app.post("/similar-complaint")
def similar_complaint(request_data: ComplaintRequest):
    try:
        response = check_complaint(request_data.complaint,request_data.prev_complaint)
        return response 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
class Question(BaseModel):
    que: str

@app.post("/get-answer")
def get_answer(request_data: Question):
    response = Query_answer(request_data.que)
    return response

class VerifyComplaintRequest(BaseModel):
    complaint_text: str
    image: str  # base64 data URL (e.g., "data:image/jpeg;base64,...")

@app.post("/verify_complaint")
async def verify_complaint(req: VerifyComplaintRequest):
    import base64 as b64

    # Strip the data URL prefix if present (e.g., "data:image/jpeg;base64,")
    image_data = req.image
    if "," in image_data:
        header, image_data = image_data.split(",", 1)
        # Extract extension from header like "data:image/png;base64"
        ext = ".jpg"  # default
        if "image/" in header:
            fmt = header.split("image/")[1].split(";")[0].split(")")[0]
            ext = f".{fmt}" if fmt else ".jpg"
    else:
        ext = ".jpg"

    try:
        image_bytes = b64.b64decode(image_data)
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "Invalid base64 image data"}
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
        temp_file.write(image_bytes)
        temp_path = temp_file.name

    try:
        result = process_complaint(temp_path, req.complaint_text)
        return JSONResponse(content=result)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "hi-IN"  # Default Hindi for Indian kiosk users

@app.post("/voice/tts")
async def voice_tts(req: TTSRequest):
    """Proxy to Sarvam AI TTS – converts text to speech audio (base64)."""
    if not SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="SARVAM_API_KEY not configured")
    
    payload = {
        "inputs": [req.text],
        "target_language_code": req.language or "hi-IN",
        "speaker": "anushka",
        "pace": 1.0,
        "model": "bulbul:v2",
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "API-Subscription-Key": SARVAM_API_KEY,
            },
        )
    
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Sarvam TTS error: {resp.text}")
    
    data = resp.json()
    audios = data.get("audios", [])
    if not audios:
        raise HTTPException(status_code=500, detail="No audio returned from Sarvam")
    
    return {"audio_base64": audios[0]}


@app.post("/voice/stt")
async def voice_stt(audio: UploadFile = File(...)):
    """Proxy to Groq Whisper – transcribes audio to text."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    audio_bytes = await audio.read()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            data={"model": "whisper-large-v3", "language": "en"},
            files={"file": (audio.filename or "recording.webm", audio_bytes, audio.content_type or "audio/webm")},
        )
    
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Groq STT error: {resp.text}")
    
    result = resp.json()
    return {"text": result.get("text", "")}


class IntentRequest(BaseModel):
    current_route: str
    valid_actions: List[dict]
    user_text: str

@app.post("/voice/intent")
async def voice_intent(req: IntentRequest):
    """Smart intent router — detects navigation."""
    try:
        intent = await get_voice_intent(req.current_route, req.valid_actions, req.user_text)
        return intent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/chat")
async def voice_chat(audio: UploadFile = File(...)):
    """Full RAG voice pipeline: Audio → STT → RAG Answer → TTS → Audio response.
    Replaces LiveKit for cloud-friendly deployment."""
    if not GROQ_API_KEY or not SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="API keys not configured")
    
    audio_bytes = await audio.read()
    
    # Step 1: STT — Groq Whisper
    async with httpx.AsyncClient(timeout=30.0) as client:
        stt_resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            data={"model": "whisper-large-v3", "language": "en"},
            files={"file": (audio.filename or "recording.webm", audio_bytes, audio.content_type or "audio/webm")},
        )
    
    if stt_resp.status_code != 200:
        raise HTTPException(status_code=stt_resp.status_code, detail=f"STT error: {stt_resp.text}")
    
    user_text = stt_resp.json().get("text", "")
    if not user_text.strip():
        return {"user_text": "", "answer": "I didn't hear anything. Please try again.", "audio_base64": None}
    
    # Step 2: RAG — ChatBot (Groq LLaMA 70b + FAISS vectorstore)
    rag_response = Query_answer(user_text)
    answer_text = rag_response.get("answer", "Sorry, I could not find an answer.")
    
    # Step 3: TTS — Sarvam AI (convert answer to speech)
    tts_payload = {
        "inputs": [answer_text[:500]],  # Sarvam has limits, truncate long answers
        "target_language_code": "hi-IN",
        "speaker": "anushka",
        "pace": 1.0,
        "model": "bulbul:v2",
    }
    
    audio_base64 = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            tts_resp = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json",
                },
                json=tts_payload,
            )
        
        if tts_resp.status_code == 200:
            tts_data = tts_resp.json()
            audio_base64 = tts_data.get("audios", [None])[0]
    except Exception as e:
        print(f"TTS error (non-fatal): {e}")
        # Return text-only response if TTS fails
    
    return {
        "user_text": user_text,
        "answer": answer_text,
        "audio_base64": audio_base64,
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

