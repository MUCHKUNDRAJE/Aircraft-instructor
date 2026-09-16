# Aircraft Maintenance API Documentation

Complete API reference and frontend integration guide for the **Aircraft Maintenance AI & Digital Twin Assistant** backend.

---

## 1. Overview & Connection Info

- **Base URL**: `http://localhost:8000` (Default FastAPI development server)
- **Interactive OpenAPI Documentation**:
  - Swagger UI: `http://localhost:8000/docs`
  - ReDoc: `http://localhost:8000/redoc`
- **CORS Policy**: Enabled for all origins (`*`) by default in development.
- **Default Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`

---

## 2. Core Concept & Operational Modes

The API operates in two primary modes via the `/ask` endpoint:

| Mode | `use_agents` Flag | Description | Typical Use Case |
| :--- | :---: | :--- | :--- |
| **Simple RAG** | `false` | Fast single-step semantic retrieval from relevant aircraft manuals + conversational context answering. | Quick Q&A, manual lookup, simple fact retrieval. |
| **Multi-Agent Pipeline** | `true` | Sequential 5-agent reasoning workflow (Fault Diagnosis $\rightarrow$ Safety & Compliance $\rightarrow$ Predictive Maintenance $\rightarrow$ Parts Recommendation $\rightarrow$ Digital Twin aggregation) backed by persistent SQLite session memory. | Deep diagnostic analysis, root cause isolation, sensor data telemetry assessment, and digital twin briefing. |

---

## 3. Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API Health Check and service status |
| `POST` | `/ask` | Primary reasoning and chat query endpoint |
| `GET` | `/qa-history/{session_id}` | Clean QA history (summary + structured table) |
| `GET` | `/history/{session_id}` | Full raw conversation turn history with embeddings |
| `DELETE` | `/history/{session_id}` | Clear conversation memory for a given session |
| `GET` | `/manuals` | List all registered manuals and vector DB status |
| `POST` | `/ingest` | Ingest a single PDF manual into ChromaDB |
| `POST` | `/ingest-all` | Ingest all registered manuals into ChromaDB |

---

## 4. Endpoint Details & Schemas

---

### `GET /` — Health Check

Returns the basic status of the API service.

#### Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "Aircraft Maintenance API"
}
```

---

### `POST /ask` — Main Query & Reasoning

Sends a maintenance query, optional sensor readings, aircraft specifications, and session ID.

#### Request Body Schema
```json
{
  "query": "High vibration detected in CFM56 engine with low oil pressure during climb",
  "session_id": "session-1234",
  "use_agents": true,
  "sensor_data": {
    "engine_temp": "640°C",
    "oil_pressure": "42 psi",
    "vibration": "2.8 IPS",
    "fault_codes": "ENG-VIB-02",
    "maintenance_history": "Last inspected 120 flight hours ago",
    "operating_hours": "8400",
    "flight_cycles": "3150"
  },
  "aircraft_info": {
    "aircraft_model": "Boeing 737-800",
    "engine_model": "CFM56-7B"
  }
}
```

#### Field Descriptions:
- `query` *(string, required)*: The technician/engineer's natural language question.
- `session_id` *(string, optional, default: `"default"`)*: Identifier for stateful multi-turn conversation memory.
- `use_agents` *(boolean, optional, default: `false`)*: Set `true` to invoke the 5-agent pipeline; set `false` for simple RAG.
- `sensor_data` *(object, optional)*: Key-value map of sensor metrics. If omitted in multi-agent mode, simulated defaults are used.
- `aircraft_info` *(object, optional)*: Key-value map containing `aircraft_model` and `engine_model`.

---

#### Response Scenarios

