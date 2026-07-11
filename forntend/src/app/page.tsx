"use client"
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, createContext, useContext } from "react"
import {
  Plus,
  MessageSquare,
  LayoutDashboard,
  ArrowUp,
  Search,
  LayoutGrid,
  Settings,
  ChevronUp,
  Plane,
  Cpu,
  Thermometer,
  Gauge,
  Droplets,
  Activity,
  Wind,
  Zap,
  Clock,
  Radio,
  Bot,
  PanelLeftOpen,
  PanelLeftClose,
  Circle,
  User,
  Sun,
  Moon
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton";

// ─── Color tokens ─────────────────────────────────────────────────────────────
// Dark mode keeps the original palette exactly as it was.
const DARK: ColorTokens = {
  bg: "#0B1120",
  card: "#111827",
  accent: "#06B6D4",
  button: "#2563EB",
  success: "#22C55E",
  warning: "#F59E0B",
  critical: "#EF4444",
  text: "#FFFFFF",
  sub: "#94A3B8",
  border: "rgba(6,182,212,0.15)",
  cardBorder: "rgba(255,255,255,0.06)",
}

// Light mode: white background, and body text becomes the color that used
// to be the dark-mode background (#0B1120). Everything else (accent, button,
// status colors) is left the same so live-data coloring stays consistent;
// card/sub/border are lightened just enough to stay readable on white.
const LIGHT: ColorTokens = {
  bg: "#FFFFFF",
  card: "#F8FAFC",
  accent: "#06B6D4",
  button: "#2563EB",
  success: "#22C55E",
  warning: "#F59E0B",
  critical: "#EF4444",
  text: "#0B1120",
  sub: "#475569",
  border: "rgba(6,182,212,0.25)",
  cardBorder: "rgba(11,17,32,0.08)",
}

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

type ThemeMode = "light" | "dark"

const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void; C: ColorTokens }>({
  mode: "dark",
  toggle: () => {},
  C: DARK,
})

function useTheme() {
  return useContext(ThemeContext)
}

// ─── Sensor simulation ────────────────────────────────────────────────────────
type SensorData = {
  engine_id: string
  egt: number
  oil_temperature: number
  oil_pressure: number
  fuel_flow: number
  n1_rpm: number
  n2_rpm: number
  vibration: number
  compressor_pressure: number
  engine_hours: number
}

// Two wing-mounted engines, each with its own live feed.
const BASE_ENGINES: Record<string, SensorData> = {
  "ENG-1": {
    engine_id: "ENG-1",
    egt: 792,
    oil_temperature: 93,
    oil_pressure: 56,
    fuel_flow: 1380,
    n1_rpm: 90,
    n2_rpm: 95,
    vibration: 1.1,
    compressor_pressure: 178,
    engine_hours: 3400,
  },
  "ENG-2": {
    engine_id: "ENG-2",
    egt: 780,
    oil_temperature: 95,
    oil_pressure: 58,
    fuel_flow: 1400,
    n1_rpm: 91,
    n2_rpm: 96,
    vibration: 1.2,
    compressor_pressure: 180,
    engine_hours: 3400,
  },
}

function jitter(val: number, pct: number, decimals = 0) {
  const delta = val * (pct / 100) * (Math.random() * 2 - 1)
  const n = val + delta
  return decimals === 0 ? Math.round(n) : parseFloat(n.toFixed(decimals))
}

