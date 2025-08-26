"use client"

import { useState } from "react"
import { X, Info } from "lucide-react"

export function InfoWidget() {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Info Icon Button */}
      <div className="fixed top-6 right-6 z-40">
        {/* Glowing effect for button on mobile when modal is open */}
        {isOpen && (
          <div
            className="absolute top-0 left-0 w-full h-full rounded-full opacity-40 blur-[6px] scale-110 sm:hidden"
            style={{
              background: "linear-gradient(270deg, rgb(85, 254, 254) 0%, rgb(191, 73, 238) 100%)",
            }}
          ></div>
        )}
        
        <button
          onClick={handleToggle}
          className={`relative w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 ${isOpen ? 'sm:opacity-0 sm:pointer-events-none' : ''}`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-black sm:hidden" />
          ) : (
            <Info className="w-6 h-6 text-black" />
          )}
        </button>
      </div>

      {/* Info Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-end pt-22 pr-4 sm:items-start sm:justify-end sm:pt-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div
            className="w-full max-w-[90vw] sm:w-80 bg-[#26252480] backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-2xl animate-in slide-in-from-right-5 duration-300"
            style={{ backgroundColor: "#26252480" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Desktop only */}
            <button
              onClick={() => setIsOpen(false)}
              className="hidden sm:flex absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            {/* Powered By */}
            <div className="mb-3  border-b border-white/10 text-center">
              <div className="text-white font-bold text-lg">MET Backrooms</div>
            </div>

            {/* Main Content */}
            <div className="text-white/90 space-y-4">
              <p className="text-sm leading-relaxed">
                MET Backrooms is an infinite gallery for The Met's open-access collection. Wander 330,000+ artworks and
                keep scrolling forever.
              </p>

              <div className="space-y-2">
                <p className="text-white/70 text-sm font-medium">Links:</p>
                <div className="space-y-1">
                  <a href="https://www.pabloar.com/" className="block text-blue-400 hover:text-blue-300 text-sm transition-colors">
                    • What's Public Domain?
                  </a>
                  <a href="#" className="block text-blue-400 hover:text-blue-300 text-sm transition-colors">
                    • Terms of service
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}