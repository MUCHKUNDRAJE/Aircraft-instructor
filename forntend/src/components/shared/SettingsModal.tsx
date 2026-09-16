"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  X,
  Cpu,
  Sliders,
  SlidersHorizontal,
  Bot,
  Gauge,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
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
}

const DEFAULT_SETTINGS: AppSettings = {
  llmModel: "google/gemma-2-2b-it (Local Ollama)",
  topK: 5,
  telemetryFrequency: "1s",
  defaultAgents: true,
  temperature: 0.2,
  strictFaaMode: true,
}

export default function SettingsModal({
  open,
  onClose,
  C,
}: {
  open: boolean
  onClose: () => void
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
      onClose()
    }, 600)
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    if (typeof window !== "undefined") {
      localStorage.setItem("aero_intel_settings", JSON.stringify(DEFAULT_SETTINGS))
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl p-5 flex flex-col gap-4"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: C.text }}>
                System & AI Diagnostics Settings
              </h2>
              <p className="text-[11px]" style={{ color: C.sub }}>
                Configure LLM inference, RAG similarity thresholds, and telemetry
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

        {/* Settings Form */}
        <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* 1. LLM Model Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              Reasoning LLM Engine
            </label>
            <select
              value={settings.llmModel}
              onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all cursor-pointer"
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

          {/* 2. Vector Search Retrieval Depth (Top-K) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
                <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                Vector Search Depth (Top-K Chunks)
              </span>
              <span className="font-mono font-bold text-cyan-400">{settings.topK} Chunks</span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={settings.topK}
              onChange={(e) => setSettings({ ...settings, topK: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px]" style={{ color: C.sub }}>
              Higher values retrieve more manual sections for complex queries.
            </span>
          </div>

          {/* 3. Telemetry Simulation Rate */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
              Live Telemetry Simulation Refresh Rate
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["1s", "2s", "5s", "Paused"].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setSettings({ ...settings, telemetryFrequency: freq })}
                  className="py-1.5 rounded-lg text-xs font-semibold transition-all"
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
          </div>

          {/* 4. Temperature / Creativity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                LLM Temperature (Creativity vs Determinism)
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
            <span className="text-[10px]" style={{ color: C.sub }}>
              Lower temperature ensures exact procedural adherence to OEM manuals.
            </span>
          </div>

          {/* 5. Strict FAA Compliance Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                Strict FAA Safety Enforcement
              </span>
              <span className="text-[10px]" style={{ color: C.sub }}>
                Requires safety agent approval before issuing part recommendations
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ color: C.sub }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.02]"
              style={{
                background: C.button,
                boxShadow: `0 0 16px ${C.button}40`,
              }}
            >
              {savedToast ? <Check className="h-3.5 w-3.5" /> : null}
              {savedToast ? "Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
