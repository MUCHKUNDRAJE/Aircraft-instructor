import json
import re

from gemma_router import _generate


def call_llm_json(prompt: str, default: dict) -> dict:
    """
    Calls the local LLM (Ollama) asking for STRICT JSON output only,
    then parses it safely. Falls back to `default` if parsing fails,
    so a single bad generation never crashes the pipeline.
    """
    strict_prompt = (
        f"{prompt}\n\n"
        "Respond with ONLY a valid JSON object. No markdown, no backticks, "
        "no explanation before or after the JSON."
    )
    raw = _generate(strict_prompt)

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        print(f"[WARN] LLM did not return JSON, using default. Raw: {raw[:200]}")
        return default

    try:
        parsed = json.loads(match.group(0))
        return {**default, **parsed}
    except json.JSONDecodeError as e:
        print(f"[WARN] JSON parse failed ({e}), using default. Raw: {raw[:200]}")
        return default