#### Case A: `use_agents: true` (Multi-Agent Response)
```json
{
  "mode": "multi_agent",
  "report": {
    "manual_key": "MANUAL-MOTOR-CFM56",
    "fault_diagnosis": {
      "probable_fault": "Bearing wear or compressor imbalance",
      "root_cause": "Degraded bearing lubricity resulting in increased friction and harmonic vibration",
      "confidence_percent": 88,
      "affected_component": "No. 3 Bearing / High-Pressure Compressor"
    },
    "safety_compliance": {
      "safety_status": "Approved with precautions",
      "warnings": [
        "Follow standard lockout/tagout procedures",
        "Allow engine cool down before inspecting bearing housing",
        "Depressurize oil system prior to disassembly"
      ],
      "applicable_regulations": [
        "FAA AC 43.13-1B Section 8",
        "CFM56 Engine Shop Manual Chapter 72"
      ],
      "compliance_notes": "Verify against latest Airworthiness Directives (ADs) prior to return to service."
    },
    "predictive_maintenance": {
      "health_score_percent": 62,
      "remaining_useful_life_hours": 85,
      "failure_probability_percent": 38,
      "maintenance_recommendation": "Perform borescope inspection of compressor blades and take oil sample for ferrography analysis within 25 flight hours."
    },
    "parts_recommendation": {
      "part_number": "301-789-204-0",
      "part_description": "CFM56-7B No. 3 Roller Bearing Assembly",
      "quantity_required": 1,
      "alternative_part_numbers": [
        "301-789-204-1"
      ]
    },
    "digital_twin": {
      "timestamp": "2026-09-11T11:45:00",
      "aircraft_model": "Boeing 737-800",
      "engine_model": "CFM56-7B",
      "sensor_snapshot": {
        "engine_temp": "640°C",
        "oil_pressure": "42 psi",
        "vibration": "2.8 IPS",
        "fault_codes": "ENG-VIB-02",
        "maintenance_history": "Last inspected 120 flight hours ago",
        "operating_hours": "8400",
        "flight_cycles": "3150"
      },
      "fault_diagnosis": { ... },
      "safety_compliance": { ... },
      "predictive_maintenance": { ... },
      "parts_recommendation": { ... },
      "twin_summary": "The Boeing 737-800 CFM56-7B powerplant is exhibiting abnormal vibration (2.8 IPS) coupled with sub-nominal oil pressure (42 psi). Diagnosis indicates probable wear in the No. 3 bearing assembly. Estimated RUL is 85 flight hours with an overall health score of 62%. Immediate borescope inspection and oil sample ferrography are recommended before continuous high-thrust operations.",
      "overall_status": "Action Required"
    }
  }
}
```

*Note: If the agent answers directly from immediate turn cache, `mode` will be `"direct_memory_answer"` with `"answer"` string.*

#### Case B: `use_agents: false` (Simple RAG Response)
```json
{
  "mode": "simple_rag",
  "manual_key": "MANUAL-MOTOR-CFM56",
  "context": "Context extracted from Chroma vector DB...",
  "answer": "According to the CFM56 maintenance manual, engine vibration exceeding 2.5 IPS requires immediate vibration survey and chip detector inspection..."
}
```

---

### `GET /qa-history/{session_id}` — Clean QA Turn History

Retrieves the structured query & answer pairs for a session. Designed specifically for frontend chat UIs.

#### Response (`200 OK`)
```json
{
  "session_id": "session-1234",
  "qa_pairs": [
    {
      "id": 1,
      "query": "What is the procedure for CFM56 oil filter replacement?",
      "mode": "simple_rag",
      "timestamp": "2026-09-11T11:30:15",
      "answer": {
        "summary": "1. Ensure engine is shutdown and oil pressure is zero. 2. Remove scavenge filter bowl...",
        "table": {
          "manual_key": "MANUAL-MOTOR-CFM56",
          "answer": "1. Ensure engine is shutdown and oil pressure is zero. 2. Remove scavenge filter bowl..."
        }
      }
    },
    {
      "id": 2,
      "query": "High vibration detected in CFM56 engine with low oil pressure",
      "mode": "multi_agent",
      "timestamp": "2026-09-11T11:35:40",
      "answer": {
        "summary": "The Boeing 737-800 CFM56-7B powerplant is exhibiting abnormal vibration...",
        "table": {
          "manual_key": "MANUAL-MOTOR-CFM56",
          "fault_diagnosis": { ... },
          "safety_compliance": { ... },
          "predictive_maintenance": { ... },
          "parts_recommendation": { ... },
          "digital_twin": { ... }
        }
      }
    }
  ]
}
```

---

### `GET /history/{session_id}` — Full Session History

Returns complete session turns including vector query embeddings, timestamps, modes, and raw report payloads.

