"use client"

import { useState, useEffect } from "react"
import {
  AlertTriangle,
  ShieldCheck,
  Gauge,
  PackageSearch,
  Radar,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Bot,
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

const AGENT_STEPS = [
  {
    id: 1,
    name: "Fault Diagnosis Agent",
    icon: AlertTriangle,
    workingText: "Working on Fault Diagnosis...",
    detailWorking: "Analyzing engine symptoms, sensor telemetry & manual procedures...",
    completeText: "Fault diagnosis complete",
    color: "#06B6D4",
  },
  {
    id: 2,
    name: "Safety & Compliance Agent",
    icon: ShieldCheck,
    workingText: "Safety & Compliance Verification...",
    detailWorking: "Checking FAA airworthiness directives & OEM precautions...",
    completeText: "Safety & Compliance: Approved with precautions",
    color: "#10B981",
  },
  {
    id: 3,
    name: "Predictive Maintenance Agent",
    icon: Gauge,
    workingText: "Calculating Predictive Maintenance...",
    detailWorking: "Forecasting component health score & remaining useful life (RUL)...",
    completeText: "Predictive Maintenance complete",
    color: "#F59E0B",
  },
  {
    id: 4,
    name: "Parts Recommendation Agent",
    icon: PackageSearch,
    workingText: "Recommending OEM Parts...",
    detailWorking: "Querying technical catalog for replacement part numbers & alternates...",
    completeText: "Parts Recommendation complete",
    color: "#8B5CF6",
  },
  {
    id: 5,
    name: "Digital Twin Agent",
    icon: Radar,
    workingText: "Building Digital Twin Snapshot...",
    detailWorking: "Synthesizing virtual twin state & executive narrative summary...",
    completeText: "Digital Twin Snapshot finalized",
    color: "#3B82F6",
  },
]

export default function AgentPipelineTracker({ C }: { C: ColorTokens }) {
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    // Progress through the 5 steps smoothly
    const timer1 = setTimeout(() => setCurrentStep(2), 2200)
    const timer2 = setTimeout(() => setCurrentStep(3), 4500)
    const timer3 = setTimeout(() => setCurrentStep(4), 6800)
    const timer4 = setTimeout(() => setCurrentStep(5), 9000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  return (
    <div
      className="p-4 rounded-2xl flex flex-col gap-3.5 my-2 shadow-lg animate-in fade-in"
      style={{
        background: "rgba(6,182,212,0.04)",
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Tracker Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" style={{ color: C.accent }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.accent }}>
            5-Agent Pipeline Orchestration
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Step {Math.min(currentStep, 5)} / 5 Active
        </span>
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-2.5">
        {AGENT_STEPS.map((step) => {
          const isDone = currentStep > step.id
          const isCurrent = currentStep === step.id
          const isPending = currentStep < step.id

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl flex items-center justify-between gap-3 transition-all duration-300 ${
                isCurrent
                  ? "bg-cyan-500/10 border border-cyan-500/30 scale-[1.01]"
                  : isDone
                  ? "bg-white/5 border border-white/5 opacity-80"
                  : "bg-transparent border border-transparent opacity-40"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: isDone
                      ? "rgba(16,185,129,0.2)"
                      : isCurrent
                      ? `${step.color}25`
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${
                      isDone ? "#10B981" : isCurrent ? step.color : "rgba(255,255,255,0.1)"
                    }`,
                  }}
                >
                  <step.icon
                    className="h-3.5 w-3.5"
                    style={{ color: isDone ? "#10B981" : isCurrent ? step.color : C.sub }}
                  />
                </div>

                <div className="flex flex-col min-w-0">
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: isCurrent ? C.text : isDone ? C.text : C.sub }}
                  >
                    {step.name}
                  </span>
                  <span className="text-[11px] leading-tight" style={{ color: isCurrent ? step.color : C.sub }}>
                    {isDone ? step.completeText : isCurrent ? step.detailWorking : "Pending..."}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Complete
                  </span>
                ) : isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/40 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Working...
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Queued</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
