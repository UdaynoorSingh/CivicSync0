import requests
import json
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel
import json
import PIL.Image

load_dotenv()

SIGHT_ENGINE_API_KEY=os.getenv("SIGHT_ENGINE_API_KEY")
SIGHT_ENGINE_API_USER=os.getenv("SIGHT_ENGINE_API_USER")

class ComplaintStatus(BaseModel):
    status: str

def Ai_image_detect(image_path):
    url = 'https://api.sightengine.com/1.0/check.json'

    params = {
        'models': 'genai',
        'api_user': SIGHT_ENGINE_API_USER,
        'api_secret': SIGHT_ENGINE_API_KEY
    }
    
    try:
        with open(image_path, 'rb') as f:
            files = {'media': f}
            response = requests.post(url, files=files, data=params)

        result = response.json()

        if result.get("status") == "success":
            ai_score = result.get("type", {}).get("ai_generated", 0)

            if ai_score > 0.60:
                return {
                    "status": "ai_generated",
                    "ai_score": ai_score
                }
            else:
                return {
                    "status": "real",
                    "ai_score": ai_score
                }
        else:
            return {
                "status": "api_error",
                "message": result.get("error", {}).get("message", "Unknown error")
            }

    except Exception as e:
        return {
            "status": "system_error",
            "message": str(e)
        }

def Verify_Complaint(image_path, complaint_text):
    client = genai.Client()

    try:
        img = PIL.Image.open(image_path)
    except Exception as e:
        return {"status": "error", "message": str(e)}

    prompt = f"""You are a strict AI complaint verification agent for a civic services platform.
Your job is to determine whether the uploaded image is a genuine visual evidence for the user's complaint.

User's complaint text: "{complaint_text}"

Follow these rules STRICTLY and IN ORDER:

STEP 1 — RELEVANCE CHECK:
Look at the image content. Does it show ANY kind of civic, infrastructure, public-service, 
or environmental issue (e.g., broken roads, fallen poles, garbage, water leaks, damaged wires, 
potholes, overflowing drains, faulty streetlights, etc.)?

If the image shows NONE of these and instead shows:
- Religious imagery, idols, temples, deities
- Selfies, portraits, or people posing
- Food, animals, nature/landscape photos
- Memes, screenshots, artwork, drawings
- Random objects unrelated to civic issues
- Any content that has NO connection to infrastructure, public services, or civic complaints

→ Return: {{"status": "irrelevant image"}}

STEP 2 — MATCH CHECK (only if image passed Step 1):
Does the image specifically match the complaint described?
For example, if the complaint is about "electricity pole broken" the image must show 
an electricity pole or electrical infrastructure with visible damage.

- If the image clearly shows the issue described in the complaint → Return: {{"status": "true complaint"}}
- If the complaint describes an issue that cannot be visually verified in a photo 
  (e.g., "power outage", "bad smell", "noise complaint", "intermittent water supply") 
  → Return: {{"status": "unambiguous complaint"}}
- If the image shows civic infrastructure but clearly does NOT match the complaint 
  (e.g., complaint says "broken road" but image shows a perfectly intact road, 
  or complaint says "water leak" but image shows electrical equipment with no water) 
  → Return: {{"status": "fake complaint"}}

Output ONLY a valid JSON object in this format: {{"status": "<your_status_choice>"}}
Do not include markdown tags like ```json.
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, img],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ComplaintStatus,
                temperature=0.0
            )
        )

        return json.loads(response.text)

    except Exception as e:
        print("Gemini Error:", str(e))
        return {"status": "error", "message": str(e)}

def process_complaint(image_path, complaint_text):

    ai_result = Ai_image_detect(image_path)

    if ai_result["status"] == "ai_generated":
        return {
            "status": "Ai_Generated",
            "ai_score": ai_result["ai_score"]
        }

    if ai_result["status"] in ["api_error", "system_error"]:
        return {
            "status": "error",
            "reason": ai_result.get("message")
        }

    gemini_result = Verify_Complaint(image_path, complaint_text)

    return {
        "status": gemini_result.get("status")
    }
