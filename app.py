import os
print("[LOG] Initializing modules...")
from pdf_tools import (
    ingest_pdf_to_vector_db,
    search_manuals,
    list_ingested_manuals,
    MANUAL_DIR,
    MANUAL_REGISTRY,
)
print("[LOG] PDF tools imported successfully")
from gemma_router import route_query, answer_query
print("[LOG] Gemma router imported successfully")
from agents.orchestrator import run_agent_pipeline
print("[LOG] Agent orchestrator imported successfully")


def ingest_all_manuals():
    print(f"[LOG] ingest_all_manuals() called")
    print(f"[LOG] Found {len(MANUAL_REGISTRY)} manual(s) to ingest")
    for key, meta in MANUAL_REGISTRY.items():
        print(f"\n[LOG] Ingesting: {meta['file']} -> DB '{key}'")
        print(f"[LOG] Description: {meta['description']}")
        print(f"[LOG] Two-column layout: {meta['two_column']}")
        result = ingest_pdf_to_vector_db.invoke({"pdf_filename": meta["file"]})
        print(f"[LOG] Result: {result}")
    print(f"[LOG] All manuals ingestion complete")


def show_ingested_manuals():
    print(f"\n[LOG] show_ingested_manuals() called")
    print("[LOG] Retrieving ingested manuals list...")
    result = list_ingested_manuals.invoke({})
    print(f"[LOG] Ingested manuals:\n{result}")
    print("[LOG] Manuals display complete\n")


def ask(query: str, use_agents: bool = False, sensor_data: dict = None, aircraft_info: dict = None):
    """
    use_agents=True  -> runs the full multi-agent pipeline (Fault Diagnosis,
                         Safety & Compliance, Predictive Maintenance,
                         Parts Recommendation, Digital Twin) and prints a
                         structured report.
    use_agents=False -> (default) simple single-model RAG answer: routes to
                         the best manual, retrieves context, asks the local
                         LLM for a plain paragraph answer.
    """
    print(f"\n[LOG] ask() called with query: '{query}'")
    print(f"[LOG] Parameters: use_agents={use_agents}")

    if use_agents:
        print(f"[LOG] Multi-agent pipeline mode enabled")
        print(f"[LOG] Initializing sensor data...")
        sensor_data = sensor_data or {
            "engine_temp": "simulated: 640°C (rising)",
            "oil_pressure": "simulated: 42 psi (below nominal)",
            "vibration": "simulated: 2.8 IPS (elevated)",
            "fault_codes": "simulated: none reported",
            "maintenance_history": "simulated: last inspected 120 flight hours ago",
            "operating_hours": "simulated: 8,400",
            "flight_cycles": "simulated: 3,150",
        }
        print(f"[LOG] Sensor data initialized: {len(sensor_data)} parameters")
        
        print(f"[LOG] Initializing aircraft info...")
        aircraft_info = aircraft_info or {
            "aircraft_model": "Boeing 737-800",
            "engine_model": "CFM56-7B",
        }
        print(f"[LOG] Aircraft info initialized: {aircraft_info}")

        print(f"[LOG] Starting agent pipeline execution...")
        report = run_agent_pipeline(query, sensor_data, aircraft_info)
        print(f"[LOG] Agent pipeline execution complete")

        print("\n[LOG] =================== MULTI-AGENT REPORT ===================")
        print(f"[LOG] Routed Manual: {report['manual_key']}")

        fd = report["fault_diagnosis"]
        print("[LOG] \n[Fault Diagnosis]")
        print(f"[LOG]   Probable Fault: {fd.get('probable_fault')}")
        print(f"[LOG]   Root Cause: {fd.get('root_cause')}")
        print(f"[LOG]   Confidence: {fd.get('confidence_percent')}%")
        print(f"[LOG]   Affected Component: {fd.get('affected_component')}")

        sc = report["safety_compliance"]
        print("[LOG] \n[Safety & Compliance]")
        print(f"[LOG]   Safety Status: {sc.get('safety_status')}")
        print(f"[LOG]   Warnings: {sc.get('warnings')}")
        print(f"[LOG]   Applicable Regulations: {sc.get('applicable_regulations')}")
        print(f"[LOG]   Notes: {sc.get('compliance_notes')}")

        pm = report["predictive_maintenance"]
        print("[LOG] \n[Predictive Maintenance]")
        print(f"[LOG]   Health Score: {pm.get('health_score_percent')}%")
        print(f"[LOG]   Remaining Useful Life: {pm.get('remaining_useful_life_hours')} flight hours")
        print(f"[LOG]   Failure Probability: {pm.get('failure_probability_percent')}%")
        print(f"[LOG]   Recommendation: {pm.get('maintenance_recommendation')}")

        pr = report["parts_recommendation"]
        print("[LOG] \n[Parts Recommendation]")
        print(f"[LOG]   Part Number: {pr.get('part_number')}")
        print(f"[LOG]   Description: {pr.get('part_description')}")
        print(f"[LOG]   Quantity Required: {pr.get('quantity_required')}")
        print(f"[LOG]   Alternatives: {pr.get('alternative_part_numbers')}")

        dt = report["digital_twin"]
        print("[LOG] \n[Digital Twin]")
        print(f"[LOG]   Overall Status: {dt.get('overall_status')}")
        print(f"[LOG]   Summary: {dt.get('twin_summary')}")
        print("[LOG] ============================================================\n")

        return report

    else:
        print(f"[LOG] Simple RAG mode - routing query to appropriate manual")
        print(f"[LOG] Calling router to determine best manual...")
        manual_key = route_query(query)
        print(f"[LOG] Router selected manual: {manual_key}")

        print(f"[LOG] Retrieving context from '{manual_key}'...")
        raw_results = search_manuals.invoke({"query": query, "manual_key": manual_key})
        print(f"[LOG] Retrieved {len(raw_results.split('Match'))-1} search results from '{manual_key}'")
        print(f"\n[LOG] Context retrieved:\n{raw_results}\n")

        print(f"[LOG] Generating LLM answer based on context...")
        final_answer = answer_query(query, raw_results)
        print(f"[LOG] Answer generated successfully")
        print(f"[LOG] Answer:\n{final_answer}\n")
        return final_answer


