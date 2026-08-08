import json
import re
import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

import numpy as np

from pdf_tools import embeddings

print("[DEBUG] memory.py loaded from:", __file__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "aircraft_memory.db")


def _ensure_schema(conn: sqlite3.Connection):
    """
    Creates the table/index if they don't exist, and runs column migrations.
    Called on EVERY connection (not just at import time), so the schema
    self-heals even if the .db file gets deleted while the app is running.
    """
    conn.execute("""
        CREATE TABLE IF NOT EXISTS turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'multi_agent',
            query TEXT NOT NULL,
            answer TEXT,
            query_embedding TEXT NOT NULL,
            report_json TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_session_id ON turns(session_id)
    """)
    # Migrations for DBs created before these columns existed.
    for ddl in (
        "ALTER TABLE turns ADD COLUMN mode TEXT NOT NULL DEFAULT 'multi_agent'",
        "ALTER TABLE turns ADD COLUMN answer TEXT",
    ):
        try:
            conn.execute(ddl)
        except sqlite3.OperationalError:
            pass  # column already exists
    conn.commit()


@contextmanager
def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_schema(conn)  # self-healing: safe to call on every connection
        yield conn
    finally:
        conn.close()


def _extract_answer(mode: str, data: dict) -> str:
    """
    Builds the value stored in the `answer` column as a JSON string
    containing BOTH:
      - "summary": a short human-readable answer
      - "table": the full structured data for that turn

    - simple_rag: summary = the LLM's raw answer text, table = {manual_key, answer}
    - multi_agent: summary = Digital Twin's twin_summary (LLM-written
      narrative), table = the full 5-agent report dict
    """
    if mode == "simple_rag":
        summary = data.get("answer", "") or "No answer available."
        table = {
            "manual_key": data.get("manual_key"),
            "answer": data.get("answer"),
        }
    else:  # multi_agent
        dt = data.get("digital_twin", {}) or {}
        summary = dt.get("twin_summary") or "No summary available."
        table = data  # the full report: fault_diagnosis, safety_compliance,
                       # predictive_maintenance, parts_recommendation, digital_twin

    return json.dumps({"summary": summary, "table": table}, default=str)



