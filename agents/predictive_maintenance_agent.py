from agents.common import call_llm_json


def predict_maintenance(query: str, fault_diagnosis: dict, sensor_data: dict) -> dict:
    """
    Estimates component health and remaining useful life. In production this
    would run a trained model (e.g. on NASA C-MAPSS-style sensor trends); here
    it reasons over the provided sensor readings and fault context via the LLM.
    """
    prompt = (
        "You are a Predictive Maintenance Agent. Based on the sensor trends, "
        "operating hours/cycles, and the fault diagnosis below, estimate the "
        "component's health and remaining useful life. Be conservative — do not "
        "give false precision if the data is limited.\n\n"
        f"Engineer's query: \"{query}\"\n\n"
        "Sensor data:\n"
        f"- Engine temperature: {sensor_data.get('engine_temp', 'N/A')}\n"
        f"- Oil pressure: {sensor_data.get('oil_pressure', 'N/A')}\n"
        f"- Vibration: {sensor_data.get('vibration', 'N/A')}\n"
        f"- Operating hours: {sensor_data.get('operating_hours', 'N/A')}\n"
        f"- Flight cycles: {sensor_data.get('flight_cycles', 'N/A')}\n\n"
        f"Fault diagnosis:\n{fault_diagnosis}\n\n"
        "Return a JSON object with exactly these keys: "
        "\"health_score_percent\" (integer 0-100), "
        "\"remaining_useful_life_hours\" (integer, estimated flight hours), "
        "\"failure_probability_percent\" (integer 0-100), "
        "\"maintenance_recommendation\" (string). (try to text the maintainces recommendation in detial using the context )"
    )

    default = {
        "health_score_percent": 70,
        "remaining_useful_life_hours": 100,
        "failure_probability_percent": 25,
        "maintenance_recommendation": "Schedule inspection at next maintenance cycle.",
    }

    result = call_llm_json(prompt, default)
    print(f"[PredictiveMaintenanceAgent] {result}")
    return result