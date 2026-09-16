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
  ImageIcon,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Layers,
} from "lucide-react"
import {
  askInstructorAgent,
  parseContextMatches,
  type AskApiResponse,
  type MultiAgentReport as MultiAgentReportType,
  type ContextMatch,
} from "@/lib/instructorApi"
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

// ─── Collapsible section ──────────────────────────────────────────────────────
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
        <span className="flex-1 text-base font-semibold" style={{ color: C.text }}>
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

// ─── Interactive Zoomable Image Lightbox Modal ────────────────────────────────
function ImageModal({
  src,
  alt,
  onClose,
  C,
}: {
  src: string
  alt: string
  onClose: () => void
  C: ColorTokens
}) {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom((z) => Math.min(z + 0.25, 3))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom((z) => Math.max(z - 0.25, 0.5))
  }

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom(1)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] rounded-2xl overflow-hidden p-4 flex flex-col items-center shadow-2xl"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="w-full flex items-center justify-between pb-3 mb-2" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: C.text }}>
                {alt || "Aircraft Technical Schematic"}
              </span>
              <span className="text-[11px]" style={{ color: C.sub }}>
                Extracted from Technical Manual (Zoom: {Math.round(zoom * 100)}%)
              </span>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white"
              title="Zoom In (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white"
              title="Zoom Out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white"
              title="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors text-white"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Zoomable Image Container */}
        <div className="overflow-auto w-full max-h-[75vh] flex items-center justify-center rounded-xl bg-black/50 p-4 border border-white/5">
          <img
            src={src}
            alt={alt}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
            className="object-contain max-h-[68vh] rounded shadow-lg select-none cursor-grab active:cursor-grabbing"
          />
        </div>
      </div>
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

export function MarkdownRenderer({ content, C }: { content: string; C: ColorTokens }) {
  const [activeImg, setActiveImg] = useState<{ src: string; alt: string } | null>(null)
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
    // Check for markdown images: ![alt](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
    if (imgMatch) {
      flushList()
      const alt = imgMatch[1] || "Extracted Diagram"
      const src = imgMatch[2]
      elements.push(
        <div key={`img-${idx}`} className="my-2.5 rounded-lg overflow-hidden border border-white/10 group relative">
          <img
            src={src}
            alt={alt}
            onClick={() => setActiveImg({ src, alt })}
            className="w-full max-h-72 object-contain bg-black/40 rounded-lg cursor-pointer transition-transform group-hover:scale-[1.01]"
          />
          <button
            onClick={() => setActiveImg({ src, alt })}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Expand image"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {alt && <p className="text-[11px] text-center mt-1 py-1" style={{ color: C.sub }}>{alt}</p>}
        </div>
      )
      return
    }

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

  return (
    <>
      {elements}
      {activeImg && (
        <ImageModal
          src={activeImg.src}
          alt={activeImg.alt}
          onClose={() => setActiveImg(null)}
          C={C}
        />
      )}
    </>
  )
}

function KeyValue({ label, value, C }: { label: string; value: React.ReactNode; C: ColorTokens }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-xs shrink-0" style={{ color: C.sub }}>{label}</span>
      <span className="text-xs font-semibold text-right" style={{ color: C.text }}>{value}</span>
    </div>
  )
}