class ConversationMemory:
    """
    SQLite-backed conversation memory. Stores every turn (query + result)
    per session_id, persisted to disk, for BOTH simple-RAG turns and
    multi-agent turns (distinguished by the 'mode' column). Schema is
    self-healing — every connection ensures the table/columns exist.
    """

    def __init__(self, max_turns_in_context: int = 5):
        self.max_turns_in_context = max_turns_in_context

    # -----------------------------------------------------------------
    # Writing
    # -----------------------------------------------------------------
    def add_turn(self, session_id: str, query: str, data: dict, mode: str = "multi_agent"):
        """
        Stores a completed turn. `data` is:
          - the full agent report dict, when mode="multi_agent"
          - {"manual_key": ..., "answer": ...} when mode="simple_rag"
        """
        print(f"[DEBUG] add_turn called with mode={mode}")
        query_embedding = embeddings.embed_query(query)
        answer = _extract_answer(mode, data)
        with _get_conn() as conn:
            conn.execute(
                "INSERT INTO turns (session_id, mode, query, answer, query_embedding, report_json, timestamp) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    session_id,
                    mode,
                    query,
                    answer,
                    json.dumps(query_embedding),
                    json.dumps(data, default=str),
                    datetime.now().isoformat(timespec="seconds"),
                ),
            )
            conn.commit()

    # -----------------------------------------------------------------
    # Reading
    # -----------------------------------------------------------------
    def _fetch_turns(self, session_id: str, mode: str = None) -> list:
        with _get_conn() as conn:
            if mode:
                cur = conn.execute(
                    "SELECT query, query_embedding, report_json, timestamp, mode, answer FROM turns "
                    "WHERE session_id = ? AND mode = ? ORDER BY id ASC",
                    (session_id, mode),
                )
            else:
                cur = conn.execute(
                    "SELECT query, query_embedding, report_json, timestamp, mode, answer FROM turns "
                    "WHERE session_id = ? ORDER BY id ASC",
                    (session_id,),
                )
            rows = cur.fetchall()

        turns = []
        for query, query_embedding, report_json, timestamp, row_mode, answer in rows:
            turns.append({
                "query": query,
                "query_embedding": json.loads(query_embedding),
                "data": json.loads(report_json),
                "timestamp": timestamp,
                "mode": row_mode,
                "answer": answer,
            })
        return turns

    def get_history(self, session_id: str) -> list:
        """Returns the full turn history for a session (both modes, full data)."""
        return self._fetch_turns(session_id)


    def get_qa_history(self, session_id: str) -> list:
        """
        Lightweight query+answer pairs for a session, oldest to newest.
        `answer` is parsed back into a dict: {"summary": <short text>,
        "table": <full structured data for that turn>}.
        """
        with _get_conn() as conn:
            cur = conn.execute(
                "SELECT id, query, answer, mode, timestamp FROM turns "
                "WHERE session_id = ? ORDER BY id ASC",
                (session_id,),
            )
            rows = cur.fetchall()

        result = []
        for row_id, query, answer_raw, mode, timestamp in rows:
            try:
                parsed_answer = json.loads(answer_raw) if answer_raw else {
                    "summary": "No answer available.",
                    "table": {},
                }
            except (json.JSONDecodeError, TypeError):
                # Backward-compatible fallback for rows stored before this
                # {"summary", "table"} format existed (plain-text answer).
                parsed_answer = {
                    "summary": answer_raw or "No answer available.",
                    "table": {},
                }

            result.append({
                "id": row_id,
                "query": query,
                "answer": parsed_answer,
                "mode": mode,
                "timestamp": timestamp,
            })
        return result
    
    def clear_session(self, session_id: str):
        with _get_conn() as conn:
            conn.execute("DELETE FROM turns WHERE session_id = ?", (session_id,))
            conn.commit()

    # -----------------------------------------------------------------
    # Context building — mode-aware summaries (used to feed prior context
    # back into agent/LLM prompts, NOT the same as the stored `answer`)
    # -----------------------------------------------------------------
    def _summarize_turn(self, t: dict) -> str:
        if t["mode"] == "simple_rag":
            d = t["data"]
            return (
                f"Query: \"{t['query']}\"\n"
                f"  Manual used: {d.get('manual_key', 'N/A')}\n"
                f"  Answer given: {d.get('answer', 'N/A')}"
            )
        else:
            fd = t["data"].get("fault_diagnosis", {})
            pm = t["data"].get("predictive_maintenance", {})
            return (
                f"Query: \"{t['query']}\"\n"
                f"  Diagnosed fault: {fd.get('probable_fault', 'N/A')} "
                f"(confidence {fd.get('confidence_percent', 'N/A')}%)\n"
                f"  Affected component: {fd.get('affected_component', 'N/A')}\n"
                f"  Health score: {pm.get('health_score_percent', 'N/A')}%, "
                f"RUL: {pm.get('remaining_useful_life_hours', 'N/A')} hrs"
            )

    def get_recent_context(self, session_id: str, n: int = None) -> str:
        """Returns a compact text summary of the last N turns (any mode)."""
        n = n or self.max_turns_in_context
        turns = self._fetch_turns(session_id)[-n:]
        if not turns:
            return "No prior conversation history."
        return "\n\n".join(f"Turn {i+1} — {self._summarize_turn(t)}" for i, t in enumerate(turns))

    def get_relevant_context(self, session_id: str, query: str, top_k: int = 3) -> str:
        """
        Finds the most semantically relevant past turns (any mode) to the
        CURRENT query, rather than just the last N.
        """
        turns = self._fetch_turns(session_id)
        if not turns:
            return "No prior conversation history."

        query_emb = np.array(embeddings.embed_query(query))
        scored = []
        for t in turns:
            past_emb = np.array(t["query_embedding"])
            sim = float(
                np.dot(query_emb, past_emb)
                / (np.linalg.norm(query_emb) * np.linalg.norm(past_emb) + 1e-10)
            )
            scored.append((sim, t))
        scored.sort(key=lambda x: x[0], reverse=True)

        top_turns = [t for _, t in scored[:top_k]]
        if not top_turns:
            return "No relevant prior history found."
        return "\n\n".join(f"Earlier {self._summarize_turn(t)}" for t in top_turns)

    # -----------------------------------------------------------------
    # Fast-path direct answers (multi-agent turns only — structured data)
    # -----------------------------------------------------------------
    def try_direct_answer(self, session_id: str, query: str):
        """
        Fast path for factual follow-ups about the LAST multi-agent turn's
        stored numbers. Returns None if not applicable (including when
        there's no prior multi-agent turn for this session).
        """
        turns = self._fetch_turns(session_id, mode="multi_agent")
        if not turns:
            return None

        last = turns[-1]["data"]
        q = query.lower()

        fd = last.get("fault_diagnosis", {})
        pm = last.get("predictive_maintenance", {})
        pr = last.get("parts_recommendation", {})
        sc = last.get("safety_compliance", {})

        if re.search(r"confiden", q):
            return f"The confidence in the last diagnosis was {fd.get('confidence_percent', 'N/A')}%."
        if re.search(r"root cause", q):
            return f"The root cause identified was: {fd.get('root_cause', 'N/A')}"
        if re.search(r"remaining useful life|\brul\b", q):
            return f"Remaining Useful Life estimate was {pm.get('remaining_useful_life_hours', 'N/A')} flight hours."
        if re.search(r"health score", q):
            return f"The health score was {pm.get('health_score_percent', 'N/A')}%."
        if re.search(r"part number|which part", q):
            return f"Recommended part number: {pr.get('part_number', 'N/A')} ({pr.get('part_description', '')})"
        if re.search(r"safety status|approved", q):
            return f"Safety status was: {sc.get('safety_status', 'N/A')}"

        return None


# Single shared instance for the app
conversation_memory = ConversationMemory()