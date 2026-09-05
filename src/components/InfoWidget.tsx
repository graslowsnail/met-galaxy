"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Info, X } from "lucide-react"

const CLOSE_ANIMATION_MS = 220

export function InfoWidget() {
  const [isOpen, setIsOpen] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closePanel = useCallback(() => {
    if (!isOpen || isClosing) return
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      closeTimerRef.current = null
    }, CLOSE_ANIMATION_MS)
  }, [isClosing, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!widgetRef.current?.contains(event.target as Node)) closePanel()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel()
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("wheel", closePanel, { passive: true, capture: true })
    document.addEventListener("touchmove", closePanel, { passive: true, capture: true })
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("wheel", closePanel, true)
      document.removeEventListener("touchmove", closePanel, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [closePanel, isOpen])

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  const handleToggle = () => {
    if (isOpen) {
      closePanel()
      return
    }
    setIsClosing(false)
    setIsOpen(true)
  }

  return (
    <div ref={widgetRef} className="relative">
      <style jsx>{`
        @keyframes open-met-expand {
          from { opacity: 0; transform: translate(-8px, -8px) scale(.72); filter: blur(2px); }
          to { opacity: 1; transform: translate(0, 0) scale(1); filter: blur(0); }
        }
        @keyframes open-met-recess {
          from { opacity: 1; transform: translate(0, 0) scale(1); filter: blur(0); }
          to { opacity: 0; transform: translate(-8px, -8px) scale(.72); filter: blur(2px); }
        }
        .open-met-expand { animation: open-met-expand 280ms cubic-bezier(.22, 1, .36, 1) both; }
        .open-met-recess { animation: open-met-recess ${CLOSE_ANIMATION_MS}ms cubic-bezier(.4, 0, 1, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .open-met-expand, .open-met-recess { animation-duration: 1ms; }
        }
      `}</style>

      <button
        type="button"
        onClick={handleToggle}
        aria-label={isOpen ? "Close Open Metropolitan introduction" : "About Open Metropolitan"}
        aria-expanded={isOpen}
        title="About Open Metropolitan"
        className="relative flex h-[30px] items-center justify-center gap-1.5 rounded-[12px] border border-white/40 bg-white/55 px-3 text-xs font-medium text-[#3c3931] shadow-sm backdrop-blur-[12px] transition-colors hover:bg-white/75"
      >
        {isOpen ? <X size={15} /> : <Info size={15} />}
        <span>Open Metropolitan</span>
      </button>

      {isOpen && (
        <section
          aria-label="About Open Metropolitan"
          className={`absolute left-0 top-[calc(100%+8px)] z-[60] w-[min(360px,calc(100vw-24px))] origin-top-left rounded-[16px] border border-white/60 bg-white/88 p-4 text-[#4d5666] shadow-[0_18px_45px_-22px_rgba(15,21,36,.5)] backdrop-blur-[16px] ${isClosing ? "open-met-recess" : "open-met-expand"}`}
        >
          <div className="border-b border-[#e8e5dd] pb-3">
            <div>
              <h2 className="font-serif text-xl font-semibold leading-none text-[#1f2937]">Open Metropolitan</h2>
              <p className="mt-1.5 text-xs text-[#77736b]">Explore more than 340,000 artworks from The Met.</p>
            </div>
          </div>

          <div className="mt-3 space-y-2 text-[13px] leading-relaxed">
            <p className="font-semibold text-[#3c3931]">How to explore</p>
            <ul className="space-y-1.5 text-[#656158]">
              <li>Drag the gallery until something catches your eye.</li>
              <li>Select any artwork to discover more like it.</li>
              <li>Use Search and Time Machine to jump across ideas and eras.</li>
            </ul>
          </div>

          <p className="mt-3 border-t border-[#e8e5dd] pt-3 text-[11px] text-[#77736b] xl:hidden">
            Built by{" "}
            <a href="https://pabloar.com" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-[#1f2937]">Pablo Ramirez</a>{" "}
            at{" "}
            <a href="https://fractalbootcamp.com/fractal-tech-hub" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-[#1f2937]">Fractal Tech</a>
          </p>

        </section>
      )}
    </div>
  )
}
