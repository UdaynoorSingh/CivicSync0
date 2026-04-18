import os
import json
from dotenv import load_dotenv
from llm_fallback import call_llm_with_fallback_sync

load_dotenv()


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
        content = call_llm_with_fallback_sync(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            model_size="8b",
            temperature=0.3,
            max_tokens=512,
            is_json=True
        )

        return json.loads(content)

    except Exception as e:
        print(f"QuickFix Error: {e}")
        return {
            "quick_fix_instructions": ["Service temporarily unavailable. Please try again."],
            "safety_warning": "If this is an emergency, call 112 immediately.",
        }
