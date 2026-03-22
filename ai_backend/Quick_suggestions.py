import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def get_quick_fix(user_query: str) -> dict:
    """Quick emergency fix suggestions using Groq LLaMA 3.1 8B (fast, simple task)."""

    system_prompt = """You are an emergency maintenance dispatcher for a civic services kiosk.
Analyze the user's complaint and provide immediate safety and fix instructions.

Return ONLY a valid JSON object with these keys:
- "quick_fix_instructions": an array of step-by-step immediate action strings (plain text, no markdown like **bold**)
- "safety_warning": a single string with crucial "do not" advice (plain text, no markdown)

Rules:
- Use ONLY plain English text. 
- Do NOT use any markdown formatting (no bold **, no italics _, no headers #, no backticks `).
- Do NOT include any text outside the JSON."""

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
                        {"role": "user", "content": user_query},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 512,
                    "response_format": {"type": "json_object"},
                },
            )

        if resp.status_code != 200:
            print(f"Groq API error: {resp.status_code} - {resp.text}")
            return {
                "quick_fix_instructions": ["Unable to generate suggestions at this time. Please contact support."],
                "safety_warning": "If this is a life-threatening emergency, call 112 immediately.",
            }

        result = resp.json()
        content = result["choices"][0]["message"]["content"]
        return json.loads(content)

    except Exception as e:
        print(f"QuickFix Error: {e}")
        return {
            "quick_fix_instructions": ["Service temporarily unavailable. Please try again."],
            "safety_warning": "If this is an emergency, call 112 immediately.",
        }
