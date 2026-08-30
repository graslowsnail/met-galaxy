"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { createPortal } from "react-dom"
import { Clock3, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { TimelineRange, TimelineSummaryResponse } from "@/types/api"

const CURRENT_YEAR = new Date().getFullYear()
const HISTORY_START = -10000
const HISTORY_STOPS = [HISTORY_START, -3000, 500, 1400, 1800, 1900, 1946, CURRENT_YEAR]
const HISTORY_PERIODS = [
  { label: "Prehistory", fromYear: -10000, toYear: -3001 },
  { label: "Ancient", fromYear: -3000, toYear: 500 },
  { label: "Medieval", fromYear: 500, toYear: 1399 },
  { label: "Early modern", fromYear: 1400, toYear: 1799 },
  { label: "19th c.", fromYear: 1800, toYear: 1899 },
  { label: "Modern", fromYear: 1900, toYear: 1945 },
  { label: "Post-war", fromYear: 1946, toYear: CURRENT_YEAR },
]

type DragState = {
  mode: "move" | "left" | "right"
  startX: number
  startLeft: number
  startRight: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const sameRange = (a: TimelineRange | null, b: TimelineRange) => a?.fromYear === b.fromYear && a.toYear === b.toYear
const formatYear = (year: number) => year < 0 ? `${Math.abs(year).toLocaleString()} BCE` : year === 0 ? "BCE/CE" : year >= CURRENT_YEAR ? "Present" : `${year.toLocaleString()} CE`

export function TimelineWidget({ range, onChange, open, onOpenChange, compact = false }: { range: TimelineRange | null; onChange: (range: TimelineRange | null) => void; open: boolean; onOpenChange: (open: boolean) => void; compact?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [draft, setDraft] = useState<TimelineRange>(range ?? { fromYear: HISTORY_START, toYear: CURRENT_YEAR })
  const [summary, setSummary] = useState<TimelineSummaryResponse["data"] | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef(draft)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => setMounted(true), [])

  const minimum = HISTORY_START
  const maximum = CURRENT_YEAR
  const minimumSpan = 1

  useEffect(() => {
    const next = range ?? { fromYear: HISTORY_START, toYear: CURRENT_YEAR }
    setDraft(next)
    draftRef.current = next
  }, [range])

  useEffect(() => {
    const controller = new AbortController()
    void apiClient.getTimelineSummary(range, controller.signal).then((response) => setSummary(response.data)).catch(() => {})
    return () => controller.abort()
  }, [range])

  useEffect(() => {
    if (!open) return
    document.documentElement.dataset.timelineOpen = "true"
    return () => {
      delete document.documentElement.dataset.timelineOpen
    }
  }, [open])

  const yearToPosition = useCallback((year: number) => {
    const value = clamp(year, HISTORY_START, CURRENT_YEAR)
    for (let index = 0; index < HISTORY_STOPS.length - 1; index += 1) {
      const start = HISTORY_STOPS[index]!
      const end = HISTORY_STOPS[index + 1]!
      if (value <= end) {
        const progress = (value - start) / (end - start)
        return (index + progress) / (HISTORY_STOPS.length - 1)
      }
    }
    return 1
  }, [])

  const positionToYear = useCallback((position: number) => {
    const value = clamp(position, 0, 1)
    const scaled = Math.min(0.999999, value) * (HISTORY_STOPS.length - 1)
    const index = Math.floor(scaled)
    const start = HISTORY_STOPS[index]!
    const end = HISTORY_STOPS[index + 1]!
    return Math.round(start + (scaled - index) * (end - start))
  }, [])

  const setDraftRange = useCallback((next: TimelineRange) => {
    setDraft(next)
    draftRef.current = next
  }, [])

  const commit = useCallback((next: TimelineRange) => {
    setDraftRange(next)
    onChange(next)
  }, [onChange, setDraftRange])

  const clearTimeline = () => {
    onChange(null)
    setDraftRange({ fromYear: HISTORY_START, toYear: CURRENT_YEAR })
    onOpenChange(false)
  }

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      const track = trackRef.current
      if (!drag || !track) return
      const rect = track.getBoundingClientRect()
      if (drag.mode === "move") {
        const width = drag.startRight - drag.startLeft
        const left = clamp(drag.startLeft + (event.clientX - drag.startX) / rect.width, 0, 1 - width)
        setDraftRange({ fromYear: positionToYear(left), toYear: positionToYear(left + width) })
        return
      }
      const year = positionToYear((event.clientX - rect.left) / rect.width)
      const current = draftRef.current
      if (drag.mode === "left") {
        setDraftRange({ ...current, fromYear: Math.min(year, current.toYear - minimumSpan) })
      } else {
        setDraftRange({ ...current, toYear: Math.max(year, current.fromYear + minimumSpan) })
      }
    }
    const handlePointerUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      onChange(draftRef.current)
    }
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [minimumSpan, onChange, positionToYear, setDraftRange])

  const startDrag = (mode: DragState["mode"], event: ReactPointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      mode,
      startX: event.clientX,
      startLeft: yearToPosition(draftRef.current.fromYear),
      startRight: yearToPosition(draftRef.current.toYear),
    }
  }

  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = yearToPosition(draft.toYear) - yearToPosition(draft.fromYear)
    const center = clamp((event.clientX - rect.left) / rect.width, width / 2, 1 - width / 2)
    const left = center - width / 2
    const next = { fromYear: positionToYear(left), toYear: positionToYear(left + width) }
    setDraftRange(next)
    dragRef.current = { mode: "move", startX: event.clientX, startLeft: left, startRight: left + width }
  }

  const moveWindow = (delta: number) => {
    const span = draft.toYear - draft.fromYear
    let fromYear = draft.fromYear + delta
    let toYear = draft.toYear + delta
    if (fromYear < minimum) { fromYear = minimum; toYear = minimum + span }
    if (toYear > maximum) { toYear = maximum; fromYear = maximum - span }
    commit({ fromYear, toYear })
  }

  const handleWindowKey = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const step = event.shiftKey ? 100 : 10
    moveWindow(event.key === "ArrowLeft" ? -step : step)
  }

  const handleBoundaryKey = (boundary: "from" | "to", event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    event.stopPropagation()
    const step = event.shiftKey ? 100 : 10
    const delta = event.key === "ArrowLeft" ? -step : step
    if (boundary === "from") {
      commit({ ...draft, fromYear: clamp(draft.fromYear + delta, minimum, draft.toYear - minimumSpan) })
    } else {
      commit({ ...draft, toYear: clamp(draft.toYear + delta, draft.fromYear + minimumSpan, maximum) })
    }
  }

  const selectedCount = useMemo(() => {
    if (sameRange(range, draft)) return summary?.selectedCount
    if (!range && draft.fromYear === HISTORY_START && draft.toYear === CURRENT_YEAR) return summary?.total
    const buckets = summary?.buckets ?? []
    return Math.round(buckets.reduce((total, bucket) => {
      const bucketEnd = Math.min(CURRENT_YEAR, bucket.fromYear + 99)
      const overlap = Math.max(0, Math.min(bucketEnd, draft.toYear) - Math.max(bucket.fromYear, draft.fromYear) + 1)
      return total + bucket.count * overlap / Math.max(1, bucketEnd - bucket.fromYear + 1)
    }, 0))
  }, [draft, range, summary])

  const density = useMemo(() => {
    const buckets = summary?.buckets ?? []
    const values = Array.from({ length: 28 }, (_, index) => {
      const start = index / 28
      const end = (index + 1) / 28
      return buckets.reduce((total, bucket) => {
        const position = yearToPosition(bucket.fromYear)
        return total + (position >= start && (position < end || index === 27 && position <= end) ? bucket.count : 0)
      }, 0)
    })
    const peak = Math.max(1, ...values)
    return values.map((count, index) => ({
      height: 5 + Math.round(30 * Math.sqrt(count / peak)),
      selected: (index + 0.5) / 28 >= yearToPosition(draft.fromYear) && (index + 0.5) / 28 <= yearToPosition(draft.toYear),
    }))
  }, [draft, summary, yearToPosition])

  const brushLeft = yearToPosition(draft.fromYear) * 100
  const brushWidth = Math.max(2.2, (yearToPosition(draft.toYear) - yearToPosition(draft.fromYear)) * 100)
  const allHistorySelected = !range && draft.fromYear === HISTORY_START && draft.toYear === CURRENT_YEAR

  const timelinePanel = <section className="pointer-events-auto fixed bottom-5 left-1/2 z-[1100] w-[min(88vw,640px)] -translate-x-1/2 rounded-[14px] bg-white/95 px-2.5 py-2 shadow-[0_2px_6px_rgba(15,21,36,.08),0_18px_38px_-24px_rgba(15,21,36,.38)] backdrop-blur-[16px]" onPointerDown={(event) => event.stopPropagation()}>
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[13px] font-semibold tracking-[-.01em] text-[#0f1524]">{allHistorySelected ? "Choose an era" : `${formatYear(draft.fromYear)} – ${formatYear(draft.toYear)}`}</h2>
        <p className="mt-0.5 text-[11px] text-[#7c7870]">{selectedCount?.toLocaleString() ?? "…"} artworks · {(draft.toYear - draft.fromYear + 1).toLocaleString()} years</p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1">
        {range && <button type="button" onClick={clearTimeline} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#6f6b62] hover:bg-[#f2f0ea]">Clear</button>}
        <div aria-hidden="true" className="mx-1 h-5 w-px bg-[#e7e3da]" />
        <button type="button" onClick={() => onOpenChange(false)} aria-label="Close Time Machine" className="flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-[#0f1524] px-3 text-xs font-semibold text-[#0f1524] transition-colors hover:bg-[#f2f0ea]"><X size={15} /><span>Close</span></button>
      </div>
    </div>

    <div className="mt-1.5">
      <div ref={trackRef} onPointerDown={handleTrackPointerDown} className="relative h-[34px] cursor-pointer touch-none overflow-visible rounded-[8px] bg-[#f4f2ec]">
        <div className="absolute inset-0 flex items-end gap-0.5 pointer-events-none" aria-hidden="true">
          {density.map((bar, index) => <span key={index} className="flex-1 rounded-t-sm" style={{ height: Math.min(26, bar.height), backgroundColor: bar.selected ? "#e8a020" : "#e4e0d6" }} />)}
        </div>
        <div role="slider" tabIndex={0} aria-label="Move selected time window" aria-valuetext={`${formatYear(draft.fromYear)} to ${formatYear(draft.toYear)}`} onKeyDown={handleWindowKey} onPointerDown={(event) => startDrag("move", event)} className="absolute inset-y-0 cursor-grab rounded-[7px] border-[1.5px] border-[#0f1524] bg-[#0f1524]/10 active:cursor-grabbing" style={{ left: `${brushLeft}%`, width: `${brushWidth}%` }}>
          <button type="button" role="slider" aria-label="Timeline start year" aria-valuemin={minimum} aria-valuemax={draft.toYear - minimumSpan} aria-valuenow={draft.fromYear} onKeyDown={(event) => handleBoundaryKey("from", event)} onPointerDown={(event) => startDrag("left", event)} className="absolute -left-[5px] top-1/2 h-[22px] w-[10px] -translate-y-1/2 cursor-ew-resize touch-none rounded-[5px] bg-[#0f1524]" />
          <button type="button" role="slider" aria-label="Timeline end year" aria-valuemin={draft.fromYear + minimumSpan} aria-valuemax={maximum} aria-valuenow={draft.toYear} onKeyDown={(event) => handleBoundaryKey("to", event)} onPointerDown={(event) => startDrag("right", event)} className="absolute -right-[5px] top-1/2 h-[22px] w-[10px] -translate-y-1/2 cursor-ew-resize touch-none rounded-[5px] bg-[#0f1524]" />
        </div>
      </div>

      <div className="mt-1 flex gap-0.5">
        {HISTORY_PERIODS.map((period) => {
          const active = Boolean(range) && draft.fromYear <= period.toYear && draft.toYear >= period.fromYear
          const exact = draft.fromYear === period.fromYear && draft.toYear === period.toYear
          return <button type="button" key={period.label} onClick={() => commit({ fromYear: period.fromYear, toYear: period.toYear })} className={`flex-1 rounded-md px-0.5 py-0.5 text-[9px] leading-tight hover:bg-[#efece4] ${active ? "font-semibold text-[#0f1524]" : "text-[#8d887e]"} ${exact ? "bg-[#efece4]" : "bg-transparent"}`}>{period.label}</button>
        })}
      </div>
    </div>
    {selectedCount === 0 && <p className="mt-1 text-center text-[10.5px] text-[#7c7870]">No artworks in this window. Choose another era.</p>}
  </section>

  return <>
    <div className="relative">
      <button type="button" onClick={() => onOpenChange(!open)} aria-label={open ? "Close Time Machine" : range ? "Open Time Machine, filter active" : "Open Time Machine"} title={range ? "Time Machine active" : "Time Machine"} className={`flex h-[30px] min-w-0 items-center gap-2 whitespace-nowrap rounded-[12px] px-3 text-xs shadow-sm transition-colors motion-reduce:transition-none ${range ? "font-semibold" : "font-medium"} ${open ? "bg-[#0f1524] text-white" : "bg-[#f5f3ed] text-[#3c3931] hover:bg-[#efece4]"}`}>
        <Clock3 className={open || range ? "text-[#e8a020]" : "text-slate-800"} size={16} />
        {!compact && <span>Time Machine{range ? " active" : ""}</span>}
      </button>
    </div>

    {mounted && open && createPortal(timelinePanel, document.body)}

  </>
}
