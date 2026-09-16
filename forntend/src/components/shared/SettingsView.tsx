"use client"

import { useState } from "react"
import {
  Settings,
  Cpu,
  SlidersHorizontal,
  Gauge,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
  Database,
  Trash2,
  HardDrive,
  Save,
  Layers,
  FileCode,
  Terminal,
} from "lucide-react"

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

export type AppSettings = {
  llmModel: string
  topK: number
  telemetryFrequency: string
  defaultAgents: boolean
  temperature: number
  strictFaaMode: boolean
  embeddingModel: string
  maxMemoryTurns: number
}

const DEFAULT_SETTINGS: AppSettings = {
  llmModel: "google/gemma-2-2b-it (Local Ollama)",
  topK: 5,
  telemetryFrequency: "1s",
  defaultAgents: true,
  temperature: 0.2,
  strictFaaMode: true,
  embeddingModel: "BAAI/bge-base-en-v1.5 (CPU)",
  maxMemoryTurns: 5,
}

export default function SettingsView({
  C,
}: {
  C: ColorTokens
}) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aero_intel_settings")
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
        } catch {}
      }
    }
    return DEFAULT_SETTINGS
  })

  const [savedToast, setSavedToast] = useState(false)

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aero_intel_settings", JSON.stringify(settings))
    }
    setSavedToast(true)
    setTimeout(() => {
      setSavedToast(false)
    }, 2000)
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    if (typeof window !== "undefined") {
      localStorage.setItem("aero_intel_settings", JSON.stringify(DEFAULT_SETTINGS))
    }
    setSavedToast(true)
    setTimeout(() => {
      setSavedToast(false)
    }, 1500)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: C.bg }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-5 w-5" style={{ color: C.accent }} />
              <h1 className="text-xl font-bold tracking-tight" style={{ color: C.text }}>
                System & AI Diagnostics Settings
              </h1>
            </div>
            <p className="text-xs" style={{ color: C.sub }}>
              Manage local LLM models, vector database retrieval parameters, live sensor telemetry, and safety thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
              style={{ color: C.sub, border: `1px solid ${C.cardBorder}` }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.02]"
              style={{
                background: C.button,
                boxShadow: `0 0 16px ${C.button}40`,
              }}
            >
              {savedToast ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {savedToast ? "Saved Successfully!" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* ─── Settings Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: AI Reasoning & LLM Engine */}
          <div
            className="p-5 rounded-2xl flex flex-col gap-4 shadow-sm"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
                  Reasoning LLM Engine & Inference
                </h2>
                <span className="text-[10px]" style={{ color: C.sub }}>
                  Local Ollama & cloud model routing
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: C.text }}>
                Primary AI Model
              </label>
              <select
                value={settings.llmModel}
                onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all cursor-pointer font-medium"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.cardBorder}`,
                  color: C.text,
                }}
              >
                <option value="google/gemma-2-2b-it (Local Ollama)" className="bg-slate-900 text-white">
                  Gemma 2 2B (Local Ollama — Offline Optimized)
                </option>
                <option value="gemma:7b" className="bg-slate-900 text-white">
                  Gemma 7B (Local High-Accuracy)
                </option>
                <option value="claude-3-5-sonnet" className="bg-slate-900 text-white">
                  Claude 3.5 Sonnet (Cloud Expert)
                </option>
                <option value="llama-3.3-70b" className="bg-slate-900 text-white">
                  Llama 3.3 70B (High Reasoning)
                </option>
              </select>
            </div>

            {/* Temperature Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Model Temperature / Determinism
                </span>
                <span className="font-mono font-bold text-cyan-400">{settings.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px]" style={{ color: C.sub }}>
                <span>0.0 (Strict OEM Adherence)</span>
                <span>1.0 (Creative Inference)</span>
              </div>
            </div>

            {/* Default Agents Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 mt-1">
              <div className="flex flex-col">
                <span className="text-xs font-semibold" style={{ color: C.text }}>
                  Default to 5-Agent Diagnostic Pipeline
                </span>
                <span className="text-[10px]" style={{ color: C.sub }}>
                  Automatically runs Fault, Safety, Predictive, Parts, and Digital Twin agents
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, defaultAgents: !settings.defaultAgents })}
                className="h-5 w-9 rounded-full relative transition-colors"
                style={{ background: settings.defaultAgents ? C.button : "rgba(255,255,255,0.15)" }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ left: settings.defaultAgents ? "18px" : "2px" }}
                />
              </button>
            </div>
          </div>

          {/* Card 2: RAG Vector Database & Search Sensitivity */}
          <div
            className="p-5 rounded-2xl flex flex-col gap-4 shadow-sm"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
                  ChromaDB Retrieval & Semantic Search
                </h2>
                <span className="text-[10px]" style={{ color: C.sub }}>
                  Vector similarity chunking and embeddings
                </span>
              </div>
            </div>

            {/* Top-K Chunks Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
                  <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
                  Retrieval Depth (Top-K Chunks)
                </span>
                <span className="font-mono font-bold text-emerald-400">{settings.topK} Chunks</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={settings.topK}
                onChange={(e) => setSettings({ ...settings, topK: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <span className="text-[10px]" style={{ color: C.sub }}>
                Retrieves up to {settings.topK} most semantically relevant manual sections per inquiry.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: C.text }}>
                Embedding Model
              </label>
              <div
                className="w-full px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.cardBorder}`,
                  color: C.text,
                }}
              >
                <span>{settings.embeddingModel}</span>
                <span className="text-[10px] text-emerald-400 font-sans">Active (Offline)</span>
              </div>
            </div>

            {/* Strict FAA Safety Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 mt-1">
              <div className="flex flex-col">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  Strict FAA / OEM Compliance Mode
                </span>
                <span className="text-[10px]" style={{ color: C.sub }}>
                  Prohibits non-OEM certified procedures from being recommended
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, strictFaaMode: !settings.strictFaaMode })}
                className="h-5 w-9 rounded-full relative transition-colors"
                style={{ background: settings.strictFaaMode ? C.success : "rgba(255,255,255,0.15)" }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ left: settings.strictFaaMode ? "18px" : "2px" }}
                />
              </button>
            </div>
          </div>

          {/* Card 3: Live Sensor Telemetry & Simulation */}
          <div
            className="p-5 rounded-2xl flex flex-col gap-4 shadow-sm"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
                  Live Aircraft Telemetry Simulation
                </h2>
                <span className="text-[10px]" style={{ color: C.sub }}>
                  Sensor data stream jitter and polling rates
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold" style={{ color: C.text }}>
                Simulation Jitter Refresh Rate
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["1s", "2s", "5s", "Paused"].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setSettings({ ...settings, telemetryFrequency: freq })}
                    className="py-2 rounded-lg text-xs font-semibold transition-all"
                    style={
                      settings.telemetryFrequency === freq
                        ? { background: `${C.accent}20`, color: C.accent, border: `1px solid ${C.accent}50` }
                        : { background: "rgba(255,255,255,0.03)", color: C.sub, border: `1px solid ${C.cardBorder}` }
                    }
                  >
                    {freq}
                  </button>
                ))}
              </div>
              <span className="text-[10px]" style={{ color: C.sub }}>
                Simulates real-world Boeing 737 CFM56-7B live sensor telemetry variance.
              </span>
            </div>
          </div>

          {/* Card 4: SQLite Database & Memory Persistence */}
          <div
            className="p-5 rounded-2xl flex flex-col gap-4 shadow-sm"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
                  Conversation Memory & SQLite Database
                </h2>
                <span className="text-[10px]" style={{ color: C.sub }}>
                  Local persistence at aircraft_memory.db
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span style={{ color: C.sub }}>Database Path</span>
                <span className="font-mono text-[11px]" style={{ color: C.text }}>./aircraft_memory.db</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span style={{ color: C.sub }}>Context History Depth</span>
                <span className="font-semibold" style={{ color: C.accent }}>{settings.maxMemoryTurns} prior turns</span>
              </div>
              <div className="flex justify-between py-1">
                <span style={{ color: C.sub }}>Self-Healing Schema</span>
                <span className="font-semibold text-emerald-400">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
