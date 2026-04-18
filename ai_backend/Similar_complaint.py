import os
import json
import math
import httpx
from dotenv import load_dotenv
from llm_fallback import call_llm_with_fallback_sync

load_dotenv()

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

def get_nvidia_embeddings(texts: list[str]) -> list[list[float]]:
    url = "https://integrate.api.nvidia.com/v1/embeddings"
    api_key = os.environ.get("NVIDEA_API_KEY") 
    
    if not api_key:
        print("Warning: NVIDEA_API_KEY not found. Skipping embeddings.")
        return []
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "input": texts,
        "model": "nvidia/llama-3.2-nemoretriever-300m-embed-v1",
        "input_type": "query",
        "encoding_format": "float"
    }
    
    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=10.0)
        response.raise_for_status()
        data = response.json()
        
        # Sort embeddings by index to ensure order matches input
        embeddings = []
        sorted_data = sorted(data.get("data", []), key=lambda x: x["index"])
        for item in sorted_data:
            embeddings.append(item["embedding"])
            
        return embeddings
    except Exception as e:
        print(f"NVIDIA Embedding error: {e}")
        return []

def check_complaint(new_complaint: str, history: list) -> dict:
    """Check if complaint is a duplicate using a Hybrid approach (NVIDIA Embeddings + LLaMA 8B)."""

    if not history:
        return {"is_duplicate": False, "result": "not done"}

    # HYBRID APPROACH: Use NVIDIA embeddings to filter top 3 if history is large
    if len(history) > 3:
        # Prepend the query to generate all embeddings in one batch call
        all_texts = [new_complaint] + history
        embeddings = get_nvidia_embeddings(all_texts)
        if embeddings and len(embeddings) == len(all_texts):
            query_emb = embeddings[0]
            scores = []
            for i in range(1, len(embeddings)):
                score = cosine_similarity(query_emb, embeddings[i])
                scores.append((score, history[i-1]))
            # Sort by highest score first (closest matches)
            scores.sort(key=lambda x: x[0], reverse=True)
            # Retain only the top 3 semantically closest complaints
            history = [item[1] for item in scores[:3]]
            print(f"Hybrid Search: Filtered {len(all_texts)-1} history items down to 3 using NVIDIA Embeddings.")

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

THINKING PROCESS:
Before making your final decision, you MUST analyze the top query step-by-step inside <think>...</think> tags.
Break down the root cause of the new complaint. Then compare it carefully to each history item.

OUTPUT FORMAT:
After your <think> block, return ONLY a valid JSON object with these keys:
- "is_duplicate": boolean (true if duplicate, false otherwise)
- "result": string ("already there" if duplicate, "not done" if new)
- "matched_with": string (the existing complaint it matched with, or "" if not a duplicate)

Do NOT include markdown, backticks, or any text other than your <think> tags followed by the raw JSON."""

    user_message = f"""Existing List: {json.dumps(history)}
New Complaint: "{new_complaint}" """

    try:
        import re
        from llm_fallback import call_llm_with_fallback_reasoning_sync
        
        content = call_llm_with_fallback_reasoning_sync(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.6,
            max_tokens=800
        )

        json_str = content
        think_match = re.search(r'<think>.*?</think>', content, re.DOTALL)
        if think_match:
            print("Reasoning trace:", think_match.group(0))
            json_str = content.replace(think_match.group(0), "").strip()
            
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        
        json_match = re.search(r'(\{.*\})', json_str, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)

        return json.loads(json_str)

    except Exception as e:
        print(f"SimilarComplaint Error: {e}")
        return {"is_duplicate": False, "result": "not done"}