#### Response (`200 OK`)
```json
{
  "session_id": "session-1234",
  "turns": [
    {
      "query": "High vibration detected in CFM56 engine",
      "query_embedding": [0.0123, -0.0456, 0.0891, "..."],
      "data": { ... },
      "timestamp": "2026-09-11T11:35:40",
      "mode": "multi_agent",
      "answer": "{\"summary\": \"...\", \"table\": { ... }}"
    }
  ]
}
```

---

### `DELETE /history/{session_id}` — Reset/Clear Session History

Deletes all conversation memory and turns for the given `session_id`. Use this when starting a "New Chat" in the UI.

#### Response (`200 OK`)
```json
{
  "status": "cleared",
  "session_id": "session-1234"
}
```

---

### `GET /manuals` — List Manuals & Ingestion Status

Retrieves all configured aircraft manuals and their vector database indexing status.

#### Response (`200 OK`)
```json
{
  "registry": {
    "MANUAL-MOTOR-CFM56": {
      "file": "MANUAL-MOTOR-CFM56.pdf",
      "description": "CFM56 turbofan engine maintenance manual — engine internals, oil system, fuel system, engine removal/installation, engine-specific repairs."
    },
    "FAA-H-8083-31B": {
      "file": "FAA-H-8083-31B.pdf",
      "description": "FAA Aviation Maintenance Technician Handbook - Airframe — structures, systems, hydraulics, landing gear, airframe inspection."
    },
    "amtg_handbook": {
      "file": "amtg_handbook.pdf",
      "description": "Aviation Maintenance Technician General handbook — general aircraft science, tools, materials, regulations, basic maintenance practices."
    },
    "amt_powerplant_handbook": {
      "file": "amt_powerplant_handbook.pdf",
      "description": "Aviation Maintenance Technician Powerplant handbook — engines, propellers, lubrication, Reciprocating Engine Induction Systems , ignition, exhaust, powerplant maintenance."
    }
  },
  "ingested_status": {
    "FAA-H-8083-31B": "Ingested (1240 chunks)",
    "MANUAL-MOTOR-CFM56": "Ingested (850 chunks)",
    "amtg_handbook": "Ingested (620 chunks)",
    "amt_powerplant_handbook": "Ingested (790 chunks)"
  }
}
```

---

### `POST /ingest` — Ingest Single Manual

Processes and embeds a specific manual PDF from the `manual/` directory into ChromaDB.

#### Request Body
```json
{
  "manual_key": "MANUAL-MOTOR-CFM56"
}
```

#### Response (`200 OK`)
```json
{
  "result": "Successfully ingested MANUAL-MOTOR-CFM56.pdf into vector DB (850 chunks created)."
}
```

#### Error Response (`404 Not Found`)
```json
{
  "detail": "Unknown manual_key 'UNKNOWN-KEY'"
}
```

---

### `POST /ingest-all` — Batch Ingest All Manuals

Triggers sequential ingestion of every manual registered in the backend.

#### Response (`200 OK`)
```json
{
  "results": {
    "MANUAL-MOTOR-CFM56": "Successfully ingested MANUAL-MOTOR-CFM56.pdf (850 chunks)",
    "FAA-H-8083-31B": "Successfully ingested FAA-H-8083-31B.pdf (1240 chunks)",
    "amtg_handbook": "Successfully ingested amtg_handbook.pdf (620 chunks)",
    "amt_powerplant_handbook": "Successfully ingested amt_powerplant_handbook.pdf (790 chunks)"
  }
}
```

---

## 5. TypeScript Interfaces for Frontend

You can paste these TypeScript types directly into your frontend codebase (`src/types/api.ts`):

