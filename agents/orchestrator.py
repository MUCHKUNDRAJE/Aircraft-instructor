from gemma_router import route_query
from agents.fault_diagnosis_agent import diagnose_fault
from agents.safety_compliance_agent import check_safety_compliance
from agents.predictive_maintenance_agent import predict_maintenance
from agents.parts_recommendation_agent import recommend_parts
from agents.digital_twin_agent import build_digital_twin


def run_agent_pipeline(
    query: str,
    sensor_data: dict,
    aircraft_info: dict,
    conversation_context: str = "No prior conversation history.",
) -> dict:
    """
    Runs the full multi-agent pipeline in sequence:
    Fault Diagnosis -> Safety & Compliance -> Predictive Maintenance
    -> Parts Recommendation -> Digital Twin.
    """
    print(f"\n[LOG] [Orchestrator] Starting agent pipeline...")
    print(f"[LOG] [Orchestrator] Routing query: '{query}'")
    manual_key = route_query(query)
    print(f"[LOG] [Orchestrator] Routed to manual: '{manual_key}'")

    print(f"[LOG] [Orchestrator] Agent 1: Fault Diagnosis...")
    fault_diagnosis, context = diagnose_fault(query, manual_key, sensor_data, conversation_context)

    print(f"[LOG] [Orchestrator] Agent 2: Safety & Compliance...")
    safety = check_safety_compliance(fault_diagnosis, manual_key)

    print(f"[LOG] [Orchestrator] Agent 3: Predictive Maintenance...")
    predictive = predict_maintenance(query, fault_diagnosis, sensor_data)

    print(f"[LOG] [Orchestrator] Agent 4: Parts Recommendation...")
    parts = recommend_parts(
        fault_diagnosis,
        aircraft_info.get("aircraft_model", "Unknown"),
        aircraft_info.get("engine_model", "Unknown"),
        manual_key,
    )

    print(f"[LOG] [Orchestrator] Agent 5: Digital Twin...")
    digital_twin = build_digital_twin(
        aircraft_info.get("aircraft_model", "Unknown"),
        aircraft_info.get("engine_model", "Unknown"),
        sensor_data,
        fault_diagnosis,
        safety,
        predictive,
        parts,
    )

    print(f"[LOG] [Orchestrator] All agents complete - aggregating results...")

    return {
        "manual_key": manual_key,
        "context": context,
        "fault_diagnosis": fault_diagnosis,
        "safety_compliance": safety,
        "predictive_maintenance": predictive,
        "parts_recommendation": parts,
        "digital_twin": digital_twin,
    }