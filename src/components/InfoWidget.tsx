"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function InfoWidget() {
  const [isOpen, setIsOpen] = useState(true)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Info Icon Button */}
      <div className="fixed top-6 left-6 sm:top-6 sm:left-6 z-40">
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
          className="relative bg-white/50 rounded-lg shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-5"
        >
          {isOpen ? (
            <>
              <X className="w-6 h-6 text-black sm:hidden" />
              <span className="hidden sm:block text-slate-900 font-serif font-medium sm:text-xl lg:text-2xl xl:text-3xl">Open Metropolitan</span>
            </>
          ) : (
            <span className="text-slate-900 font-serif font-medium sm:text-xl lg:text-2xl xl:text-2xl">Open Metropolitan</span>
          )}
        </button>
      </div>

      {/* Info Modal */}
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <div 
            className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20 animate-in fade-in-0 duration-300"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:items-center sm:justify-center"
            onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
          >
          <div
            className="w-full max-w-[90vw] sm:max-w-md lg:max-w-lg bg-black/50 backdrop-blur-md rounded-2xl p-4 sm:p-8 shadow-lg shadow-black/50 animate-in fade-in-0 zoom-in-95 duration-300 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Desktop only */}
            <button
              onClick={() => setIsOpen(false)}
              className="hidden sm:flex absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            {/* Powered By */}
            <div className="mb-6 border-b border-white/10 text-center pb-4">
              <div className="text-white font-serif font-bold text-2xl sm:text-3xl lg:text-4xl">Open Metropolitan</div>
            </div>

            {/* Main Content */}
            <div className="text-white space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-white/95">
                Explore The Met's vast collection through an infinite 
                scrolling gallery. Discover 340,000+ artworks from 
                around the world.
              </p>

              <div className="space-y-3">
                <p className="text-white text-base sm:text-lg font-medium">How to explore:</p>
                <ul className="space-y-2 text-base sm:text-lg text-white/95">
                  <li className="flex items-start">
                    <span className="text-white/85 mr-2">•</span>
                    Click and drag infinitely until something catches your eye
                  </li>
                  <li className="flex items-start">
                    <span className="text-white/85 mr-2">•</span>
                    Click any artwork to see more like it
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  )
}