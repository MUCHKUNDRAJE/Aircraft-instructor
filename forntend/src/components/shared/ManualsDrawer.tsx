"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  Upload,
  Layers,
  Database,
  ArrowRight,
  Plus,
  FileUp,
} from "lucide-react"
import {
  getManuals,
  ingestManual,
  ingestAllManuals,
  uploadManual,
  type ManualsResponse,
} from "@/lib/instructorApi"

type ColorTokens = {
  bg: string
  card: string
  accent: string
  button: string
  success: string
  warning: string
  critical: string
  text: string
  sub: string
  border: string
  cardBorder: string
}

export default function ManualsDrawer({
  open,
  onClose,
  C,
}: {
  open: boolean
  onClose: () => void
  C: ColorTokens
}) {
  const [data, setData] = useState<ManualsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [ingestingKey, setIngestingKey] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Upload Form State
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newTwoCol, setNewTwoCol] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadManuals = async () => {
    setLoading(true)
    try {
      const res = await getManuals()
      setData(res)
    } catch (err) {
      console.error("Failed to load manuals:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadManuals()
      setStatusMessage(null)
      setShowUploadForm(false)
    }
  }, [open])

  const handleIngestSingle = async (key: string) => {
    setIngestingKey(key)
    setStatusMessage(null)
    try {
      const res = await ingestManual(key)
      setStatusMessage({ text: res.result || `Successfully ingested ${key}`, type: "success" })
      await loadManuals()
    } catch (err: any) {
      setStatusMessage({ text: err.message || `Failed to ingest ${key}`, type: "error" })
    } finally {
      setIngestingKey(null)
    }
  }

  const handleIngestAll = async () => {
    setIngestingKey("ALL")
    setStatusMessage(null)
    try {
      await ingestAllManuals()
      setStatusMessage({ text: "All manuals processed and indexed into ChromaDB!", type: "success" })
      await loadManuals()
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Batch ingestion failed", type: "error" })
    } finally {
      setIngestingKey(null)
    }
  }

  const handleUploadNewManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !newKey.trim() || !newDesc.trim()) {
      setStatusMessage({ text: "Please provide a manual key, description, and PDF file.", type: "error" })
      return
    }

    setUploading(true)
    setStatusMessage(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("manual_key", newKey.trim())
      formData.append("description", newDesc.trim())
      formData.append("two_column", String(newTwoCol))

      const res = await uploadManual(formData)
      setStatusMessage({
        text: `Manual '${res.manual_key}' uploaded and indexed successfully (${res.ingest_result})`,
        type: "success",
      })
      // Reset form
      setNewKey("")
      setNewDesc("")
      setSelectedFile(null)
      setShowUploadForm(false)
      await loadManuals()
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to upload manual", type: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 overflow-y-auto flex flex-col shadow-2xl ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      style={{
        width: "min(480px, 94vw)",
        background: C.card,
        borderLeft: `1px solid ${C.border}`,
      }}
    >
      {/* Drawer Header */}
      <div
        className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
        style={{ borderBottom: `1px solid ${C.cardBorder}`, background: C.card }}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: C.text }}>
              Technical Manuals & Vector DB
            </h2>
            <p className="text-[11px]" style={{ color: C.sub }}>
              Upload and index PDF manuals into ChromaDB
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: C.sub }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Status notification banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* Action Bar: Ingest All + Add New Manual Button */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] text-white"
            style={{
              background: C.button,
              boxShadow: `0 0 12px ${C.button}40`,
            }}
          >
            <Plus className="h-4 w-4" />
            {showUploadForm ? "Hide Upload Form" : "Upload New Manual"}
          </button>

          <button
            onClick={handleIngestAll}
            disabled={ingestingKey !== null || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            style={{
              background: "rgba(6,182,212,0.12)",
              color: C.accent,
              border: `1px solid ${C.accent}30`,
            }}
            title="Re-embed all registered manuals into ChromaDB"
          >
            {ingestingKey === "ALL" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            Ingest All
          </button>
        </div>

        {/* Upload Form (Expandable) */}
        {showUploadForm && (
          <form
            onSubmit={handleUploadNewManual}
            className="p-4 rounded-xl flex flex-col gap-3 animate-in fade-in"
            style={{
              background: "rgba(6,182,212,0.06)",
              border: `1px solid ${C.accent}40`,
            }}
          >
            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
              <FileUp className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold" style={{ color: C.text }}>
                Register & Ingest New Aircraft PDF Manual
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold" style={{ color: C.text }}>
                Manual Key / Identifier *
              </label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. B737-HYDRAULIC-SYSTEM"
                required
                className="px-3 py-1.5 rounded-lg text-xs font-mono outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${C.cardBorder}`,
                  color: C.text,
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold" style={{ color: C.text }}>
                Description (Routing & RAG Context) *
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Boeing 737 hydraulic pumps, reservoir, actuators, and valve inspection..."
                rows={2}
                required
                className="px-3 py-1.5 rounded-lg text-xs outline-none resize-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${C.cardBorder}`,
                  color: C.text,
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold" style={{ color: C.text }}>
                Select PDF File *
              </label>
              <input
                type="file"
                accept=".pdf"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="twoCol"
                checked={newTwoCol}
                onChange={(e) => setNewTwoCol(e.target.checked)}
                className="rounded accent-cyan-400 cursor-pointer"
              />
              <label htmlFor="twoCol" className="text-[11px] cursor-pointer" style={{ color: C.sub }}>
                Two-column layout PDF (e.g. FAA Handbooks)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-3 py-1 rounded-lg text-xs"
                style={{ color: C.sub }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: C.button }}
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" /> Uploading & Ingesting...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3" /> Upload & Ingest
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Registered Manuals List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.sub }}>
              Registered Aircraft Manuals
            </span>
            <button
              onClick={loadManuals}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {!data ? (
            <div className="py-8 text-center text-xs" style={{ color: C.sub }}>
              Loading manual registry...
            </div>
          ) : (
            Object.entries(data.registry).map(([key, meta]) => {
              const isIngesting = ingestingKey === key
              const statusStr =
                typeof data.ingested_status === "object" && data.ingested_status !== null
                  ? data.ingested_status[key] || "Ready to ingest"
                  : typeof data.ingested_status === "string"
                  ? data.ingested_status
                  : "Ready to ingest"

              return (
                <div
                  key={key}
                  className="p-3.5 rounded-xl flex flex-col gap-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.cardBorder}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="text-xs font-mono font-bold" style={{ color: C.text }}>
                        {key}
                      </span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono shrink-0"
                      style={{
                        background: statusStr.includes("chunks") ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                        color: statusStr.includes("chunks") ? "#34D399" : "#FBBF24",
                      }}
                    >
                      {statusStr}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: C.sub }}>
                    {meta.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="font-mono text-[10px]" style={{ color: `${C.sub}90` }}>
                      File: {meta.file}
                    </span>
                    <button
                      onClick={() => handleIngestSingle(key)}
                      disabled={isIngesting || ingestingKey !== null}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(6,182,212,0.12)",
                        color: C.accent,
                        border: `1px solid ${C.accent}30`,
                      }}
                    >
                      {isIngesting ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" /> Ingesting...
                        </>
                      ) : (
                        <>
                          <Database className="h-3 w-3" /> Re-index / Ingest
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
