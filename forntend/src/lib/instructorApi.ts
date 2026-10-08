// ─── Types matching the FastAPI /ask response shapes ──────────────────────────

export type FaultDiagnosis = {
  probable_fault: string
  root_cause: string
  confidence_percent: number
  affected_component: string
}

export type SafetyCompliance = {
  safety_status: string
  warnings: string[]
  applicable_regulations: string[]
  compliance_notes: string
}

export type PredictiveMaintenance = {
  health_score_percent: number
  remaining_useful_life_hours: number
  failure_probability_percent: number
  maintenance_recommendation: string
}

export type PartsRecommendation = {
  part_number: string
  part_description: string
  quantity_required: number
  alternative_part_numbers: string[]
}

export type DigitalTwin = {
  timestamp: string
  aircraft_model: string
  engine_model: string
  sensor_snapshot: Record<string, string>
  fault_diagnosis: FaultDiagnosis
  safety_compliance: SafetyCompliance
  predictive_maintenance: PredictiveMaintenance
  parts_recommendation: PartsRecommendation
  twin_summary: string
  overall_status: string
}

export type MultiAgentReport = {
  manual_key: string
  fault_diagnosis: FaultDiagnosis
  safety_compliance: SafetyCompliance
  predictive_maintenance: PredictiveMaintenance
  parts_recommendation: PartsRecommendation
  digital_twin: DigitalTwin
  context?: string
}

export type MultiAgentResponse = {
  mode: "multi_agent"
  report: MultiAgentReport
  context?: string
}

export type SimpleRagResponse = {
  mode: "simple_rag"
  manual_key: string
  context: string
  answer: string
}

export type DirectMemoryResponse = {
  mode: "direct_memory_answer"
  answer: string
}

export type AskApiResponse = MultiAgentResponse | SimpleRagResponse | DirectMemoryResponse

export type AskPayload = {
  query: string
  session_id: string
  use_agents: boolean
  sensor_data?: Record<string, string>
  aircraft_info?: { aircraft_model: string; engine_model: string }
}

const API_BASE = "http://localhost:8000"

export async function askInstructorAgent(payload: AskPayload): Promise<AskApiResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Instructor agent request failed (${res.status})`)
  }

  return res.json()
}

// ─── Helper: parse the simple_rag "context" blob into structured chunks ───────
export type ContextMatch = {
  id: string
  distance: number | null
  source: string
  page: string
  content: string
  images: { name: string; url: string }[]
}

export function parseContextMatches(context: string): ContextMatch[] {
  if (!context) return []
  const blocks = context.split(/(?=Match\s+\d+\s+\(Distance:)/g).filter((b) => b.trim().length > 0)

  return blocks.map((block, i) => {
    const header = block.match(/Match\s+(\d+)\s+\(Distance:\s*([\d.]+)\s*\|\s*Source:\s*([^,]+),\s*Page:\s*(\d+)\)/)
    
    // Extract associated images if present
    const images: { name: string; url: string }[] = []
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\((file:\/\/\/[^)]+)\)/g
    let match: RegExpExecArray | null
    while ((match = imgRegex.exec(block)) !== null) {
      const name = match[1] || match[3] || "Image"
      let url = match[2] || match[4]
      // Convert file URL to backend HTTP URL if needed
      if (url.startsWith("file:///")) {
        const parts = url.split("image_holder/")
        if (parts.length > 1) {
          url = `${API_BASE}/images/${parts[1]}`
        }
      }
      images.push({ name, url })
    }

    let content = block.replace(/Match\s+\d+\s+\(Distance:.*?\)/, "")
    content = content.replace(/^\s*(?:Associated Images:.*\n)?---\n?/, "")
    content = content.replace(/\n---\s*$/, "").trim()

    return {
      id: header ? header[1] : String(i + 1),
      distance: header ? parseFloat(header[2]) : null,
      source: header ? header[3].trim() : "Unknown source",
      page: header ? header[4] : "?",
      content,
      images,
    }
  })
}

// ─── Types matching the /qa-history/{session_id} response shape ──────────────
export type QaHistoryEntry = {
  id: number
  query: string
  answer: {
    summary: string
    table: MultiAgentReport | { manual_key: string; answer: string; context?: string }
  }
  mode: "multi_agent" | "simple_rag" | string
  timestamp: string
}

export type QaHistoryResponse = {
  session_id: string
  qa_pairs: QaHistoryEntry[]
}

export async function getQaHistory(sessionId: string): Promise<QaHistoryResponse> {
  const res = await fetch(`${API_BASE}/qa-history/${encodeURIComponent(sessionId)}`)
  if (!res.ok) {
    throw new Error(`Failed to load history (${res.status})`)
  }
  return res.json()
}

// ─── Sessions listing and management ──────────────────────────────────────────
export type SessionItem = {
  session_id: string
  title: string
  last_query: string
  mode: string
  turn_count: number
  last_timestamp: string
}

export async function getSessions(): Promise<{ sessions: SessionItem[] }> {
  const res = await fetch(`${API_BASE}/sessions`)
  if (!res.ok) {
    throw new Error(`Failed to load sessions (${res.status})`)
  }
  return res.json()
}

export async function deleteSession(sessionId: string): Promise<{ status: string; session_id: string }> {
  const res = await fetch(`${API_BASE}/history/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    throw new Error(`Failed to delete session (${res.status})`)
  }
  return res.json()
}

// ─── Manuals and Ingestion APIs ───────────────────────────────────────────────
export type ManualMeta = {
  file: string
  description: string
}

export type ManualsResponse = {
  registry: Record<string, ManualMeta>
  ingested_status: Record<string, string> | string
}

export async function getManuals(): Promise<ManualsResponse> {
  const res = await fetch(`${API_BASE}/manuals`)
  if (!res.ok) {
    throw new Error(`Failed to load manuals (${res.status})`)
  }
  return res.json()
}

export async function ingestManual(manualKey: string): Promise<{ result: string }> {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manual_key: manualKey }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Failed to ingest manual")
  }
  return res.json()
}

export async function ingestAllManuals(): Promise<{ results: Record<string, string> }> {
  const res = await fetch(`${API_BASE}/ingest-all`, {
    method: "POST",
  })
  if (!res.ok) {
    throw new Error(`Failed to ingest all manuals (${res.status})`)
  }
  return res.json()
}

export async function uploadManual(formData: FormData): Promise<{ status: string; manual_key: string; filename: string; ingest_result: string }> {
  const res = await fetch(`${API_BASE}/upload-manual`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Failed to upload manual")
  }
  return res.json()
}

// Converts one history entry into the same AskApiResponse shape ReportDisplay expects
export function historyEntryToReport(entry: QaHistoryEntry): AskApiResponse {
  if (entry.mode === "multi_agent") {
    return {
      mode: "multi_agent",
      report: entry.answer.table as MultiAgentReport,
    }
  }
  const t = entry.answer.table as { manual_key: string; answer: string; context?: string }
  return {
    mode: "simple_rag",
    manual_key: t.manual_key || "Manual",
    answer: t.answer || entry.answer.summary || "",
    context: t.context ?? "",
  }
}