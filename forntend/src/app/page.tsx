"use client"
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react"

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
  Moon,
  Trash2,
  Sparkles,
  Layers,
  ChevronRight,
  BookOpen,
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
import ReportDisplay, { MarkdownRenderer } from "@/components/shared/ReportDisplay"
import DashboardView from "@/components/shared/DashboardView"
import SettingsView from "@/components/shared/SettingsView"
import ManualsDrawer from "@/components/shared/ManualsDrawer"
import AgentPipelineTracker from "@/components/shared/AgentPipelineTracker"
import {
  askInstructorAgent,
  getQaHistory,
  getSessions,
  deleteSession,
  historyEntryToReport,
  type AskApiResponse,
  type SessionItem,
} from "@/lib/instructorApi"

// ─── Color tokens ─────────────────────────────────────────────────────────────
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

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  status?: "loading" | "done" | "error"
  report?: AskApiResponse
}

type ThemeMode = "light" | "dark"
type ViewTab = "conversations" | "dashboard" | "settings"

const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void; C: ColorTokens }>({
  mode: "dark",
  toggle: () => {},
  C: DARK,
})

function useTheme() {
  return useContext(ThemeContext)
}

// ─── Chat Session Context ──────────────────────────────────────────────────────
type ChatContextType = {
  activeTab: ViewTab
  setActiveTab: (tab: ViewTab) => void
  sessions: SessionItem[]
  activeSessionId: string
  isDraftSession: boolean
  messages: ChatMessage[]
  loading: boolean
  isExpanded: boolean
  agentsOn: boolean
  setAgentsOn: React.Dispatch<React.SetStateAction<boolean>>
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  handleAsk: (overrideQuestion?: string) => Promise<void>
  handleNewSession: () => void
  handleSelectSession: (sessionId: string) => Promise<void>
  handleDeleteSession: (e: React.MouseEvent, sessionId: string) => Promise<void>
  refreshSessions: () => Promise<void>
  openManuals: boolean
  setOpenManuals: (open: boolean) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
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

// ─── Engine hotspot overlay ───────────────────────────────────────────────────
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

// ─── Sidebar Component ────────────────────────────────────────────────────────
function AppSidebar() {
  const { state } = useSidebar()
  const { C } = useTheme()
  const {
    activeTab,
    setActiveTab,
    sessions,
    activeSessionId,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    setOpenManuals,
  } = useChat()
  const collapsed = state === "collapsed"

  return (
    <Sidebar
      className="border-r-0"
      style={
        {
          "--sidebar-width": "260px",
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

        {/* Action Buttons in Header */}
        <div className="flex flex-col gap-1.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleNewSession}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `${C.button}22`,
                  color: C.text,
                  border: `1px solid ${C.button}40`,
                }}
                title="Start a new conversation session"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: C.accent }} />
                {!collapsed && <span>New Session</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setOpenManuals(true)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-cyan-500/10"
                style={{
                  background: "rgba(6,182,212,0.08)",
                  color: C.accent,
                  border: `1px solid rgba(6,182,212,0.2)`,
                }}
                title="Manage aircraft manuals & ChromaDB ingestion"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span>+ Add / Ingest Manual</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
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
              {
                id: "conversations",
                label: "Conversations",
                icon: MessageSquare,
                onClick: () => setActiveTab("conversations"),
                active: activeTab === "conversations",
              },
              {
                id: "dashboard",
                label: "Dashboard",
                icon: LayoutDashboard,
                onClick: () => setActiveTab("dashboard"),
                active: activeTab === "dashboard",
              },
              {
                id: "settings",
                label: "Settings",
                icon: Settings,
                onClick: () => setActiveTab("settings"),
                active: activeTab === "settings",
              },
            ].map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={item.active}
                  onClick={item.onClick}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
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
                Recent Sessions {sessions.length > 0 && `(${sessions.length})`}
              </p>
            </div>
            <SidebarMenu className="gap-1">
              {sessions.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-center italic" style={{ color: `${C.sub}70` }}>
                  No saved sessions yet. Send a message to start!
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.session_id === activeSessionId && activeTab === "conversations"
                  return (
                    <SidebarMenuItem key={session.session_id}>
                      <div
                        onClick={() => handleSelectSession(session.session_id)}
                        className="group flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all relative overflow-hidden"
                        style={
                          isActive
                            ? {
                                background: `${C.accent}18`,
                                color: C.text,
                                border: `1px solid ${C.accent}40`,
                              }
                            : {
                                color: C.sub,
                                border: "1px solid transparent",
                              }
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                          <Circle
                            className="h-1.5 w-1.5 shrink-0 fill-current"
                            style={{ color: isActive ? C.accent : `${C.sub}60` }}
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate font-medium" style={{ color: isActive ? C.text : C.sub }}>
                              {session.title || "Aircraft Inquiry"}
                            </span>
                            <span className="text-[9px] truncate" style={{ color: `${C.sub}80` }}>
                              {session.mode === "multi_agent" ? "🤖 Multi-Agent" : "📄 Simple RAG"} • {session.turn_count} turns
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteSession(e, session.session_id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0"
                          title="Delete session"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </SidebarMenuItem>
                  )
                })
              )}
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
                  Online • FastAPI Backend
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setActiveTab("settings")}
              className="ml-auto p-1 rounded hover:bg-white/5 transition-colors"
              style={{ color: C.sub }}
              title="Open Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
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
  const {
    activeTab,
    setActiveTab,
    sessions,
    activeSessionId,
    isDraftSession,
    messages,
    loading,
    isExpanded,
    agentsOn,
    setAgentsOn,
    input,
    setInput,
    handleAsk,
    handleNewSession,
    handleSelectSession,
    setOpenManuals,
  } = useChat()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  // Active session title for breadcrumb
  const currentSession = sessions.find((s) => s.session_id === activeSessionId)
  const sessionTitle = isDraftSession
    ? "New Session"
    : currentSession?.title
    ? currentSession.title.slice(0, 28) + (currentSession.title.length > 28 ? "..." : "")
    : "Active Session"

  // ─── Reusable input box ─────────────────────────────────────────────────────
  const renderInputBox = () => (
    <div
      className="relative rounded-2xl"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: `0 0 0 1px rgba(6,182,212,0.06), 0 16px 48px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="relative px-4 pt-4 pb-2">
        <textarea
          id="aircraft-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={
            agentsOn
              ? "Ask multi-agent instructor (e.g., Engine vibration & low oil pressure)..."
              : "Ask about maintenance manuals (e.g., CFM56 oil filter replacement)..."
          }
          className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed min-h-[52px] max-h-48"
          style={{ color: C.text, caretColor: C.accent }}
          autoFocus
        />
        <div
          className="absolute top-4 right-4 h-2 w-2 rounded-full"
          style={{ background: C.success, boxShadow: `0 0 8px ${C.success}` }}
        />
      </div>

      <div
        className="flex items-center justify-between px-3 pb-3 pt-1"
        style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}
      >
        <div className="flex items-center gap-1.5">
          <button
            id="agents-toggle"
            onClick={() => setAgentsOn((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: agentsOn ? `${C.button}30` : "rgba(255,255,255,0.05)",
              color: agentsOn ? C.text : C.sub,
              border: `1px solid ${agentsOn ? C.button + "50" : "rgba(255,255,255,0.08)"}`,
            }}
            title="Toggle 5-Agent Diagnostic Pipeline"
          >
            <Bot className="h-3.5 w-3.5" />
            5-Agents
            <span
              className="inline-flex items-center ml-1 h-4 w-7 rounded-full relative transition-all"
              style={{ background: agentsOn ? C.button : "rgba(255,255,255,0.12)" }}
            >
              <span
                className="absolute h-3 w-3 rounded-full bg-white transition-all"
                style={{
                  left: agentsOn ? "calc(100% - 14px)" : "2px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </span>
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ background: "rgba(255,255,255,0.05)", color: C.sub }}
            title="Show live telemetry simulation"
          >
            <Cpu className="h-3.5 w-3.5" />
            Telemetry
          </button>
        </div>

        <button
          id="send-btn"
          onClick={() => handleAsk()}
          disabled={loading || !input.trim()}
          className="h-8 w-8 flex items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed"
          style={{
            background: input.trim() ? C.button : `${C.button}80`,
            color: C.text,
            boxShadow: input.trim() ? `0 0 16px ${C.button}60` : "none",
          }}
          title="Send query"
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
  )

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden" style={{ background: C.bg }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${C.accent}08 0%, transparent 70%)`,
        }}
      />

      {/* Header bar */}
      <div
        className="relative z-10 flex items-center px-5 py-3"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}
      >
        <SidebarTrigger className="h-7 w-7 rounded-lg" style={{ color: C.sub }} />
        <div className="flex items-center gap-2 ml-3">
          <Plane className="h-3.5 w-3.5" style={{ color: C.accent }} />
          <span className="text-xs font-semibold" style={{ color: C.sub }}>
            AeroIntel AI
          </span>
          <span style={{ color: `${C.sub}40` }}>/</span>
          <span className="text-xs font-semibold capitalize" style={{ color: C.text }}>
            {activeTab === "dashboard"
              ? "Fleet Dashboard"
              : activeTab === "settings"
              ? "System Settings"
              : sessionTitle}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* View Switcher: Dashboard vs Settings vs Conversations */}
      {activeTab === "dashboard" ? (
        <DashboardView
          sessions={sessions}
          onSelectSession={(sid) => {
            setActiveTab("conversations")
            handleSelectSession(sid)
          }}
          onNewSession={() => {
            setActiveTab("conversations")
            handleNewSession()
          }}
          onOpenManuals={() => setOpenManuals(true)}
          C={C}
        />
      ) : activeTab === "settings" ? (
        <SettingsView C={C} />
      ) : (
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {!isExpanded || messages.length === 0 ? (
              <motion.div
                key="hero"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -16, transition: { duration: 0.35, ease: "easeInOut" } }}
                className="flex-1 flex flex-col items-center justify-center px-6 pb-10 overflow-y-auto"
              >
                <div className="w-full max-w-2xl">
                  <div className="mb-8">
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
                          Aircraft Maintenance & Digital Twin AI
                        </p>
                      </div>
                    </div>
                    <h1 className="text-3xl font-bold leading-tight tracking-tight mb-2" style={{ color: C.text }}>
                      How can I assist with aircraft maintenance today?
                    </h1>
                    <p className="text-sm leading-relaxed" style={{ color: C.sub }}>
                      Diagnose engine anomalies, analyze sensor telemetry trends, verify FAA/OEM safety compliance, and predict component remaining useful life using intelligent RAG and multi-agent systems.
                    </p>
                  </div>

                  {renderInputBox()}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                      "CFM56 engine vibration high with low oil pressure",
                      "How to replace CFM56 oil filter?",
                      "What are the EGT limits during takeoff?",
                      "Borescope inspection procedure for compressor blades",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleAsk(s)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all hover:border-cyan-400/40"
                        style={{
                          background: "rgba(6,182,212,0.08)",
                          color: C.sub,
                          border: `1px solid rgba(6,182,212,0.15)`,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                ref={scrollRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.35, delay: 0.1 } }}
                className="flex-1 overflow-y-auto px-6 py-6"
              >
                <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
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
                          className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm"
                          style={{ background: C.button, color: "#FFFFFF" }}
                        >
                          {m.content}
                        </div>
                      ) : (
                        <div className="max-w-full w-full rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-3.5 w-3.5" style={{ color: C.accent }} />
                            <span
                              className="text-[10px] font-semibold uppercase tracking-widest"
                              style={{ color: C.accent }}
                            >
                              Instructor Agent
                            </span>
                          </div>

                          {m.status === "loading" && (
                            agentsOn ? (
                              <AgentPipelineTracker C={C} />
                            ) : (
                              <div className="flex flex-col gap-2.5 py-2">
                                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                                  Routing query to manual & retrieving vector embeddings...
                                </div>
                                <Skeleton className="h-[36px] w-[90%] rounded-lg" />
                                <Skeleton className="h-[20px] w-[70%] rounded-lg" />
                                <Skeleton className="h-[20px] w-[50%] rounded-lg" />
                              </div>
                            )
                          )}

                          {m.status === "error" && (
                            <p className="text-sm" style={{ color: C.critical }}>
                              {m.content}
                            </p>
                          )}

                          {m.status === "done" &&
                            (m.report ? (
                              <ReportDisplay data={m.report} C={C} />
                            ) : (
                              <MarkdownRenderer content={m.content} C={C} />
                            ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isExpanded && messages.length > 0 && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" } }}
              className="px-6 pb-6 pt-2"
            >
              <div className="w-full max-w-2xl mx-auto">{renderInputBox()}</div>
            </motion.div>
          )}
        </div>
      )}

      <SensorDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}