function nextSensor(prev: SensorData): SensorData {
  return {
    ...prev,
    egt: jitter(prev.egt, 1.2),
    oil_temperature: jitter(prev.oil_temperature, 0.8),
    oil_pressure: jitter(prev.oil_pressure, 1.5),
    fuel_flow: jitter(prev.fuel_flow, 1.0),
    n1_rpm: jitter(prev.n1_rpm, 0.5),
    n2_rpm: jitter(prev.n2_rpm, 0.4),
    vibration: jitter(prev.vibration, 5, 2),
    compressor_pressure: jitter(prev.compressor_pressure, 0.8),
    engine_hours: prev.engine_hours,
  }
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function egtStatus(v: number) {
  if (v > 900) return "critical"
  if (v > 820) return "warning"
  return "ok"
}
function vibStatus(v: number) {
  if (v > 3.0) return "critical"
  if (v > 2.0) return "warning"
  return "ok"
}
function oilPStatus(v: number) {
  if (v < 40) return "critical"
  if (v < 50) return "warning"
  return "ok"
}

type Status = "ok" | "warning" | "critical"

function worstStatus(data: SensorData): Status {
  const statuses = [egtStatus(data.egt), vibStatus(data.vibration), oilPStatus(data.oil_pressure)]
  if (statuses.includes("critical")) return "critical"
  if (statuses.includes("warning")) return "warning"
  return "ok"
}

function statusColor(status: Status, C: ColorTokens) {
  return status === "critical" ? C.critical : status === "warning" ? C.warning : C.success
}

function StatusDot({ status }: { status: Status }) {
  const { C } = useTheme()
  const color = statusColor(status, C)
  return (
    <span
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
    />
  )
}

function SensorRow({
  icon: Icon,
  label,
  value,
  unit,
  status = "ok",
  prev,
}: {
  icon: React.ElementType
  label: string
  value: number
  unit: string
  status?: Status
  prev: number
}) {
  const { C } = useTheme()
  const up = value > prev
  const changed = Math.abs(value - prev) > 0.001
  const color = status === "critical" ? C.critical : status === "warning" ? C.warning : C.accent
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors"
      style={{ background: "rgba(6,182,212,0.03)" }}
    >
      <Icon className="h-3 w-3 shrink-0" style={{ color }} />
      <span className="flex-1 text-xs" style={{ color: C.sub }}>
        {label}
      </span>
      <StatusDot status={status} />
      <span
        className="text-xs font-mono font-semibold tabular-nums"
        style={{ color, minWidth: "3rem", textAlign: "right" }}
      >
        {typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : value}
        <span className="font-normal ml-0.5" style={{ color: C.sub }}>
          {unit}
        </span>
      </span>
      {changed && (
        <span className="text-[9px] font-bold" style={{ color: up ? C.success : C.warning }}>
          {up ? "▲" : "▼"}
        </span>
      )}
    </div>
  )
}

// ─── Minimal Markdown renderer (headers, bold/italic/code, lists, code blocks) ─
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

