import os
import json
import httpx
from dotenv import load_dotenv
from vectore_store import vectorstore

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def Query_answer(query: str) -> dict:
    """RAG-powered chatbot using Groq LLaMA 3.3 70B for reasoning over retrieved context."""

    # Retrieve relevant docs from FAISS vectorstore
    retrieved = vectorstore.similarity_search(query, k=3)
    context = "\n\n".join([doc.page_content for doc in retrieved])

    system_prompt = """You are 'Civic Sync Guide', a smart interactive kiosk assistant. 
Your role is to help Indian citizens understand and navigate the CivicSync civic services system.

STRICT RULES:
1. Answer the user's query clearly and concisely based ONLY on the provided context.
2. Use ONLY plain English text. Do NOT use any markdown formatting (no bold **, no italics _, no headers #, no backticks `).
3. If using lists, use simple dashes (-) or numbers (1.) followed by plain text.
4. Provide step-by-step instructions when applicable, in plain text.
5. If the context does not contain the answer, politely inform the user.
6. Return ONLY a valid JSON object: {"answer": "<your plain text answer>"}
7. Ensure the text is easily readable for a text-to-speech engine (no special symbols)."""

    user_message = f"""Official Documentation Context:
{context}

User Query: "{query}"

Respond with ONLY a JSON object: {{"answer": "<your answer>"}}"""

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1024,
                    "response_format": {"type": "json_object"},
                },
            )

        if resp.status_code != 200:
            print(f"Groq API error: {resp.status_code} - {resp.text}")
            return {"answer": "Sorry, I'm having trouble connecting. Please try again."}

        result = resp.json()
        content = result["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        # Ensure the response has the "answer" key
        if "answer" not in parsed:
            return {"answer": content}

        return parsed

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {"answer": "I received an unclear response. Please try rephrasing your question."}
    except Exception as e:
        print(f"ChatBot Error: {e}")
        return {"answer": "Sorry, something went wrong. Please try again later."}