// ─── Root Provider & Component ────────────────────────────────────────────────
export default function Page() {
  const [mode, setMode] = useState<ThemeMode>("dark")
  const C = mode === "dark" ? DARK : LIGHT
  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"))

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<ViewTab>("conversations")

  // Session & Chat state
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `session-${Date.now()}`)
  const [isDraftSession, setIsDraftSession] = useState<boolean>(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [agentsOn, setAgentsOn] = useState(false)
  const [input, setInput] = useState("")

  // Modal / Drawer states
  const [openManuals, setOpenManuals] = useState(false)

  // Fetch all sessions from backend
  const refreshSessions = useCallback(async () => {
    try {
      const data = await getSessions()
      if (data && Array.isArray(data.sessions)) {
        setSessions(data.sessions)
      }
    } catch (err) {
      console.warn("Could not fetch sessions from backend:", err)
    }
  }, [])

  // Initial load: fetch sessions
  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  // Select a session: load its conversation history
  const handleSelectSession = useCallback(async (sessionId: string) => {
    setActiveTab("conversations")
    setActiveSessionId(sessionId)
    setIsDraftSession(false)
    setLoading(true)
    setIsExpanded(true)

    try {
      const data = await getQaHistory(sessionId)
      if (data.qa_pairs && data.qa_pairs.length > 0) {
        const rehydrated: ChatMessage[] = data.qa_pairs.flatMap((entry) => {
          const userMsg: ChatMessage = {
            id: `hist-u-${entry.id}`,
            role: "user",
            content: entry.query,
          }
          const assistantMsg: ChatMessage = {
            id: `hist-a-${entry.id}`,
            role: "assistant",
            content: entry.answer.summary || "",
            status: "done",
            report: historyEntryToReport(entry),
          }
          return [userMsg, assistantMsg]
        })
        setMessages(rehydrated)
      } else {
        setMessages([])
        setIsExpanded(false)
      }
    } catch (err) {
      console.error("Failed to load session history:", err)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Start a new session (ChatGPT-style: reset view, stage pending new session ID, no DB write yet)
  const handleNewSession = useCallback(() => {
    setActiveTab("conversations")
    const newId = `session-${Date.now()}`
    setActiveSessionId(newId)
    setIsDraftSession(true)
    setMessages([])
    setInput("")
    setIsExpanded(false)
    setLoading(false)
  }, [])

  // Delete a session
  const handleDeleteSession = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation()
      try {
        await deleteSession(sessionId)
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))
        // If the active session was deleted, reset to new session
        if (activeSessionId === sessionId) {
          handleNewSession()
        }
      } catch (err) {
        console.error("Failed to delete session:", err)
      }
    },
    [activeSessionId, handleNewSession]
  )

  // Send a message
  const handleAsk = useCallback(
    async (overrideQuestion?: string) => {
      const question = (overrideQuestion ?? input).trim()
      if (!question || loading) return

      setActiveTab("conversations")
      const userMsgId = `u-${Date.now()}`
      const assistantMsgId = `a-${Date.now()}`
      const targetSessionId = activeSessionId

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: question },
        { id: assistantMsgId, role: "assistant", content: "", status: "loading" },
      ])

      setInput("")
      setIsExpanded(true)
      setLoading(true)

      try {
        const data = await askInstructorAgent({
          query: question,
          session_id: targetSessionId,
          use_agents: agentsOn,
          ...(agentsOn && {
            sensor_data: {
              engine_temp: "normal, 480°C",
              oil_pressure: "58 psi",
              vibration: "1.2 IPS",
              fault_codes: "none reported",
              maintenance_history: "last inspected 40 flight hours ago",
              operating_hours: "6200",
              flight_cycles: "2100",
            },
            aircraft_info: { aircraft_model: "Boeing 737-800", engine_model: "CFM56-7B" },
          }),
        })

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, report: data, status: "done" } : m))
        )

        // If it was a draft session, it is now committed
        setIsDraftSession(false)
        await refreshSessions()
      } catch (err) {
        console.error("Ask query failed:", err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: "Couldn't reach the instructor agent backend.", status: "error" }
              : m
          )
        )
      } finally {
        setLoading(false)
      }
    },
    [input, loading, activeSessionId, agentsOn, refreshSessions]
  )

  const chatValue = {
    activeTab,
    setActiveTab,
    sessions,
    activeSessionId,
    isDraftSession,
    messages,
    loading,
    isExpanded,
    agentsOn,
    setAgentsOn,
    input,
    setInput,
    handleAsk,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    refreshSessions,
    openManuals,
    setOpenManuals,
  }

  return (
    <ThemeContext.Provider value={{ mode, toggle, C }}>
      <ChatContext.Provider value={chatValue}>
        <div className="flex h-screen w-screen overflow-hidden" style={{ background: C.bg }}>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <ChatMain />
          </SidebarProvider>

          {/* Drawers */}
          <ManualsDrawer open={openManuals} onClose={() => setOpenManuals(false)} C={C} />
        </div>
      </ChatContext.Provider>
    </ThemeContext.Provider>
  )
}