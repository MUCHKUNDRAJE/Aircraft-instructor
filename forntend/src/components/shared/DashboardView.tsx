"use client"

import {
  Plane,
  Cpu,
  MessageSquare,
  Bot,
  FileText,
  Activity,
  Layers,
  Thermometer,
  Gauge,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  BookOpen,
} from "lucide-react"
import { type SessionItem } from "@/lib/instructorApi"

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

export default function DashboardView({
  sessions,
  onSelectSession,
  onNewSession,
  onOpenManuals,
  C,
}: {
  sessions: SessionItem[]
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onOpenManuals: () => void
  C: ColorTokens
}) {
  const totalSessions = sessions.length
  const totalTurns = sessions.reduce((acc, s) => acc + (s.turn_count || 1), 0)
  const multiAgentSessions = sessions.filter((s) => s.mode === "multi_agent").length
  const ragSessions = totalSessions - multiAgentSessions

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: C.bg }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header Title */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Plane className="h-5 w-5" style={{ color: C.accent }} />
              <h1 className="text-xl font-bold tracking-tight" style={{ color: C.text }}>
                Aircraft Fleet & Maintenance Intelligence Dashboard
              </h1>
            </div>
            <p className="text-xs" style={{ color: C.sub }}>
              Real-time aircraft diagnostics overview, conversational session metrics, and technical manual indexing stats.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenManuals}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: "rgba(6,182,212,0.12)",
                color: C.accent,
                border: `1px solid ${C.accent}30`,
              }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Manuals & Ingestion
            </button>
            <button
              onClick={onNewSession}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] text-white"
              style={{
                background: C.button,
                boxShadow: `0 0 16px ${C.button}40`,
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Session
            </button>
          </div>
        </div>

        {/* ─── Metric Cards Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="p-4 rounded-xl relative overflow-hidden transition-all"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: C.sub }}>
                Total Sessions
              </span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>
              {totalSessions}
            </div>
            <span className="text-[11px] text-cyan-400 mt-1 block">Active conversation threads</span>
          </div>

          <div
            className="p-4 rounded-xl relative overflow-hidden transition-all"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: C.sub }}>
                Total Q&A Turns
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>
              {totalTurns}
            </div>
            <span className="text-[11px] text-blue-400 mt-1 block">Queries & diagnostic reports</span>
          </div>

          <div
            className="p-4 rounded-xl relative overflow-hidden transition-all"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: C.sub }}>
                5-Agent Pipelines
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Bot className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>
              {multiAgentSessions}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">Full diagnostic workflows</span>
          </div>

          <div
            className="p-4 rounded-xl relative overflow-hidden transition-all"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: C.sub }}>
                Simple RAG Queries
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>
              {ragSessions}
            </div>
            <span className="text-[11px] text-amber-400 mt-1 block">Direct manual lookups</span>
          </div>
        </div>

        {/* ─── Aircraft Information & Telemetry Status ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Aircraft & Engine Specs */}
          <div
            className="p-4 rounded-xl flex flex-col gap-3"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Plane className="h-4 w-4" style={{ color: C.accent }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.text }}>
                Aircraft Fleet Profile
              </h2>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span style={{ color: C.sub }}>Aircraft Model</span>
                <span className="font-semibold" style={{ color: C.text }}>Boeing 737-800</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span style={{ color: C.sub }}>Engine Model</span>
                <span className="font-semibold" style={{ color: C.text }}>CFM56-7B Turbofan</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span style={{ color: C.sub }}>Operating Hours</span>
                <span className="font-semibold font-mono" style={{ color: C.accent }}>8,400 Flight Hours</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span style={{ color: C.sub }}>Flight Cycles</span>
                <span className="font-semibold font-mono" style={{ color: C.text }}>3,150 Cycles</span>
              </div>
              <div className="flex justify-between py-1">
                <span style={{ color: C.sub }}>Last Maintenance</span>
                <span className="font-semibold text-emerald-400">120 hrs ago (A-Check)</span>
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Snapshot */}
          <div
            className="lg:col-span-2 p-4 rounded-xl flex flex-col gap-3"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4" style={{ color: C.accent }} />
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.text }}>
                  Powerplant Telemetry Diagnostics (Live Sensor Baseline)
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Monitoring
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.sub }}>
                  <Thermometer className="h-3 w-3 text-cyan-400" />
                  EGT Cruise
                </div>
                <span className="text-lg font-mono font-bold mt-1" style={{ color: C.text }}>
                  640°C
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Nominal (&lt; 820°C)</span>
              </div>

              <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.sub }}>
                  <Gauge className="h-3 w-3 text-cyan-400" />
                  Oil Pressure
                </div>
                <span className="text-lg font-mono font-bold mt-1" style={{ color: C.text }}>
                  42 PSI
                </span>
                <span className="text-[10px] text-amber-400 font-medium">Caution threshold</span>
              </div>

              <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.sub }}>
                  <Zap className="h-3 w-3 text-cyan-400" />
                  Vibration (IPS)
                </div>
                <span className="text-lg font-mono font-bold mt-1" style={{ color: C.text }}>
                  2.8 mm/s
                </span>
                <span className="text-[10px] text-amber-400 font-medium">Elevated harmonic</span>
              </div>

              <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.sub }}>
                  <Clock className="h-3 w-3 text-cyan-400" />
                  Estimated RUL
                </div>
                <span className="text-lg font-mono font-bold mt-1 text-cyan-400">
                  85 Hours
                </span>
                <span className="text-[10px] text-cyan-300 font-medium">Inspection due</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Recent Sessions Table ────────────────────────────────────────── */}
        <div
          className="p-4 rounded-xl flex flex-col gap-3"
          style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" style={{ color: C.accent }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.text }}>
                Recent Aircraft Diagnostic Sessions
              </h2>
            </div>
            <span className="text-xs" style={{ color: C.sub }}>
              {sessions.length} sessions logged in SQLite
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider" style={{ color: C.sub }}>
                  <th className="py-2.5 px-3">Session Inquiry</th>
                  <th className="py-2.5 px-3">Reasoning Mode</th>
                  <th className="py-2.5 px-3">Turns</th>
                  <th className="py-2.5 px-3">Last Recorded</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center italic" style={{ color: C.sub }}>
                      No sessions found. Start a conversation to view records!
                    </td>
                  </tr>
                ) : (
                  sessions.slice(0, 8).map((s) => (
                    <tr
                      key={s.session_id}
                      onClick={() => onSelectSession(s.session_id)}
                      className="hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 font-medium max-w-xs truncate" style={{ color: C.text }}>
                        {s.title}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: s.mode === "multi_agent" ? "rgba(16,185,129,0.15)" : "rgba(6,182,212,0.15)",
                            color: s.mode === "multi_agent" ? "#34D399" : "#38BDF8",
                          }}
                        >
                          {s.mode === "multi_agent" ? "🤖 Multi-Agent" : "📄 Simple RAG"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono" style={{ color: C.sub }}>
                        {s.turn_count}
                      </td>
                      <td className="py-3 px-3" style={{ color: C.sub }}>
                        {s.last_timestamp ? new Date(s.last_timestamp).toLocaleDateString() : "Recent"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform text-[11px] font-semibold">
                          Open <ArrowRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
