import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def check_complaint(new_complaint: str, history: list) -> dict:
    """Check if complaint is a duplicate using Groq LLaMA 3.1 8B (fast, classification task)."""

    if not history:
        return {"is_duplicate": False, "result": "not done"}

    system_prompt = """You are a duplicate-complaint detector for a civic services platform.

Your task: Compare the 'New Complaint' against every entry in the 'Existing List' and determine 
if the new complaint is a SEMANTIC DUPLICATE of any existing one.

RULES FOR DUPLICATE DETECTION:
1. A complaint is a duplicate ONLY if it describes the SAME type of problem affecting the 
   SAME infrastructure/service. For example:
   - "Electricity pole broken near park" and "Broken electric pole at the park" → DUPLICATE 
     (same issue: broken pole, same area)
   - "Electricity pole broken" and "Water pipe leaking" → NOT duplicate 
     (different infrastructure entirely)
   - "Streetlight not working on Main Road" and "Power outage in Sector 5" → NOT duplicate 
     (different issues: streetlight vs power outage, different location)

2. Keyword overlap alone does NOT make a duplicate:
   - "Broken road near school" and "Broken electricity pole" → NOT duplicate 
     (both say "broken" but describe completely different infrastructure)
   - "Water not coming" and "Water leaking from pipe" → NOT duplicate 
     (both mention "water" but opposite problems)

3. The complaint must describe essentially the SAME problem to be a duplicate. 
   Consider: What is broken? What service is affected? Is it the same category of issue?

4. If in doubt, lean towards NOT marking as duplicate. A false negative (missing a duplicate) 
   is better than a false positive (blocking a legitimate new complaint).

Return ONLY a valid JSON object with these keys:
- "is_duplicate": boolean (true if duplicate, false otherwise)
- "result": string ("already there" if duplicate, "not done" if new)
- "matched_with": string (the existing complaint it matched with, or "" if not a duplicate)

Do NOT include markdown, backticks, or any text outside the JSON."""

    user_message = f"""Existing List: {json.dumps(history)}
New Complaint: "{new_complaint}" """

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.0,
                    "max_tokens": 200,
                    "response_format": {"type": "json_object"},
                },
            )

        if resp.status_code != 200:
            print(f"Groq API error: {resp.status_code} - {resp.text}")
            return {"is_duplicate": False, "result": "not done"}

        result = resp.json()
        content = result["choices"][0]["message"]["content"]
        return json.loads(content)

    except Exception as e:
        print(f"SimilarComplaint Error: {e}")
        return {"is_duplicate": False, "result": "not done"}
