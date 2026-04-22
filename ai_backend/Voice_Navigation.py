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


async def extract_form_field_value(
    field_label: str, field_type: str, options: list, user_text: str
) -> dict:
    """Extract a structured form field value from the user's spoken answer using LLM.
    
    For 'select'/'radio' fields: matches spoken Hindi/English to the closest valid option.
    For 'text' fields: extracts the relevant text from the utterance.
    
    Returns: {"value": "matched value", "confidence": "high|low", "speak": "Hindi confirmation"}
    """
    
    if field_type in ("select", "radio") and options:
        options_str = ", ".join(options)
        system_prompt = f"""You are a form-filling assistant for an Indian civic services kiosk.
The user is answering a form field question.

Field: "{field_label}"
Field type: {field_type}
Valid options: [{options_str}]

Your job:
1. Determine which option from the valid options list best matches the user's spoken answer.
2. The user may speak in Hindi, Hinglish, or English. You must understand all three.
3. Return ONLY a valid JSON object.

Examples of matching:
- "bijli" or "electricity" → "Electricity" (if it's in options)
- "paani" or "water" → "Water Supply" (if it's in options)  
- "zyada zaruri" or "urgent" → "High" (for urgency)
- "haan personal hai" → "personal" (for scope)
- "nagar palika" or "sanitation" → "Sanitation"

Output format:
{{"value": "<exact option from the valid options list>", "confidence": "high", "speak": "<Short Hindi confirmation of what was selected>"}}

If you cannot confidently match to any option:
{{"value": "", "confidence": "low", "speak": "माफ़ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बोलें।"}}

Rules:
- The "value" MUST be one of the exact strings from the valid options list, or empty string if no match.
- The "speak" value MUST be in simple, conversational Hindi.
- The "speak" value MUST be ONLY plain text (no bold **, no italics, no markdown).
- NEVER return anything other than the exact JSON object requested."""
    else:
        # Text field — extract relevant text
        system_prompt = f"""You are a form-filling assistant for an Indian civic services kiosk.
The user is answering a form field question.

Field: "{field_label}"
Field type: text (free-form input)

Your job:
1. Extract the relevant text value from the user's spoken answer for this field.
2. The user may speak in Hindi, Hinglish, or English.
3. Clean up the text appropriately for the field type.
4. For address fields, preserve the original text.
5. For description fields, clean up but keep the meaning.
6. For pincode fields, extract only the 6-digit number.
7. For district/city fields, extract just the city/district name.

Output format:
{{"value": "<extracted text value>", "confidence": "high", "speak": "<Short Hindi confirmation of what was noted>"}}

If the user's answer seems unrelated or empty:
{{"value": "", "confidence": "low", "speak": "माफ़ कीजिए, कृपया दोबारा बताएं।"}}

Rules:
- The "speak" value MUST be in simple, conversational Hindi.
- The "speak" value MUST be ONLY plain text (no bold **, no italics, no markdown).
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
            max_tokens=256,
            is_json=True
        )
    except Exception as e:
        raise Exception(f"LLM error: {e}")
    
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {
            "value": "",
            "confidence": "low",
            "speak": "माफ़ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बोलें।"
        }
    
    return result
