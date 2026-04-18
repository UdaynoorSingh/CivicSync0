import json
from llm_fallback import call_llm_with_fallback_async

async def get_voice_intent(current_route: str, valid_actions: list, user_text: str) -> dict:
    """Smart intent router logic — detects navigation intent using fallback LLMs."""
    
    actions_str = json.dumps(valid_actions, indent=2)
    
    system_prompt = f"""You are a smart navigation router for a civic services kiosk in India. 
The user is currently on the page: {current_route}

The valid actions the user can take from this page are:
{actions_str}

Your job:
Determine which navigation action conceptually matches the user's spoken intent based on the valid actions provided.
If they are reporting an issue or describing a problem (e.g. "bijli ka wire gir gaya", "paani nahi aa raha"), they should be navigated to the page where they can register a new complaint.
If they are asking for information or asking a question, they should be navigated to the chatbot, help, or FAQ section.
If they are asking about to see "shikayat map" , they should be navigated to the Complaint map page.
Return ONLY a valid JSON object.

Output format for NAVIGATION:
{{"action": "navigate", "target": "<target_route_from_valid_actions>", "speak": "<Polite Hindi confirmation>"}}

Output format for STAY:
{{"action": "stay", "target": "{current_route}", "speak": "<Polite Hindi response affirming they are already there or acknowledging the request>"}}

Output format for ERROR:
{{"action": "error", "target": "{current_route}", "speak": "<Polite Hindi asking them to repeat or clarifying options>"}}

Rules:
- The "speak" value MUST be in simple, conversational Hindi.
- The "speak" value MUST be ONLY plain text (no bold **, no italics, no markdown).
- Only select targets that exist in the provided valid_actions array.
- NEVER return anything other than the exact JSON object requested."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text},
    ]
    
    try:
        content = await call_llm_with_fallback_async(
            messages=messages,
            model_size="70b",
            temperature=0.1,
            max_tokens=512,
            is_json=True
        )
    except Exception as e:
        raise Exception(f"LLM error: {e}")
    
    try:
        intent = json.loads(content)
    except json.JSONDecodeError:
        intent = {"action": "error", "target": current_route, "speak": "माफ़ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बोलें।"}
    
    return intent
