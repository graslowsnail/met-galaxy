"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { usePostHog } from 'posthog-js/react'

export function InfoWidget() {
  const [isOpen, setIsOpen] = useState(true)
  const posthog = usePostHog()

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    
    // Track info modal toggle
    posthog?.capture('info_modal_toggled', {
      action: newState ? 'opened' : 'closed'
    })
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
          <style jsx>{`
            @keyframes float-star {
              0% {
                opacity: 0;
                transform: translateY(0) translateX(-50%) scale(0) rotate(0deg);
              }
              20% {
                opacity: 1;
                transform: translateY(-10px) translateX(-50%) scale(1) rotate(72deg);
              }
              100% {
                opacity: 0;
                transform: translateY(-60px) translateX(var(--drift)) scale(0.3) rotate(360deg);
              }
            }
            
            .star {
              position: absolute;
              width: 12px;
              height: 12px;
              bottom: 50%;
              left: 50%;
              transform: translateX(-50%);
              animation: float-star 2.5s ease-out infinite;
              pointer-events: none;
            }
            
            .star svg {
              width: 100%;
              height: 100%;
              fill: #1f2937;
            }
            
            .star:nth-child(1) {
              animation-delay: 0s;
              --drift: -30px;
            }
            
            .star:nth-child(2) {
              animation-delay: 0.4s;
              --drift: 25px;
            }
            
            .star:nth-child(3) {
              animation-delay: 0.8s;
              --drift: -20px;
            }
            
            .star:nth-child(4) {
              animation-delay: 1.2s;
              --drift: 35px;
            }
            
            .star:nth-child(5) {
              animation-delay: 1.6s;
              --drift: -15px;
            }
            
            .star:nth-child(6) {
              animation-delay: 2s;
              --drift: 0px;
            }
            
            @keyframes pulse-glow {
              0%, 100% {
                box-shadow: 0 0 0 0 rgba(31, 41, 55, 0.4);
              }
              50% {
                box-shadow: 0 0 20px 5px rgba(31, 41, 55, 0.2);
              }
            }
            
            .glow-effect {
              animation: pulse-glow 2s ease-in-out infinite;
            }
          `}</style>
          
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
            className="w-full max-w-[90vw] sm:max-w-md lg:max-w-lg bg-white/85 backdrop-blur-sm rounded-2xl p-4 sm:p-8 shadow-xl shadow-black/25 animate-in fade-in-0 zoom-in-95 duration-300 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Desktop only */}
            <button
              onClick={() => setIsOpen(false)}
              className="hidden sm:flex absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
            {/* Powered By */}
            <div className="mb-6 border-b border-gray-200 text-center pb-4">
              <div className="text-gray-800 font-serif font-bold text-2xl sm:text-3xl lg:text-4xl">Open Metropolitan</div>
            </div>

            {/* Main Content */}
            <div className="text-gray-700 space-y-6">
              <p className="text-base sm:text-lg leading-relaxed text-gray-600">
                Explore The Met's vast collection through an infinite 
                scrolling gallery. Discover 340,000+ artworks from 
                around the world.
              </p>

              <div className="space-y-3">
                <p className="text-gray-700 text-base sm:text-lg font-medium">How to explore:</p>
                <ul className="space-y-2 text-base sm:text-lg text-gray-600">
                  <li className="flex items-start">
                    <span className="text-gray-500 mr-2">•</span>
                    Click and drag infinitely until something catches your eye
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-500 mr-2">•</span>
                    Click any artwork to see more like it
                  </li>
                </ul>
              </div>

              {/* Explore Button */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    // Track explore button click
                    posthog?.capture('explore_button_clicked', {
                      source: 'info_modal'
                    })
                    setIsOpen(false)
                  }}
                  className="relative bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 glow-effect"
                >
                  {/* Button text */}
                  <span className="relative z-10">Explore</span>
                  
                  {/* Floating Stars */}
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    <span className="star">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12,1 L14.5,8.5 L22,8.5 L16,13 L18.5,20.5 L12,16 L5.5,20.5 L8,13 L2,8.5 L9.5,8.5 Z"/>
                      </svg>
                    </span>
                    <span className="star">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12,1 L14.5,8.5 L22,8.5 L16,13 L18.5,20.5 L12,16 L5.5,20.5 L8,13 L2,8.5 L9.5,8.5 Z"/>
                      </svg>
                    </span>
                    <span className="star">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12,1 L14.5,8.5 L22,8.5 L16,13 L18.5,20.5 L12,16 L5.5,20.5 L8,13 L2,8.5 L9.5,8.5 Z"/>
                      </svg>
                    </span>
                    <span className="star">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12,1 L14.5,8.5 L22,8.5 L16,13 L18.5,20.5 L12,16 L5.5,20.5 L8,13 L2,8.5 L9.5,8.5 Z"/>
                      </svg>
                    </span>
                    <span className="star">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12,1 L14.5,8.5 L22,8.5 L16,13 L18.5,20.5 L12,16 L5.5,20.5 L8,13 L2,8.5 L9.5,8.5 Z"/>
                      </svg>
                    </span>
                    <span className="star">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12,1 L14.5,8.5 L22,8.5 L16,13 L18.5,20.5 L12,16 L5.5,20.5 L8,13 L2,8.5 L9.5,8.5 Z"/>
                      </svg>
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  )
}