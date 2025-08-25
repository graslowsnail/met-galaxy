"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function InfoWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Info Icon Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow duration-200"
      >
        <span className="text-black font-medium text-lg">i</span>
      </button>

      {/* Info Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
          <div
            className="w-80 bg-[#26252480] backdrop-blur-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-right-5 duration-300"
            style={{ backgroundColor: "#26252480" }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Main Content */}
            <div className="text-white/90 space-y-4">
              <p className="text-sm leading-relaxed">
                MET Backrooms is an infinite gallery for The Met's open-access collection. Wander 330,000+ artworks and
                keep scrolling forever.
              </p>

              <div className="space-y-2">
                <p className="text-white/70 text-sm font-medium">Links:</p>
                <div className="space-y-1">
                  <a href="#" className="block text-blue-400 hover:text-blue-300 text-sm transition-colors">
                    • What's Public Domain?
                  </a>
                  <a href="#" className="block text-blue-400 hover:text-blue-300 text-sm transition-colors">
                    • Terms of service
                  </a>
                </div>
              </div>
            </div>

            {/* Powered By */}
            <div className="mt-8 pt-4 border-t border-white/10 text-center">
              <p className="text-white/50 text-xs mb-2">POWERED BY</p>
              <div className="text-white font-bold text-lg">FRACTAL TECH</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}