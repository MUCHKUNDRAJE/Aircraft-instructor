import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_tools import (
    ingest_pdf_to_vector_db,
    search_manuals,
    list_ingested_manuals,
    MANUAL_DIR,
    MANUAL_REGISTRY,
)
from gemma_router import route_query, answer_query
from agents.orchestrator import run_agent_pipeline
from memory import conversation_memory

app = FastAPI(title="Aircraft Maintenance API", version="1.0")

# Allow the frontend (any origin during dev — tighten this for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class AskRequest(BaseModel):
    query: str
    session_id: str = "default"
    use_agents: bool = False
    sensor_data: Optional[dict] = None
    aircraft_info: Optional[dict] = None


class QAHistoryResponse(BaseModel):
    session_id: str
    turn_count: int
    history: list[QAItem]


class IngestRequest(BaseModel):
    manual_key: str


DEFAULT_SENSOR_DATA = {
    "engine_temp": "simulated: 640°C (rising)",
    "oil_pressure": "simulated: 42 psi (below nominal)",
    "vibration": "simulated: 2.8 IPS (elevated)",
    "fault_codes": "simulated: none reported",
    "maintenance_history": "simulated: last inspected 120 flight hours ago",
    "operating_hours": "simulated: 8,400",
    "flight_cycles": "simulated: 3,150",
}

DEFAULT_AIRCRAFT_INFO = {
    "aircraft_model": "Boeing 737-800",
    "engine_model": "CFM56-7B",
}


# ---------------------------------------------------------------------------
# Core ask logic (used by the /ask endpoint)
# ---------------------------------------------------------------------------
def ask(
    query: str,
    session_id: str = "default",
    use_agents: bool = False,
    sensor_data: dict = None,
    aircraft_info: dict = None,
) -> dict:
    print(f"\n[LOG] ask() called: session_id='{session_id}', query='{query}', use_agents={use_agents}")

    if use_agents:
        direct = conversation_memory.try_direct_answer(session_id, query)
        if direct:
            print(f"[LOG] [Memory] Answered directly from stored last turn.")
            return {"mode": "direct_memory_answer", "answer": direct}

        conversation_context = conversation_memory.get_relevant_context(session_id, query)

        sensor_data = sensor_data or DEFAULT_SENSOR_DATA
        aircraft_info = aircraft_info or DEFAULT_AIRCRAFT_INFO

        report = run_agent_pipeline(query, sensor_data, aircraft_info, conversation_context)

        conversation_memory.add_turn(session_id, query, report, mode="multi_agent")

        return {"mode": "multi_agent", "report": report}

    else:
        # Simple RAG — now also memory-aware
        conversation_context = conversation_memory.get_relevant_context(session_id, query)

        manual_key = route_query(query)
        raw_results = search_manuals.invoke({"query": query, "manual_key": manual_key})
        final_answer = answer_query(query, raw_results, conversation_context)

        conversation_memory.add_turn(
            session_id,
            query,
            {"manual_key": manual_key, "answer": final_answer},
            mode="simple_rag",
        )

        return {
            "mode": "simple_rag",
            "manual_key": manual_key,
            "context": raw_results,
            "answer": final_answer,
        }

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "service": "Aircraft Maintenance API"}


@app.post("/ask")
def ask_endpoint(payload: AskRequest):
    """
    Main endpoint the frontend calls. `use_agents` decides the path:
    true  -> full multi-agent pipeline (with session memory + SQLite persistence)
    false -> simple RAG answer (no agent memory involved)
    """
    try:
        result = ask(
            query=payload.query,
            session_id=payload.session_id,
            use_agents=payload.use_agents,
            sensor_data=payload.sensor_data,
            aircraft_info=payload.aircraft_info,
        )
        return result
    except Exception as e:
        print(f"[ERROR] /ask failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/qa-history/{session_id}")
def get_qa_history(session_id: str):
    """
    Returns a clean list of {query, answer} pairs for this session, in
    order — no embeddings, no full report JSON. `answer` is the exact text
    the LLM generated (the RAG answer, or the multi-agent Digital Twin's
    narrative summary).
    """
    try:
        qa_list = conversation_memory.get_qa_history(session_id)
        return {"session_id": session_id, "qa_pairs": qa_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history/{session_id}")
def get_history(session_id: str):
    """Returns the full stored conversation/report history for a session."""
    try:
        history = conversation_memory.get_history(session_id)
        return {"session_id": session_id, "turns": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/history/{session_id}")
def clear_history(session_id: str):
    """Clears a session's stored history (e.g. user starts a new chat)."""
    try:
        conversation_memory.clear_session(session_id)
        return {"status": "cleared", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/manuals")
def get_manuals():
    """Lists registered manuals and their ingestion status."""
    try:
        ingested = list_ingested_manuals.invoke({})
        return {
            "registry": {
                key: {"file": meta["file"], "description": meta["description"]}
                for key, meta in MANUAL_REGISTRY.items()
            },
            "ingested_status": ingested,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest")
def ingest_manual(payload: IngestRequest):
    """Ingests a single manual (by its MANUAL_REGISTRY key) into its Chroma DB."""
    if payload.manual_key not in MANUAL_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Unknown manual_key '{payload.manual_key}'")
    try:
        result = ingest_pdf_to_vector_db.invoke({
            "pdf_filename": MANUAL_REGISTRY[payload.manual_key]["file"]
        })
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest-all")
def ingest_all():
    """Ingests every manual currently in MANUAL_REGISTRY."""
    results = {}
    for key, meta in MANUAL_REGISTRY.items():
        try:
            results[key] = ingest_pdf_to_vector_db.invoke({"pdf_filename": meta["file"]})
        except Exception as e:
            results[key] = f"Error: {e}"
    return {"results": results}


if __name__ == "__main__":
    import uvicorn
    os.makedirs(MANUAL_DIR, exist_ok=True)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)