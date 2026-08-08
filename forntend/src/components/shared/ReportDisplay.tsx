"use client"

import {
  ChevronDown,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  PackageSearch,
  Radar,
  FileText,
  Gauge,
} from "lucide-react"
import { askInstructorAgent, parseContextMatches, type AskApiResponse, type MultiAgentReport as MultiAgentReportType } from "@/lib/instructorApi"
import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

function levelColor(pct: number, invert: boolean, C: ColorTokens) {
  const good = invert ? pct < 35 : pct > 70
  const bad = invert ? pct > 65 : pct < 35
  if (bad) return C.critical
  if (good) return C.success
  return C.warning
}

function StatusBadge({ label, tone, C }: { label: string; tone: "ok" | "warning" | "critical"; C: ColorTokens }) {
  const color = tone === "critical" ? C.critical : tone === "warning" ? C.warning : C.success
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
  )
}

function Bar({ pct, color, C }: { pct: number; color: string; C: ColorTokens }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: `${C.cardBorder}` }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: color }} />
    </div>
  )
}

// ─── Document-style collapsible section: hairline divider, no card box ────────
function Section({
  icon: Icon,
  title,
  badge,
  defaultOpen = false,
  C,
  children,
}: {
  icon: React.ElementType
  title: string
  badge?: React.ReactNode
  defaultOpen?: boolean
  C: ColorTokens
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: `1px solid ${C.cardBorder}` }} className="pb-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2.5 py-2 text-left">
        <Icon className="h-4 w-4 shrink-0" style={{ color: C.accent }} />
        <span className="flex-1 text-2xl font-semibold" style={{ color: C.text }}>
          {title}
        </span>
        {badge}
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform"
          style={{ color: C.sub, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <div className="flex flex-col gap-2.5 pt-1">{children}</div>}
    </div>
  )
}

function renderInline(text: string, C: ColorTokens): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const token = match[0]
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="px-1 py-0.5 rounded text-[12px] font-mono"
          style={{ background: "rgba(6,182,212,0.12)", color: C.accent }}
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} style={{ color: C.text }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

// FIX: now takes C as a prop instead of pulling from a disconnected local
// ThemeContext that always defaulted to dark colors.
function MarkdownRenderer({ content, C }: { content: string; C: ColorTokens }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []
  let listType: "ul" | "ol" | null = null
  let codeBuffer: string[] = []
  let inCode = false

  const flushList = () => {
    if (listBuffer.length === 0) return
    const items = listBuffer
    if (listType === "ol") {
      elements.push(
        <ol key={`list-${elements.length}`} className="list-decimal ml-5 mb-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed mb-0.5" style={{ color: C.sub }}>
              {renderInline(item, C)}
            </li>
          ))}
        </ol>
      )
    } else {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc ml-5 mb-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed mb-0.5" style={{ color: C.sub }}>
              {renderInline(item, C)}
            </li>
          ))}
        </ul>
      )
    }
    listBuffer = []
    listType = null
  }

  lines.forEach((line, idx) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="rounded-lg p-3 mb-2 overflow-x-auto text-[12px] font-mono"
            style={{ background: "#0d1526", border: `1px solid ${C.cardBorder}`, color: C.accent }}
          >
            {codeBuffer.join("\n")}
          </pre>
        )
        codeBuffer = []
        inCode = false
      } else {
        flushList()
        inCode = true
      }
      return
    }
    if (inCode) {
      codeBuffer.push(line)
      return
    }
    const headerMatch = line.match(/^(#{1,3})\s+(.*)/)
    if (headerMatch) {
      flushList()
      const level = headerMatch[1].length
      const sizeClass =
        level === 1
          ? "text-lg font-bold mb-2 mt-1"
          : level === 2
          ? "text-base font-bold mb-1.5 mt-1"
          : "text-sm font-semibold mb-1 mt-1"
      elements.push(
        <p key={`h-${idx}`} className={sizeClass} style={{ color: C.text }}>
          {renderInline(headerMatch[2], C)}
        </p>
      )
      return
    }
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/)
    if (bulletMatch) {
      if (listType !== "ul") flushList()
      listType = "ul"
      listBuffer.push(bulletMatch[1])
      return
    }
    const numberedMatch = line.match(/^\s*\d+\.\s+(.*)/)
    if (numberedMatch) {
      if (listType !== "ol") flushList()
      listType = "ol"
      listBuffer.push(numberedMatch[1])
      return
    }
    flushList()
    if (line.trim() === "") return
    elements.push(
      <p key={`p-${idx}`} className="text-sm leading-relaxed mb-2" style={{ color: C.sub }}>
        {renderInline(line, C)}
      </p>
    )
  })
  flushList()
  return <>{elements}</>
}

