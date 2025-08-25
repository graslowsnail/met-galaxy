"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function FractalWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Icon Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center z-50"
        >
          <div className="grid grid-cols-2 gap-1">
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
          </div>
        </button>
      )}

      {/* Expanded Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Modal Content */}
          <div
            className="w-96 rounded-3xl p-6 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
            style={{ backgroundColor: "#26252480" }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Header */}
            <div className="text-white/70 text-sm font-medium mb-3 tracking-wide">POWERED BY FRACTAL TECH</div>

            {/* Main Content */}
            <div className="flex items-center gap-6">
              {/* Left Side - Text Content */}
              <div className="flex-1">
                <h2 className="text-white text-xl font-light leading-tight mb-4">
                  The best place to create tech.
                </h2>

                <div className="relative">
                  {/* Glowing background effect */}
                  <div
                    className="absolute top-0 left-0 w-full h-full rounded-full opacity-40 blur-[8px] scale-110"
                    style={{
                      background: "linear-gradient(270deg, rgb(85, 254, 254) 0%, rgb(191, 73, 238) 100%)",
                    }}
                  ></div>

                  {/* Button */}
                  <Button
                    className="relative w-full bg-white text-gray-900 hover:bg-gray-100 rounded-full py-2 px-6 font-medium text-sm"
                    onClick={() => {
                      // Add your explore action here
                      console.log("Explore clicked")
                    }}
                  >
                    Explore
                  </Button>
                </div>
              </div>

              {/* Right Side - Logo Area */}
              <div className="w-32 h-20 bg-gradient-to-br from-amber-200 via-green-200 to-green-300 rounded-2xl flex items-center justify-center relative overflow-hidden">
                {/* Background blur effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-300/50 via-green-300/50 to-green-400/50 blur-sm"></div>

                {/* COSMOS Logo */}
                <div className="relative z-10">
                  <div className="text-white font-bold text-lg tracking-wider">
                    FRACTAL TECH<sup className="text-xs">®</sup>
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="absolute bottom-2 right-2 w-5 h-5 text-white/80">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path
                      d="M7 17L17 7M17 7H7M17 7V17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}