```typescript
export interface SensorData {
  engine_temp?: string;
  oil_pressure?: string;
  vibration?: string;
  fault_codes?: string;
  maintenance_history?: string;
  operating_hours?: string;
  flight_cycles?: string;
  [key: string]: string | undefined;
}

export interface AircraftInfo {
  aircraft_model?: string;
  engine_model?: string;
  [key: string]: string | undefined;
}

export interface AskRequest {
  query: string;
  session_id?: string;
  use_agents?: boolean;
  sensor_data?: SensorData | null;
  aircraft_info?: AircraftInfo | null;
}

export interface FaultDiagnosis {
  probable_fault: string;
  root_cause: string;
  confidence_percent: number;
  affected_component: string;
}

export interface SafetyCompliance {
  safety_status: 'Approved' | 'Approved with precautions' | 'Not approved' | string;
  warnings: string[];
  applicable_regulations: string[];
  compliance_notes: string;
}

export interface PredictiveMaintenance {
  health_score_percent: number;
  remaining_useful_life_hours: number;
  failure_probability_percent: number;
  maintenance_recommendation: string;
}

export interface PartsRecommendation {
  part_number: string;
  part_description: string;
  quantity_required: number;
  alternative_part_numbers: string[];
}

export interface DigitalTwinState {
  timestamp: string;
  aircraft_model: string;
  engine_model: string;
  sensor_snapshot: SensorData;
  fault_diagnosis: FaultDiagnosis;
  safety_compliance: SafetyCompliance;
  predictive_maintenance: PredictiveMaintenance;
  parts_recommendation: PartsRecommendation;
  twin_summary: string;
  overall_status: 'Healthy' | 'Monitor' | 'Action Required' | string;
}

export interface MultiAgentReport {
  manual_key: string;
  fault_diagnosis: FaultDiagnosis;
  safety_compliance: SafetyCompliance;
  predictive_maintenance: PredictiveMaintenance;
  parts_recommendation: PartsRecommendation;
  digital_twin: DigitalTwinState;
}

export interface MultiAgentResponse {
  mode: 'multi_agent';
  report: MultiAgentReport;
}

export interface SimpleRAGResponse {
  mode: 'simple_rag';
  manual_key: string;
  context: string;
  answer: string;
}

export interface DirectMemoryResponse {
  mode: 'direct_memory_answer';
  answer: string;
}

export type AskResponse = MultiAgentResponse | SimpleRAGResponse | DirectMemoryResponse;

export interface QAPairAnswer {
  summary: string;
  table: Record<string, any>;
}

export interface QAPair {
  id: number;
  query: string;
  answer: QAPairAnswer;
  mode: 'simple_rag' | 'multi_agent' | string;
  timestamp: string;
}

export interface QAHistoryResponse {
  session_id: string;
  qa_pairs: QAPair[];
}

export interface ManualMeta {
  file: string;
  description: string;
}

export interface ManualsResponse {
  registry: Record<string, ManualMeta>;
  ingested_status: Record<string, string>;
}
```

---

## 6. Frontend Integration Examples (JavaScript / TypeScript)

### Service Module (`apiService.ts`)

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiService = {
  // 1. Send Query
  async ask(payload: AskRequest): Promise<AskResponse> {
    const res = await fetch(`${BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to submit query');
    }
    return res.json();
  },

  // 2. Fetch Chat / QA History for Session
  async getQAHistory(sessionId: string): Promise<QAHistoryResponse> {
    const res = await fetch(`${BASE_URL}/qa-history/${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error('Failed to load QA history');
    return res.json();
  },

  // 3. Clear Session History (New Chat)
  async clearHistory(sessionId: string): Promise<{ status: string; session_id: string }> {
    const res = await fetch(`${BASE_URL}/history/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear session history');
    return res.json();
  },

  // 4. Fetch Manuals List & Status
  async getManuals(): Promise<ManualsResponse> {
    const res = await fetch(`${BASE_URL}/manuals`);
    if (!res.ok) throw new Error('Failed to fetch manuals');
    return res.json();
  },

  // 5. Ingest a Manual
  async ingestManual(manualKey: string): Promise<{ result: string }> {
    const res = await fetch(`${BASE_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_key: manualKey }),
    });
    if (!res.ok) throw new Error('Failed to ingest manual');
    return res.json();
  },
};
```

---

## 7. Status Code & Error Handling Guidelines

| Status Code | Meaning | Cause | Frontend Action |
| :---: | :--- | :--- | :--- |
| `200` | OK | Request succeeded | Render response payload in UI. |
| `404` | Not Found | Unknown `manual_key` passed to `/ingest` | Alert user that manual key is invalid. |
| `422` | Unprocessable Entity | Pydantic validation failed (e.g. missing `query` field) | Check request JSON body structure. |
| `500` | Internal Server Error | LLM inference, embedding model, or vector search exception | Show friendly toast / error state to user. |
