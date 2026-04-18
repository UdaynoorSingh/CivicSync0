import os
import json
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def get_providers_config(model_size="8b"):
    groq_api_key = os.getenv("GROQ_API_KEY")
    nvidea_api_key = os.getenv("NVIDEA_API_KEY")
    open_router_api_key = os.getenv("OPEN_ROUTER_API_KEY")

    if model_size == "8b":
        return [
            {
                "name": "Groq",
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "key": groq_api_key,
                "model": "llama-3.1-8b-instant"
            },
            {
                "name": "Nvidia",
                "url": "https://integrate.api.nvidia.com/v1/chat/completions",
                "key": nvidea_api_key,
                "model": "meta/llama-3.1-8b-instruct"
            },
            {
                "name": "OpenRouter",
                "url": "https://openrouter.ai/api/v1/chat/completions",
                "key": open_router_api_key,
                "model": "meta-llama/llama-3.1-8b-instruct"
            }
        ]
    else: # 70b
        return [
            {
                "name": "Groq",
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "key": groq_api_key,
                "model": "llama-3.3-70b-versatile"
            },
            {
                "name": "Nvidia",
                "url": "https://integrate.api.nvidia.com/v1/chat/completions",
                "key": nvidea_api_key,
                "model": "meta/llama-3.3-70b-instruct"
            },
            {
                "name": "OpenRouter",
                "url": "https://openrouter.ai/api/v1/chat/completions",
                "key": open_router_api_key,
                "model": "meta-llama/llama-3.3-70b-instruct"
            }
        ]

def get_providers_config_reasoning():
    groq_api_key = os.getenv("GROQ_API_KEY")
    nvidea_api_key = os.getenv("NVIDEA_API_KEY")
    open_router_api_key = os.getenv("OPEN_ROUTER_API_KEY")

    return [
        {
            "name": "Nvidia",
            "url": "https://integrate.api.nvidia.com/v1/chat/completions",
            "key": nvidea_api_key,
            # Using Nvidia NIM's primary reasoning endpoint based on 'deepseek v3.1' request
            "model": "deepseek-ai/deepseek-v3.2" 
        },
        {
            "name": "OpenRouter",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "key": open_router_api_key,
            "model": "nvidia/nemotron-3-nano-30b-a3b:free"
        },
        {
            "name": "Groq",
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "key": groq_api_key,
            "model": "meta-llama/llama-4-scout-17b-16e-instruct"
        }
    ]

def _build_headers(provider, is_json=True):
    headers = {
        "Authorization": f"Bearer {provider['key']}",
        "Content-Type": "application/json"
    }
    if provider["name"] == "OpenRouter":
        headers["HTTP-Referer"] = "https://civic-sync0.vercel.app"
        headers["X-Title"] = "CivicSync"
    return headers

