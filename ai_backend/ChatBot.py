import os
import json
from dotenv import load_dotenv
from vectore_store import vectorstore
from llm_fallback import call_llm_with_fallback_sync

load_dotenv()



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
        content = call_llm_with_fallback_sync(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            model_size="70b",
            temperature=0.3,
            max_tokens=1024,
            is_json=True
        )

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