// ─── Extracted Diagrams & Schematics Grid Component ───────────────────────────
function ImagesGridSection({
  images,
  onImageClick,
  C,
}: {
  images: { name: string; url: string; source?: string; page?: string }[]
  onImageClick: (img: { src: string; alt: string }) => void
  C: ColorTokens
}) {
  if (!images || images.length === 0) return null

  return (
    <div
      className="rounded-xl p-3.5 my-1"
      style={{
        background: "rgba(6,182,212,0.04)",
        border: `1px solid ${C.border}`,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" style={{ color: C.accent }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.accent }}>
            Extracted Manual Schematics & Diagrams ({images.length})
          </span>
        </div>
        <span className="text-[10px]" style={{ color: C.sub }}>
          Click to zoom & inspect
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => onImageClick({ src: img.url, alt: img.name })}
            className="group relative rounded-lg overflow-hidden cursor-pointer border border-cyan-500/20 bg-black/40 hover:border-cyan-400/60 transition-all hover:scale-[1.02] shadow-md"
          >
            <div className="h-28 w-full overflow-hidden flex items-center justify-center bg-black/30">
              <img
                src={img.url}
                alt={img.name}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  (e.currentTarget.parentElement?.parentElement as HTMLElement).style.display = "none"
                }}
              />
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="p-1.5 rounded-full bg-cyan-500/80 text-black shadow-lg">
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>
            <div className="p-1.5 bg-black/75 flex items-center justify-between gap-1 text-[10px]">
              <span className="truncate text-cyan-300 font-mono">{img.name}</span>
              {img.page && (
                <span className="shrink-0 px-1 py-0.2 rounded text-[9px] bg-white/10 text-slate-300">
                  p.{img.page}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Multi-agent report view ──────────────────────────────────────────────────
function MultiAgentReportView({ report, C }: { report: MultiAgentReportType; C: ColorTokens }) {
  const { fault_diagnosis, safety_compliance, predictive_maintenance, parts_recommendation, digital_twin, manual_key } = report
  const [activeImg, setActiveImg] = useState<{ src: string; alt: string } | null>(null)

  const safetyTone =
    safety_compliance.safety_status === "Approved"
      ? "ok"
      : safety_compliance.safety_status.toLowerCase().includes("precaution")
      ? "warning"
      : "critical"

  const healthColor = levelColor(predictive_maintenance.health_score_percent, false, C)
  const failureColor = levelColor(predictive_maintenance.failure_probability_percent, true, C)

  // Collect all images from context matches
  const matches = parseContextMatches(report.context || "")
  const allImages: { name: string; url: string; source?: string; page?: string }[] = []
  matches.forEach((m) => {
    if (m.images && m.images.length > 0) {
      m.images.forEach((img) => {
        allImages.push({
          name: img.name,
          url: img.url,
          source: m.source,
          page: m.page,
        })
      })
    }
  })

  // Fallback schematics if context had no image tags
  if (allImages.length === 0 && (manual_key || report.fault_diagnosis)) {
    allImages.push(
      { name: "CFM56 Engine Lubrication & Bearing Layout", url: "http://localhost:8000/images/MANUAL-MOTOR-CFM56/page_104_Im1.jpg", page: "104" },
      { name: "CFM56 Compressor & Turbine Section", url: "http://localhost:8000/images/MANUAL-MOTOR-CFM56/page_11_Im1.jpg", page: "11" },
      { name: "CFM56 Oil Scavenge & Pressure System", url: "http://localhost:8000/images/MANUAL-MOTOR-CFM56/page_106_Im1.jpg", page: "106" },
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ─── 1. OUTPUT: Diagnostic Cards ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: `${C.accent}15`, color: C.accent }}>
          {manual_key}
        </span>
        <StatusBadge label={digital_twin.overall_status} tone={safetyTone} C={C} />
      </div>

      <Section icon={AlertTriangle} title="Fault Diagnosis" defaultOpen={true} C={C}>
        <KeyValue label="Probable fault" value={fault_diagnosis.probable_fault} C={C} />
        <KeyValue label="Component" value={fault_diagnosis.affected_component} C={C} />
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: C.sub }}>Confidence</span>
            <span style={{ color: C.accent }}>{fault_diagnosis.confidence_percent}%</span>
          </div>
          <Bar pct={fault_diagnosis.confidence_percent} color={C.accent} C={C} />
        </div>
        <p className="text-xs leading-relaxed pt-1" style={{ color: C.sub }}>{fault_diagnosis.root_cause}</p>
      </Section>

      <Section
        icon={safetyTone === "ok" ? ShieldCheck : ShieldAlert}
        title="Safety & Compliance"
        badge={<StatusBadge label={safety_compliance.safety_status} tone={safetyTone} C={C} />}
        C={C}
      >
        {safety_compliance.warnings?.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.warning }}>
              Warnings
            </span>
            <ul className="list-disc ml-4 text-xs flex flex-col gap-0.5" style={{ color: C.sub }}>
              {safety_compliance.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
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
        <p className="text-sm leading-relaxed pt-1" style={{ color: C.sub }}>
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

        <p className="text-xs leading-relaxed pt-2" style={{ color: C.sub }}>
          {digital_twin.twin_summary}
        </p>
      </Section>

      {/* ─── 2. IMAGES: Schematics & Diagrams Grid (Directly after diagnostic cards!) ──── */}
      {allImages.length > 0 && (
        <ImagesGridSection
          images={allImages}
          onImageClick={(img) => setActiveImg(img)}
          C={C}
        />
      )}

      {/* ─── 3. REFERENCES: Retrieved Sources Accordion ─────────────────────── */}
      {matches.length > 0 && (
        <Section icon={FileText} title={`Retrieved Sources (${matches.length})`} C={C}>
          <div className="flex flex-col gap-2.5">
            {matches.map((m) => (
              <div
                key={m.id}
                className="rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.cardBorder}` }}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-semibold" style={{ color: C.accent }}>
                    {m.source}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5" style={{ color: C.sub }}>
                      Page {m.page}
                    </span>
                    {m.distance !== null && (
                      <span className="text-[10px] font-mono" style={{ color: C.sub }}>
                        dist {m.distance.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: C.sub }}>
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {activeImg && (
        <ImageModal
          src={activeImg.src}
          alt={activeImg.alt}
          onClose={() => setActiveImg(null)}
          C={C}
        />
      )}
    </div>
  )
}

// ─── Simple RAG view with Order: Output -> Images -> References ───────────────
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
  const [activeImg, setActiveImg] = useState<{ src: string; alt: string } | null>(null)

  // Collect all images from all chunks into a unified images gallery
  const allImages: { name: string; url: string; source?: string; page?: string }[] = []
  matches.forEach((m) => {
    if (m.images && m.images.length > 0) {
      m.images.forEach((img) => {
        allImages.push({
          name: img.name,
          url: img.url,
          source: m.source,
          page: m.page,
        })
      })
    }
  })

  // Ensure relevant schematics from image_holder are available if context had no explicit image tags
  if (allImages.length === 0 && manual_key) {
    allImages.push(
      { name: "CFM56 Engine Lubrication & Bearing Layout", url: "http://localhost:8000/images/MANUAL-MOTOR-CFM56/page_104_Im1.jpg", page: "104" },
      { name: "CFM56 Compressor & Turbine Section", url: "http://localhost:8000/images/MANUAL-MOTOR-CFM56/page_11_Im1.jpg", page: "11" },
      { name: "CFM56 Oil Scavenge & Pressure System", url: "http://localhost:8000/images/MANUAL-MOTOR-CFM56/page_106_Im1.jpg", page: "106" },
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <span className="text-[10px] font-mono px-2 py-0.5 rounded w-fit" style={{ background: `${C.accent}15`, color: C.accent }}>
        {manual_key}
      </span>

      {/* ─── 1. OUTPUT: Primary AI Answer ──────────────────────────────────── */}
      <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.cardBorder}` }}>
        <div className="text-sm leading-relaxed" style={{ color: C.text }}>
          <MarkdownRenderer content={answer} C={C} />
        </div>
      </div>

      {/* ─── 2. IMAGES: Schematics & Diagrams Grid (Directly after output!) ──── */}
      {allImages.length > 0 && (
        <ImagesGridSection
          images={allImages}
          onImageClick={(img) => setActiveImg(img)}
          C={C}
        />
      )}

      {/* ─── 3. REFERENCES: Retrieved Sources Accordion ─────────────────────── */}
      {matches.length > 0 && (
        <Section icon={FileText} title={`Retrieved Sources (${matches.length})`} C={C}>
          <div className="flex flex-col gap-2.5">
            {matches.map((m) => (
              <div
                key={m.id}
                className="rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.cardBorder}` }}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-semibold" style={{ color: C.accent }}>
                    {m.source}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5" style={{ color: C.sub }}>
                      Page {m.page}
                    </span>
                    {m.distance !== null && (
                      <span className="text-[10px] font-mono" style={{ color: C.sub }}>
                        dist {m.distance.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: C.sub }}>
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {activeImg && (
        <ImageModal
          src={activeImg.src}
          alt={activeImg.alt}
          onClose={() => setActiveImg(null)}
          C={C}
        />
      )}
    </div>
  )
}

// ─── Root export ────────────────────────────────────────────────────────────────
export default function ReportDisplay({ data, C }: { data: AskApiResponse; C: ColorTokens }) {
  if (data.mode === "multi_agent") {
    return <MultiAgentReportView report={data.report} C={C} />
  }
  if (data.mode === "direct_memory_answer") {
    return (
      <div className="rounded-xl p-3.5">
        <p className="text-sm leading-relaxed" style={{ color: C.text }}>
          <MarkdownRenderer content={data.answer} C={C} />
        </p>
      </div>
    )
  }
  return <SimpleRagView manual_key={data.manual_key} answer={data.answer} context={data.context} C={C} />
}

export { askInstructorAgent }