def _build_payload(provider, messages, temperature, max_tokens, is_json):
    payload = {
        "model": provider["model"],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    if is_json:
        payload["response_format"] = {"type": "json_object"}
    return payload

def call_llm_with_fallback_sync(messages, model_size="8b", temperature=0.1, max_tokens=512, is_json=True):
    """
    Synchronous fallback LLM caller. Supports Groq -> Nvidia -> OpenRouter.
    Returns the string text generated. Caller should handle JSON parsing.
    """
    providers = get_providers_config(model_size)
    
    for provider in providers:
        if not provider["key"]:
            continue
            
        url = provider["url"]
        headers = _build_headers(provider, is_json)
        payload = _build_payload(provider, messages, temperature, max_tokens, is_json)
        
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                
            if resp.status_code == 200:
                result = resp.json()
                content = result["choices"][0]["message"]["content"]
                return content
            else:
                print(f"[{provider['name']}] Error {resp.status_code}: {resp.text}. Falling back...")
                continue
        except Exception as e:
            print(f"[{provider['name']}] Exception: {e}. Falling back...")
            continue
            
    raise Exception("All LLM providers failed or exhausted rate limits.")

async def call_llm_with_fallback_async(messages, model_size="8b", temperature=0.1, max_tokens=512, is_json=True):
    """
    Asynchronous fallback LLM caller. Supports Groq -> Nvidia -> OpenRouter.
    Returns the string text generated. Caller should handle JSON parsing.
    """
    providers = get_providers_config(model_size)
    
    for provider in providers:
        if not provider["key"]:
            continue
            
        url = provider["url"]
        headers = _build_headers(provider, is_json)
        payload = _build_payload(provider, messages, temperature, max_tokens, is_json)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                
            if resp.status_code == 200:
                result = resp.json()
                content = result["choices"][0]["message"]["content"]
                return content
            else:
                print(f"[{provider['name']}] Error {resp.status_code}: {resp.text}. Falling back...")
                continue
        except Exception as e:
            print(f"[{provider['name']}] Exception: {e}. Falling back...")
            continue
            
    raise Exception("All LLM providers failed or exhausted rate limits.")

def call_llm_with_fallback_reasoning_sync(messages, temperature=0.6, max_tokens=1024):
    """
    Synchronous fallback LLM caller exclusively for reasoning models.
    Supports Nvidia -> OpenRouter -> Groq as per instruction.
    Returns the raw string text generated. Caller should handle <think> block parsing.
    """
    providers = get_providers_config_reasoning()
    
    for provider in providers:
        if not provider["key"]:
            continue
            
        url = provider["url"]
        headers = _build_headers(provider, is_json=False)
        payload = _build_payload(provider, messages, temperature, max_tokens, is_json=False)
        
        try:
            with httpx.Client(timeout=45.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                
            if resp.status_code == 200:
                result = resp.json()
                content = result["choices"][0]["message"]["content"]
                return content
            else:
                print(f"[{provider['name']}] Error {resp.status_code}: {resp.text}. Falling back...")
                continue
        except Exception as e:
            print(f"[{provider['name']}] Exception: {e}. Falling back...")
            continue
            
    raise Exception("All reasoning LLM providers failed or exhausted rate limits.")

import base64

def _encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def get_providers_config_vision():
    groq_api_key = os.getenv("GROQ_API_KEY")
    nvidea_api_key = os.getenv("NVIDEA_API_KEY")
    open_router_api_key = os.getenv("OPEN_ROUTER_API_KEY")

    return [
        {
            "name": "OpenRouter",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "key": open_router_api_key,
            "model": "google/gemma-4-31b-it:free"
        },
        {
            "name": "Nvidia",
            "url": "https://integrate.api.nvidia.com/v1/chat/completions",
            "key": nvidea_api_key,
            "model": "meta/llama-4-maverick-17b-128e-instruct"
        },
        {
            "name": "Groq",
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "key": groq_api_key,
            "model": "meta-llama/llama-4-scout-17b-16e-instruct"
        }
    ]

def call_llm_with_fallback_vision_sync(prompt_text, image_path, temperature=0.0, max_tokens=1024):
    """
    Synchronous fallback LLM caller specifically for vision payload format.
    Supports OpenRouter -> Nvidia -> Groq as requested by user.
    """
    providers = get_providers_config_vision()
    
    encoded_img = _encode_image(image_path)
    
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt_text
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{encoded_img}"
                    }
                }
            ]
        }
    ]
    
    for provider in providers:
        if not provider["key"]:
            continue
            
        url = provider["url"]
        headers = _build_headers(provider, is_json=False)
        payload = _build_payload(provider, messages, temperature, max_tokens, is_json=False)
        
        try:
            with httpx.Client(timeout=45.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                
            if resp.status_code == 200:
                result = resp.json()
                content = result["choices"][0]["message"]["content"]
                return content
            else:
                print(f"[{provider['name']}] Vision Error {resp.status_code}: {resp.text}. Falling back...")
                continue
        except Exception as e:
            print(f"[{provider['name']}] Vision Exception: {e}. Falling back...")
            continue
            
    raise Exception("All vision LLM providers failed or exhausted rate limits.")