function KeyValue({ label, value, C }: { label: string; value: React.ReactNode; C: ColorTokens }) {
  return (
    <div className="flex justify-between gap-3 text-xs py-0.5">
      <span style={{ color: C.sub }}>{label}</span>
      <span className="text-right font-medium" style={{ color: C.text }}>
        {value}
      </span>
    </div>
  )
}

// ─── Multi-agent report view, restyled to read like a document ────────────────
function MultiAgentReportView({ report, C }: { report: MultiAgentReportType; C: ColorTokens }) {
  const { fault_diagnosis, safety_compliance, predictive_maintenance, parts_recommendation, digital_twin, manual_key } =
    report

  const uniqueWarnings = Array.from(new Set(safety_compliance.warnings.map((w: string) => w.trim())))
  const safetyTone = safety_compliance.safety_status?.toLowerCase().includes("approved") ? "ok" : "critical"
  const healthColor = levelColor(predictive_maintenance.health_score_percent, false, C)
  const failureColor = levelColor(predictive_maintenance.failure_probability_percent, true, C)
  const overallTone = digital_twin.overall_status?.toLowerCase().includes("action") ? "warning" : "ok"

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: `${C.accent}15`, color: C.accent }}>
          {manual_key}
        </span>
        <StatusBadge label={digital_twin.overall_status} tone={overallTone} C={C} />
      </div>

      <Section
        icon={AlertTriangle}
        title="Fault Diagnosis"
        defaultOpen
        C={C}
        badge={<span className="text-[11px] font-mono" style={{ color: C.accent }}>{fault_diagnosis.confidence_percent}% conf.</span>}
      >
        <p className="text-sm" style={{ color: C.text }}>{fault_diagnosis.probable_fault}</p>
        <p className="text-xs leading-relaxed" style={{ color: C.sub }}>{fault_diagnosis.root_cause}</p>
        <KeyValue label="Affected component" value={fault_diagnosis.affected_component} C={C} />
      </Section>

      <Section
        icon={safetyTone === "ok" ? ShieldCheck : ShieldAlert}
        title="Safety & Compliance"
        C={C}
        badge={<StatusBadge label={safety_compliance.safety_status} tone={safetyTone} C={C} />}
      >
        <div className="flex flex-col gap-1">
          {uniqueWarnings.map((w, i) => (
            <div key={i} className="flex gap-1.5 text-sm leading-relaxed" style={{ color: C.sub }}>
              <span style={{ color: C.warning }}>•</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
        {safety_compliance.compliance_notes && (
          <p className="text-xs italic pt-1" style={{ color: C.sub }}>
            {safety_compliance.compliance_notes}
          </p>
        )}
      </Section>

      <Section icon={Gauge} title="Predictive Maintenance" C={C}>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: C.sub }}>Health score</span>
            <span style={{ color: healthColor }}>{predictive_maintenance.health_score_percent}%</span>
          </div>
          <Bar pct={predictive_maintenance.health_score_percent} color={healthColor} C={C} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: C.sub }}>Failure probability</span>
            <span style={{ color: failureColor }}>{predictive_maintenance.failure_probability_percent}%</span>
          </div>
          <Bar pct={predictive_maintenance.failure_probability_percent} color={failureColor} C={C} />
        </div>
        <KeyValue label="Remaining useful life" value={`${predictive_maintenance.remaining_useful_life_hours} hrs`} C={C} />
        <p className="text-md leading-relaxed pt-1" style={{ color: C.sub }}>
          {predictive_maintenance.maintenance_recommendation}
        </p>
      </Section>

      <Section icon={PackageSearch} title="Parts Recommendation" C={C}>
        <KeyValue label="Part" value={parts_recommendation.part_number} C={C} />
        <KeyValue label="Quantity" value={parts_recommendation.quantity_required} C={C} />
        <p className="text-xs leading-relaxed" style={{ color: C.sub }}>{parts_recommendation.part_description}</p>
        {parts_recommendation.alternative_part_numbers?.length > 0 && (
          <KeyValue label="Alternatives" value={parts_recommendation.alternative_part_numbers.join(", ")} C={C} />
        )}
      </Section>

    <Section icon={Radar} title="Digital Twin Snapshot" C={C}>
  <KeyValue label="Aircraft" value={digital_twin.aircraft_model} C={C} />
  <KeyValue label="Engine" value={digital_twin.engine_model} C={C} />
  <KeyValue label="Timestamp" value={new Date(digital_twin.timestamp).toLocaleString()} C={C} />

  <div className="pt-2 rounded-lg overflow-hidden" style={{ border: `1px solid ${C.cardBorder}` }}>
    <Table>
      <TableHeader>
        <TableRow style={{ borderColor: C.cardBorder }}>
          <TableHead className="text-xs" style={{ color: C.sub }}>Parameter</TableHead>
          <TableHead className="text-xs text-right" style={{ color: C.sub }}>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(digital_twin.sensor_snapshot).map(([k, v]) => (
          <TableRow key={k} style={{ borderColor: C.cardBorder }}>
            <TableCell className="text-xs capitalize" style={{ color: C.sub }}>
              {k.replace(/_/g, " ")}
            </TableCell>
            <TableCell className="text-xs text-right font-medium" style={{ color: C.text }}>
              {String(v)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>

  <p className="text-xs leading-relaxed pt-1" style={{ color: C.sub }}>
    {digital_twin.twin_summary}
  </p>
</Section>
    </div>
  )
}

// ─── Simple RAG view ────────────────────────────────────────────────────────────
function SimpleRagView({
  manual_key,
  answer,
  context,
  C,
}: {
  manual_key: string
  answer: string
  context: string
  C: ColorTokens
}) {
  const matches = parseContextMatches(context)

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <span className="text-[10px] font-mono px-2 py-0.5 rounded w-fit" style={{ background: `${C.accent}15`, color: C.accent }}>
        {manual_key}
      </span>

      <div className="rounded-xl p-3.5">
        <p className="text-sm leading-relaxed" style={{ color: C.text }}>
          <MarkdownRenderer content={answer} C={C} />
        </p>
      </div>

      <Section icon={FileText} title={`Retrieved Sources (${matches.length})`} C={C}>
        <div className="flex flex-col gap-2">
          {matches.map((m) => (
            <div key={m.id} className="rounded-lg p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-mono truncate" style={{ color: C.accent }}>{m.source}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px]" style={{ color: C.sub }}>Page {m.page}</span>
                  {m.distance !== null && (
                    <span className="text-[10px] font-mono" style={{ color: C.sub }}>
                      dist {m.distance.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: C.sub }}>{m.content}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ─── Root export ────────────────────────────────────────────────────────────────
export default function ReportDisplay({ data, C }: { data: AskApiResponse; C: ColorTokens }) {
  if (data.mode === "multi_agent") {
    return <MultiAgentReportView report={data.report} C={C} />
  }
  return <SimpleRagView manual_key={data.manual_key} answer={data.answer} context={data.context} C={C} />
}

export { askInstructorAgent }