function MarkdownRenderer({ content }: { content: string }) {
  const { C } = useTheme()
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

// ─── Engine hotspot overlay on the top‑down aircraft diagram ──────────────────
const ENGINE_POSITIONS: Record<string, { top: string; left: string; label: string }> = {
  "ENG-1": { top: "70%", left: "40%", label: "Left engine (ENG-1)" },
  "ENG-2": { top: "70%", left: "60%", label: "Right engine (ENG-2)" },
}

function EngineHotspot({
  engineId,
  data,
  selected,
  onSelect,
}: {
  engineId: string
  data: SensorData
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { C } = useTheme()
  const [hovered, setHovered] = useState(false)
  const pos = ENGINE_POSITIONS[engineId]
  const status = worstStatus(data)
  const color = statusColor(status, C)

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        onClick={() => onSelect(engineId)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="relative flex items-center justify-center rounded-full transition-transform"
        style={{
          height: selected ? "18px" : "14px",
          width: selected ? "18px" : "14px",
          background: color,
          boxShadow: `0 0 0 4px ${color}22, 0 0 10px ${color}`,
          border: `2px solid ${selected ? C.text : "rgba(255,255,255,0.4)"}`,
        }}
        aria-label={pos.label}
      >
        <span
          className="absolute inline-flex h-full w-full rounded-full animate-ping"
          style={{ background: color, opacity: status === "ok" ? 0.35 : 0.6 }}
        />
      </button>

      {hovered && (
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 rounded-lg p-2.5 pointer-events-none"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <StatusDot status={status} />
            <span className="text-[11px] font-semibold" style={{ color: C.text }}>
              {pos.label}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.sub }}>EGT</span>
              <span style={{ color: statusColor(egtStatus(data.egt), C) }}>{data.egt}°C</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.sub }}>Oil Pres</span>
              <span style={{ color: statusColor(oilPStatus(data.oil_pressure), C) }}>
                {data.oil_pressure} PSI
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.sub }}>Vibration</span>
              <span style={{ color: statusColor(vibStatus(data.vibration), C) }}>
                {data.vibration.toFixed(2)} mm/s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AircraftDiagram({
  sensors,
  selectedEngine,
  onSelect,
}: {
  sensors: Record<string, SensorData>
  selectedEngine: string
  onSelect: (id: string) => void
}) {
  const { C } = useTheme()
  return (
    <div className="px-3 pb-2">
      <div
        className="relative w-full rounded-lg overflow-hidden"
        style={{ background: "#0d1526", border: `1px solid ${C.cardBorder}`, aspectRatio: "1 / 1.05" }}
      >
        <img
          className="h-full w-full object-contain opacity-90"
          src="/images/jet.jpg"
          alt="Aircraft top-down diagram"
        />
        {Object.keys(sensors).map((id) => (
          <EngineHotspot
            key={id}
            engineId={id}
            data={sensors[id]}
            selected={selectedEngine === id}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-center" style={{ color: C.sub }}>
        Tap or hover a marker for that engine's readings
      </p>
    </div>
  )
}

// ─── Drawer component ────────────────────────────────────────────────────────
function SensorDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { C } = useTheme()
  const [sensors, setSensors] = useState<Record<string, SensorData>>(BASE_ENGINES)
  const [prevSensors, setPrevSensors] = useState<Record<string, SensorData>>(BASE_ENGINES)
  const [selectedEngine, setSelectedEngine] = useState<string>("ENG-1")

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setSensors((current) => {
        setPrevSensors(current)
        const updated: Record<string, SensorData> = {}
        for (const engineId of Object.keys(current)) {
          updated[engineId] = nextSensor(current[engineId])
        }
        return updated
      })
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  const data = sensors[selectedEngine]
  const prev = prevSensors[selectedEngine]

  const egt_s = egtStatus(data.egt)
  const vib_s = vibStatus(data.vibration)
  const oil_s = oilPStatus(data.oil_pressure)

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 overflow-y-auto ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ width: "280px", background: C.card, borderLeft: `1px solid ${C.border}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ borderBottom: `1px solid ${C.cardBorder}`, background: C.card }}
      >
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4" style={{ color: C.accent }} />
          <p className="text-sm font-medium capitalize" style={{ color: C.text }}>
            Aircraft sensor data
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/5 transition-colors"
          style={{ color: C.sub }}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <AircraftDiagram sensors={sensors} selectedEngine={selectedEngine} onSelect={setSelectedEngine} />

      <div className="px-2 flex gap-1 mb-1">
        {Object.keys(sensors).map((id) => (
          <button
            key={id}
            onClick={() => setSelectedEngine(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all"
            style={
              selectedEngine === id
                ? { background: `${C.accent}18`, color: C.accent, border: `1px solid ${C.accent}35` }
                : { color: C.sub, border: "1px solid transparent" }
            }
          >
            <StatusDot status={worstStatus(sensors[id])} />
            {id}
          </button>
        ))}
      </div>

      <div className="p-2 flex flex-col gap-1">
        <SensorRow icon={Thermometer} label="EGT" value={data.egt} unit="°C" status={egt_s} prev={prev.egt} />
        <SensorRow
          icon={Thermometer}
          label="Oil Tmp"
          value={data.oil_temperature}
          unit="°C"
          prev={prev.oil_temperature}
        />
        <SensorRow
          icon={Gauge}
          label="Oil Pres"
          value={data.oil_pressure}
          unit="PSI"
          status={oil_s}
          prev={prev.oil_pressure}
        />
        <SensorRow icon={Zap} label="Vib" value={data.vibration} unit="mm/s" status={vib_s} prev={prev.vibration} />
        <SensorRow icon={Clock} label="Hours" value={data.engine_hours} unit="hr" prev={prev.engine_hours} />
      </div>

      <div className="px-4 py-2" style={{ borderTop: `1px solid ${C.cardBorder}` }}>
        <span className="text-xs" style={{ color: C.sub }}>
          Live • {new Date().toLocaleTimeString([], { hour12: false })}
        </span>
      </div>
    </div>
  )
}

// ─── Recent Chats ─────────────────────────────────────────────────────────────
const recentChats = [
  { label: "Engine start procedure ENG-3" },
  { label: "Pre‑flight checklist" },
  { label: "Turbine blade inspection" },
  { label: "Fuel system anomaly" },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function AppSidebar() {
  const { state } = useSidebar()
  const { C } = useTheme()
  const collapsed = state === "collapsed"

  return (
    <Sidebar
      className="border-r-0"
      style={
        {
          "--sidebar-width": "240px",
          "--sidebar": C.card,
          "--sidebar-foreground": C.text,
          "--sidebar-accent": "rgba(6,182,212,0.08)",
          "--sidebar-accent-foreground": C.text,
          "--sidebar-border": "rgba(255,255,255,0.04)",
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="px-3 pt-4 pb-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
        <div className="flex items-center justify-between mb-3">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ background: `${C.accent}20`, border: `1px solid ${C.accent}30` }}
              >
                <Plane className="h-3.5 w-3.5" style={{ color: C.accent }} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight" style={{ color: C.text }}>
                  AeroIntel AI
                </p>
                <p className="text-[10px] leading-tight" style={{ color: C.sub }}>
                  Instructor Agent
                </p>
              </div>
            </div>
          )}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all"
              style={{
                background: `${C.button}22`,
                color: C.text,
                border: `1px solid ${C.button}40`,
              }}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: C.accent }} />
              {!collapsed && <span>New Session</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 overflow-y-auto">
        <SidebarGroup className="py-1">
          <div className="px-3 pb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${C.sub}80` }}>
              Navigation
            </p>
          </div>
          <SidebarMenu className="gap-0.5">
            {[
              { label: "Conversations", icon: MessageSquare, active: true },
              { label: "Dashboard", icon: LayoutDashboard, active: false },
              { label: "Settings", icon: Settings, active: false },
            ].map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={item.active}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all"
                  style={
                    item.active
                      ? { background: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}25` }
                      : { color: C.sub }
                  }
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup className="py-1 mt-2">
            <div className="px-3 pb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${C.sub}80` }}>
                Recent Sessions
              </p>
            </div>
            <SidebarMenu className="gap-0.5">
              {recentChats.map((chat) => (
                <SidebarMenuItem key={chat.label}>
                  <SidebarMenuButton className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: C.sub }}>
                    <Circle className="h-1.5 w-1.5 shrink-0 fill-current" style={{ color: `${C.sub}60` }} />
                    <span className="truncate">{chat.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="px-3 py-3" style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${C.accent}20`, border: `1px solid ${C.accent}30` }}
          >
            <Bot className="h-4 w-4" style={{ color: C.accent }} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate" style={{ color: C.text }}>
                Instructor Agent
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: C.success, boxShadow: `0 0 4px ${C.success}` }}
                />
                <span className="text-[10px]" style={{ color: C.sub }}>
                  Online • getnitro-rag
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button className="ml-auto p-1 rounded" style={{ color: C.sub }}>
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

// ─── Chat message types ────────────────────────────────────────────────────────
type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  status?: "loading" | "done" | "error"
}

// ─── Theme toggle button ───────────────────────────────────────────────────────
function ThemeToggle() {
  const { mode, toggle, C } = useTheme()
  const isDark = mode === "dark"
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
      style={{
        background: `${C.accent}12`,
        color: C.accent,
        border: `1px solid ${C.accent}25`,
      }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      {isDark ? "Dark" : "Light"}
    </button>
  )
}

// ─── Main chat area ────────────────────────────────────────────────────────────
function ChatMain() {
  const { C } = useTheme()
  const [input, setInput] = useState("")
  const [agentsOn, setAgentsOn] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleAsk = async () => {
    const question = input.trim()
    if (!question || loading) return

    const userMsgId = `u-${Date.now()}`
    const assistantMsgId = `a-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: question },
      { id: assistantMsgId, role: "assistant", content: "", status: "loading" },
    ])
    setIsExpanded(true)
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemma3:1b", // or gemma3:4b, phi4:latest, llama3.1:8b
          messages: [
            {
              role: "system",
              content:
                "You are an aircraft maintenance instructor agent. Always answer in Markdown. Use headings, bullet lists, tables when appropriate, and keep answers concise.",
            },
            {
              role: "user",
              content: question,
            },
          ],
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: data.message.content || "No response was returned.", status: "done" }
            : m
        )
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: "Couldn't reach the instructor agent. Please try again.", status: "error" }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  // ─── Reusable input box (used both centered and docked at bottom) ───────────
  const renderInputBox = () => (
    <div
      className="relative rounded-2xl"
      style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: `0 0 0 1px rgba(6,182,212,0.06), 0 16px 48px rgba(0,0,0,0.5)` }}
    >
      <div className="relative px-4 pt-4 pb-2">
        <textarea
          id="aircraft-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask about engine parameters..."
          className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed min-h-[52px] max-h-48"
          style={{ color: C.text, caretColor: C.accent }}
          autoFocus
        />
        <div className="absolute top-4 right-4 h-2 w-2 rounded-full" style={{ background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
      </div>

      <div className="flex items-center justify-between px-3 pb-3 pt-1" style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
        <button id="attach-btn" className="h-8 w-8 flex items-center justify-center rounded-lg" style={{ color: C.sub }} title="Attach">
          <Plus className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold"
            style={{ background: `${C.accent}12`, color: C.accent, border: `1px solid ${C.accent}25` }}
          >
            <Cpu className="h-3 w-3" />
            getnitro-rag
          </div>

          <button
            id="agents-toggle"
            onClick={() => setAgentsOn((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: agentsOn ? `${C.button}30` : "rgba(255,255,255,0.05)",
              color: agentsOn ? C.text : C.sub,
              border: `1px solid ${agentsOn ? C.button + "50" : "rgba(255,255,255,0.08)"}`,
            }}
            title="Toggle agents"
          >
            <Bot className="h-3.5 w-3.5" />
            Agents
            <span
              className="inline-flex items-center ml-1 h-4 w-7 rounded-full relative transition-all"
              style={{ background: agentsOn ? C.button : "rgba(255,255,255,0.12)" }}
            >
              <span
                className="absolute h-3 w-3 rounded-full bg-white transition-all"
                style={{ left: agentsOn ? "calc(100% - 14px)" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
              />
            </span>
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)", color: C.sub }}
            title="Show telemetry"
          >
            <Cpu className="h-3.5 w-3.5" />
          </button>

          <button
            id="send-btn"
            onClick={handleAsk}
            disabled={loading || !input.trim()}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed"
            style={{
              background: input.trim() ? C.button : `${C.button}80`,
              color: C.text,
              boxShadow: input.trim() ? `0 0 16px ${C.button}60` : "none",
            }}
            title="Send"
          >
            {loading ? (
              <span
                className="h-3.5 w-3.5 rounded-full animate-spin"
                style={{ border: `2px solid ${C.text}40`, borderTopColor: C.text }}
              />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden" style={{ background: C.bg }}>
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${C.accent}08 0%, transparent 70%)` }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center px-5 py-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
        <SidebarTrigger className="h-7 w-7 rounded-lg" style={{ color: C.sub }} />
        <div className="flex items-center gap-2 ml-3">
          <Plane className="h-3.5 w-3.5" style={{ color: C.accent }} />
          <span className="text-xs font-semibold" style={{ color: C.sub }}>
          AeroIntel AI
          </span>
          <span style={{ color: `${C.sub}40` }}>/</span>
          <span className="text-xs font-semibold" style={{ color: C.text }}>
            Active Session
          </span>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Body: either the centered hero+input (pre-chat) or the message list + docked input (post-chat) */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            // ── Pre-chat hero state ──────────────────────────────────────────
            <motion.div
              key="hero"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.35, ease: "easeInOut" } }}
              className="flex-1 flex flex-col items-center justify-center px-6 pb-10"
            >
              <div className="w-full max-w-2xl">
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${C.accent}18`,
                        border: `1px solid ${C.accent}30`,
                        boxShadow: `0 0 20px ${C.accent}20`,
                      }}
                    >
                      <Plane className="h-5 w-5" style={{ color: C.accent }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.accent }}>
                        Aircraft Instructor Agent
                      </p>
                    </div>
                  </div>
                  <h1 className="text-4xl font-bold leading-tight tracking-tight mb-2" style={{ color: C.text }}>
                    Welcome to AeroIntel AI
                  </h1>
                  <p className="text-sm leading-relaxed" style={{ color: C.sub }}>
                   AeroIntel AI is an offline, multi-agent maintenance assistant for aircraft engineers — it diagnoses engine faults, analyzes live sensor telemetry, and predicts component failures. Powered by AI agents and RAG, it retrieves maintenance procedures and generates explainable, safety-focused reports, all without needing an internet connection.


                  </p>
                </div>

                {renderInputBox()}

                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    "EGT limits for cruise",
                    "Oil pressure normal range",
                    "Vibration threshold alert",
                    "Engine hours maintenance",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-xs px-3 py-1.5 rounded-full transition-all"
                      style={{ background: "rgba(6,182,212,0.08)", color: C.sub, border: `1px solid rgba(6,182,212,0.15)` }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            // ── Chat state: scrollable message list ──────────────────────────
            <motion.div
              key="messages"
              ref={scrollRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.35, delay: 0.1 } }}
              className="flex-1 overflow-y-auto px-6 py-6"
            >
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "user" ? (
                      <div
                        className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed"
                        style={{ background: C.button, color: C.text }}
                      >
                        {m.content}
                      </div>
                    ) : (
                      <div
                        className="max-w-fu rounded-2xl  px-4 py-3"
                        style={{}}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-3.5 w-3.5" style={{ color: C.accent }} />
                          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.accent }}>
                            Instructor Agent
                          </span>
                        </div>

                        {m.status === "loading" && (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3.5 w-3.5 rounded-full animate-spin"
                              style={{ border: `2px solid ${C.accent}30`, borderTopColor: C.accent }}
                            />
                            <span className="text-sm" style={{ color: C.sub }}>
                            <Skeleton className="h-[40px] w-[600px] rounded-full" />
                            <Skeleton className="h-[20px] w-[400px] mt-3 rounded-full" />
                             <Skeleton className="h-[20px] w-[400px] mt-3 rounded-full" />
                            </span>
                          </div>
                        )}

                        {m.status === "error" && (
                          <p className="text-sm" style={{ color: C.critical }}>
                            {m.content}
                          </p>
                        )}

                        {m.status === "done" && <MarkdownRenderer content={m.content} />}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Docked input bar, shown once the conversation has started */}
        {isExpanded && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" } }}
            className="px-6 pb-6 pt-2"
          >
            <div className="w-full max-w-2xl mx-auto">{renderInputBox()}</div>
          </motion.div>
        )}
      </div>

      {/* Sensor drawer */}
      <SensorDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [mode, setMode] = useState<ThemeMode>("dark")
  const C = mode === "dark" ? DARK : LIGHT
  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider value={{ mode, toggle, C }}>
      <div className="flex h-screen w-screen overflow-hidden" style={{ background: C.bg }}>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <ChatMain />
        </SidebarProvider>
      </div>
    </ThemeContext.Provider>
  )
}