def main():
    print("\n" + "="*70)
    print("[LOG] ====== AIRCRAFT MANUAL DEMO (MULTI-DB + MULTI-AGENT SYSTEM) ======")
    print("="*70)
    
    print(f"[LOG] Initializing application...")
    print(f"[LOG] Creating manual directory: {MANUAL_DIR}")
    os.makedirs(MANUAL_DIR, exist_ok=True)
    print(f"[LOG] Manual directory ready")

 

    print(f"\n[LOG] Phase 3: Single-model RAG test")
    print(f"[LOG] Test query: 'How do I replace the engine oil filter ?'")
    ask("How do I replace the engine oil filter ?")

    print(f"\n[LOG] Phase 4: Multi-agent pipeline test")
    print(f"[LOG] Test query: 'Engine #3 temperature is increasing rapidly.'")
    ask("""Aircraft:
Boeing 737-800

During pre-flight inspection, engineers observed:

Fuel smell near the left engine.

Fuel pressure fluctuates between 48 psi and 63 psi.

Fuel flow is unstable.

Temperature remains normal.

No fault codes are displayed.

The aircraft completed 8 consecutive short-haul flights in the last 24 hours.

Perform a complete diagnosis.

Determine:

• Root cause
• Required maintenance procedure
• Safety precautions
• Replacement parts
• Risk of continuing operation
• Remaining Useful Life of the fuel pump
• Simulate the next 10 flight cycles.
""", use_agents=True)
    
    print(f"[LOG] ====== APPLICATION EXECUTION COMPLETE ======")


if __name__ == "__main__":
    try:
        print("[LOG] Application startup...")
        main()
        print("[LOG] Application completed successfully")
    except Exception as e:
        print(f"[ERROR] Application failed: {e}")
        import traceback
        traceback.print_exc()