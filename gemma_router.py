import numpy as np
from ollama import chat

from pdf_tools import MANUAL_REGISTRY, embeddings  # reuse the same bge-base embedder

OLLAMA_MODEL = "gemma3:1b"


# ---------------------------------------------------------------------------
# ROUTING: embedding-based (accurate, deterministic, no LLM involved).
# ---------------------------------------------------------------------------
_manual_keys = list(MANUAL_REGISTRY.keys())
_manual_descriptions = [MANUAL_REGISTRY[k]["description"] for k in _manual_keys]
_description_embeddings = embeddings.embed_documents(_manual_descriptions)


def _cosine_sim(a, b) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


def route_query(query: str) -> str:
    query_embedding = embeddings.embed_query(query)
    scores = [
        (_manual_keys[i], _cosine_sim(query_embedding, _description_embeddings[i]))
        for i in range(len(_manual_keys))
    ]
    scores.sort(key=lambda x: x[1], reverse=True)

    best_key, best_score = scores[0]
    print(f"[LOG] Routing scores: {[(k, round(s, 4)) for k, s in scores]}")
    print(f"[LOG] Selected manual: '{best_key}' (score={best_score:.4f})")
    return best_key


# ---------------------------------------------------------------------------
# ANSWERING: via Ollama (gemma3:1b), tuned for paragraph-style answers.
# ---------------------------------------------------------------------------
def _generate(prompt: str) -> str:
    response = chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={
            "temperature": 0.4,
            "top_p": 0.9,
            "repeat_penalty": 1.15,
            "num_predict": 600,
        },
    )
    return response["message"]["content"].strip()


def answer_query(query: str, context: str) -> str:
    """
    Given retrieved chunks (context) and the original query, asks the model
    to produce a well-written, grounded paragraph answer.
    """
    prompt = (
        "You are an experienced aircraft maintenance instructor explaining a "
        "procedure to a technician. Using ONLY the context below, write a clear, "
        "well-organized answer in flowing paragraphs (not bullet points or a "
        "numbered list unless the source itself describes numbered steps). "
        "Explain the reasoning and any important safety notes, not just a bare fact. "
        "If the context doesn't contain enough information to answer fully, say so "
        "honestly and explain what is missing.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer (in paragraph form):"
    )
    return _generate(prompt)