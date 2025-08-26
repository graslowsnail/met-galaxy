"use client"

import { useState } from "react"
import { X, CirclePower } from "lucide-react"

export function FractalWidget() {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Floating Icon Button */}
      <div className="fixed top-6 right-6 sm:bottom-6 sm:right-6 sm:top-auto z-50">
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
          className={`relative w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center ${isOpen ? 'sm:opacity-0 sm:pointer-events-none' : ''}`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-gray-800 sm:hidden" />
          ) : (
            <CirclePower className="w-6 h-6 text-gray-800" />
          )}
        </button>
      </div>

      {/* Expanded Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-end pt-22 pr-4 sm:items-end sm:justify-end sm:pt-0 sm:pr-0 sm:bottom-6 sm:right-6 sm:inset-auto"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-[90vw] sm:max-w-none">
            {/* Glowing background effect for entire modal - desktop only */}
            <div
              className="hidden sm:block absolute top-0 left-0 w-full h-full rounded-3xl opacity-40 blur-[6px] scale-107"
              style={{
                background: "linear-gradient(270deg, rgb(85, 254, 254) 0%, rgb(191, 73, 238) 100%)",
              }}
            ></div>

            {/* Modal Content */}
            <div
              className="relative w-full sm:w-[28rem] bg-[#26252480] backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-2xl animate-in fade-in-0 slide-in-from-right-4 sm:slide-in-from-bottom-4 duration-300"
              style={{ backgroundColor: "#26252480" }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Close Button - Desktop only */}
            <button
              onClick={() => setIsOpen(false)}
              className="hidden sm:flex absolute top-3 right-3 w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center transition-colors z-10"
            >
              <X className="w-3 h-3 text-white" />
            </button>

            {/* Main Content */}
            <div className="flex flex-row items-start gap-4 sm:gap-6">
              {/* Left Side - Text Content */}
              <div className="flex-1">
                <div className="text-white/70 text-sm font-medium mb-3 tracking-wide">
                  POWERED BY {" "}
                  <a
                    href="https://fractalbootcamp.com/fractal-tech-hub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-white whitespace-nowrap"
                  >
                    FRACTAL TECH
                  </a>
                </div>
                <h2 className="text-white text-base sm:text-xl font-light leading-tight">
                  Where tech gets built in NYC.
                </h2>
              </div>

              {/* Right Side - Image */}
              <div className="w-24 sm:w-36 h-20 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0">
                <img 
                  alt="Fractal Tech Hub" 
                  loading="lazy" 
                  width="125" 
                  height="125" 
                  decoding="async" 
                  className="w-full h-full object-cover object-center"
                  srcSet="https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/f609c1f5-b124-4e1b-82e6-b25273749e52/bitsy_background/w=128,quality=90,fit=scale-down 1x, https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/f609c1f5-b124-4e1b-82e6-b25273749e52/bitsy_background/w=256,quality=90,fit=scale-down 2x" 
                  src="https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/f609c1f5-b124-4e1b-82e6-b25273749e52/bitsy_background/w=256,quality=90,fit=scale-down"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  )
}