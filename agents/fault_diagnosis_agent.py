from agents.common import call_llm_json
from pdf_tools import search_manuals


def diagnose_fault(query: str, manual_key: str, sensor_data: dict) -> dict:
    """
    Analyzes the engineer's query + sensor readings against the routed
    manual's content to identify the most probable fault.
    """
    context = search_manuals.invoke({"query": query, "manual_key": manual_key})

    prompt = (
        "You are a Fault Diagnosis Agent for aircraft maintenance. Analyze the "
        "engineer's query together with the sensor readings and the manual "
        "context below, and identify the most probable fault.\n\n"
        f"Engineer's query: \"{query}\"\n\n"
        "Sensor data:\n"
        f"- Engine temperature: {sensor_data.get('engine_temp', 'N/A')}\n"
        f"- Oil pressure: {sensor_data.get('oil_pressure', 'N/A')}\n"
        f"- Vibration: {sensor_data.get('vibration', 'N/A')}\n"
        f"- Fault codes: {sensor_data.get('fault_codes', 'N/A')}\n"
        f"- Maintenance history: {sensor_data.get('maintenance_history', 'N/A')}\n\n"
        f"Manual context:\n{context}\n\n"
        "Return a JSON object with exactly these keys: "
        "\"probable_fault\" (string), \"root_cause\" (string)(500-600 words detail using the manual contex) , "
        "\"confidence_percent\" (integer 0-100), "
        "\"affected_component\" (string)."
    )

    default = {
        "probable_fault": "Unable to determine",
        "root_cause": "Insufficient data to isolate a root cause",
        "confidence_percent": 0,
        "affected_component": "Unknown",
    }

    result = call_llm_json(prompt, default)
    print(f"[FaultDiagnosisAgent] {result}")
    return result