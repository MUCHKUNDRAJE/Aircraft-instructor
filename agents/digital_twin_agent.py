from datetime import datetime

from agents.common import call_llm_json


def build_digital_twin(
    aircraft_model: str,
    engine_model: str,
    sensor_data: dict,
    fault_diagnosis: dict,
    safety: dict,
    predictive: dict,
    parts: dict,
) -> dict:
    """
    Builds a snapshot "digital twin" state of the aircraft/component by
    aggregating all agent outputs plus the raw sensor inputs, then asks the
    LLM for a short natural-language summary of the twin's current state.
    """
    twin_state = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "aircraft_model": aircraft_model,
        "engine_model": engine_model,
        "sensor_snapshot": sensor_data,
        "fault_diagnosis": fault_diagnosis,
        "safety_compliance": safety,
        "predictive_maintenance": predictive,
        "parts_recommendation": parts,
    }

    prompt = (
        "You are a Digital Twin Agent maintaining a virtual model of this "
        "aircraft component. Given the full state snapshot below, write a "
        "short (5-6 sentence) narrative summary of the component's current "
        "condition and outlook, as if briefing an engineer at a glance.\n\n"
        f"State snapshot:\n{twin_state}\n\n"
        "Return a JSON object with exactly these keys: "
        "\"twin_summary\" (string, the narrative), "
        "\"overall_status\" (string: \"Healthy\", \"Monitor\", or \"Action Required\")."
    )

    default = {
        "twin_summary": "Digital twin snapshot recorded; insufficient data for a full narrative summary.",
        "overall_status": "Monitor",
    }

    narrative = call_llm_json(prompt, default)
    twin_state["twin_summary"] = narrative.get("twin_summary")
    twin_state["overall_status"] = narrative.get("overall_status")

    print(f"[DigitalTwinAgent] overall_status={twin_state['overall_status']}")
    return twin_state