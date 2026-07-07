from agents.common import call_llm_json
from pdf_tools import search_manuals


def check_safety_compliance(fault_diagnosis: dict, manual_key: str) -> dict:
    context = search_manuals.invoke({
        "query": f"safety precautions maintenance procedure for "
                 f"{fault_diagnosis.get('affected_component', '')}",
        "manual_key": manual_key,
    })

    prompt = (
        "You are a Safety & Compliance Agent for aircraft maintenance. Given the "
        "fault diagnosis and the manual context below, verify whether the implied "
        "maintenance action follows standard FAA/OEM safety procedure, list "
        "required precautions, and mention applicable regulations ONLY if they "
        "explicitly appear in the manual context — never invent an AD or SB "
        "number that isn't present in the context.\n\n"
        f"Fault diagnosis:\n{fault_diagnosis}\n\n"
        f"Manual context:\n{context}\n\n"
        "Return a JSON object with exactly these keys: "
        "\"safety_status\" (string: \"Approved\", \"Approved with precautions\", "
        "or \"Not approved\"), "
        "\"warnings\" (list of strings), "
        "\"applicable_regulations\" (list of strings — use \"Not specified in "
        "available manuals\" if none are explicitly present), "
        "\"compliance_notes\" (string)."
    )

    default = {
        "safety_status": "Approved with precautions",
        "warnings": ["Follow standard lockout/tagout and depressurization procedures."],
        "applicable_regulations": ["Not specified in available manuals"],
        "compliance_notes": "Default caution applied — verify against the current AD/SB database.",
    }

    result = call_llm_json(prompt, default)
    print(f"[SafetyComplianceAgent] {result}")
    return result