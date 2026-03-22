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

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://civicsync-new.vercel.app", 
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


# ── Voice Navigation Endpoints ────────────────────────────────────────────────

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
    # Sarvam returns { "audios": ["base64..."] }
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
    """Smart intent router — detects navigation AND extracts complaint/form data in one step."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    actions_str = json.dumps(req.valid_actions, indent=2)
    
    system_prompt = f"""You are a smart intent router for a civic services kiosk in India. 
The user is currently on the page: {req.current_route}

The valid actions the user can take from this page are:
{actions_str}

Your job:
1. Determine which action best matches the user's spoken text.
2. IMPORTANT: If the user describes a civic issue/complaint (e.g. "bijli ka wire gir gaya Sector 15 Karnal mein"), you must:
   - Set action to "navigate_and_fill"
   - Set target to "/citizen/complaint/new"
   - Extract ALL form data from their speech into a "form_data" object
3. Return ONLY a valid JSON object.

Output format for NAVIGATION:
{{"action": "navigate", "target": "<route>", "speak": "<Hindi confirmation>"}}

Output format for COMPLAINT with details (navigate + auto-fill form):
{{"action": "navigate_and_fill", "target": "/citizen/complaint/new", "speak": "<Hindi confirmation>", "form_data": {{
  "department": "electricity|water|gas|sanitation|waste",
  "category": "<specific category like Power Outage, Water Leakage, Gas Leak, etc.>",
  "description": "<user's complaint in their own words>",
  "urgency": "low|medium|high",
  "state": "<Indian state if mentioned>",
  "district": "<district if mentioned>",
  "pincode": "<pincode if mentioned>",
  "streetAddress": "<street/area/sector if mentioned>",
  "scope": "personal|locality"
}}}}

Output format for STAY:
{{"action": "stay", "target": "{req.current_route}", "speak": "<Hindi response>"}}

Output format for ERROR:
{{"action": "error", "target": "{req.current_route}", "speak": "<Hindi asking to repeat>"}}

Department mapping:
- Electricity issues (bijli, wire, power, light, meter, voltage) → "electricity"
- Water issues (paani, pipeline, leakage, nala, supply) → "water"  
- Gas issues (gas, pipeline, cylinder) → "gas"
- Sanitation issues (sewage, drain, toilet, ganda paani) → "sanitation"
- Waste issues (kachra, garbage, safai, dumping) → "waste"

Urgency mapping:
- Keywords like khatarnak, emergency, jaldi, turant, aag → "high"
- Normal complaints → "medium"
- Minor / suggestions → "low"

Rules:
- The "speak" value MUST be in Hindi.
- The "speak" value MUST be ONLY plain text. Do NOT use any markdown (no bold **, no headers #, no backticks `).
- For form_data, only include fields that the user actually mentioned. Omit unknown fields.
- If user just wants to navigate without describing a complaint, use regular "navigate" action.
- NEVER return anything other than the JSON object."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.user_text},
    ]
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 512,
                "response_format": {"type": "json_object"},
            },
        )
    
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Groq LLM error: {resp.text}")
    
    result = resp.json()
    content = result["choices"][0]["message"]["content"]
    
    try:
        intent = json.loads(content)
    except json.JSONDecodeError:
        intent = {"action": "error", "target": req.current_route, "speak": "माफ़ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बोलें।"}
    
    return intent


class FillFormRequest(BaseModel):
    transcript: str
    form_type: Optional[str] = "complaint"  # "complaint" or "service_request"

@app.post("/voice/fill-form")
async def voice_fill_form(req: FillFormRequest):
    """Extract structured form fields from natural speech using Groq LLaMA 3.3 70B."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    if req.form_type == "service_request":
        schema_desc = """Extract these fields:
- "service_type": "electricity|water|gas"
- "request_type": "new_connection|reconnection|meter_replacement|load_change"  
- "applicant_name": string (if mentioned)
- "contact_phone": string (if mentioned)
- "street_address": string (area/sector/house)
- "state": Indian state name
- "district": district name
- "pincode": 6-digit pincode
- "additional_notes": any extra details"""
    else:
        schema_desc = """Extract these fields:
- "department": "electricity|water|gas|sanitation|waste"
- "category": specific category (Power Outage, Water Leakage, Gas Leak, Sewage Overflow, Garbage Not Collected, Streetlight Fault, Road Damage, etc.)
- "description": the user's complaint in their own words (clean it up but keep the meaning)
- "urgency": "low|medium|high" (khatarnak/emergency/jaldi = high, normal = medium, minor = low)
- "state": Indian state name if mentioned
- "district": district name if mentioned
- "pincode": 6-digit pincode if mentioned
- "street_address": street/area/sector if mentioned
- "scope": "personal|locality" (personal if affects just them, locality if affects the community)"""

    system_prompt = f"""You are a form-filling assistant for an Indian civic services kiosk.
The user has spoken their request in natural language (possibly Hindi, Hinglish, or English).

Your job: Extract structured form data from the speech.

{schema_desc}

Rules:
- Only include fields that the user actually mentioned or that can be clearly inferred.
- Return ONLY a valid JSON object with the extracted fields.
- If a field cannot be determined, do NOT include it in the output.
- Clean up the description but preserve the user's meaning.
- Translate Hindi department/category keywords to the correct English values."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.transcript},
    ]
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 512,
                "response_format": {"type": "json_object"},
            },
        )
    
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Groq LLM error: {resp.text}")
    
    result = resp.json()
    content = result["choices"][0]["message"]["content"]
    
    try:
        form_data = json.loads(content)
    except json.JSONDecodeError:
        form_data = {}
    
    return {"form_data": form_data}


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

