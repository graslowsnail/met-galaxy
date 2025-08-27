"use client"

import { useState } from "react"
import { X, Zap } from "lucide-react"

export function FractalWidget() {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Mobile Floating Icon Button */}
      <div className="fixed top-6 right-6 z-50 sm:hidden">
        <button
          onClick={handleToggle}
          className="relative w-14 h-14 bg-white/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-slate-900" />
          ) : (
            <Zap className="w-6 h-6 text-slate-900" />
          )}
        </button>
      </div>

      {/* Mobile Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-end pt-22 pr-4 sm:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-[90vw] bg-[#26252480] backdrop-blur-sm rounded-2xl p-4 shadow-2xl animate-in fade-in-0 slide-in-from-right-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/90 text-sm">
              Built by Pablo Ramirez at Fractal Tech
            </p>
          </div>
        </div>
      )}

      {/* Desktop Always-Visible Widget */}
      <div className="hidden sm:block fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Subtle glow effect */}
          <div
            className="absolute top-0 left-0 w-full h-full rounded-lg opacity-30 blur-[4px] scale-105 shadow-lg shadow-black/50"
            // style={{
            //   background: "linear-gradient(270deg, rgb(255, 59, 48) 0%, rgb(255, 149, 0) 100%)",
            // }}
          />
          
          {/* Widget Content */}
          <div className="relative bg-black/40 shadow-lg shadow-black/50 backdrop-blur-sm rounded-lg px-6 py-3 ">
            <p className="text-white/90 text-sm whitespace-nowrap">
              Built by{" "}
              <a
                href="https://pabloar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Pablo Ramirez
              </a>{" "}
              at{" "}
              <a
                href="https://fractalbootcamp.com/fractal-tech-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Fractal Tech
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}