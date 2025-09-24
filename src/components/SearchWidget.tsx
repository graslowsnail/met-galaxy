"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Check } from "lucide-react"

export function SearchWidget() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  const handleCollapse = () => {
    setIsExpanded(false)
  }

  const handleSubmit = () => {
    if (searchValue.trim()) {
      console.log("Search submitted:", searchValue)
      // TODO: Implement actual search functionality
      // Keep search bar open to show results/messages
      // setIsExpanded(false) - removed to keep open
    }
  }

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Collapse search when dragging starts
  useEffect(() => {
    let isDragging = false
    let dragStarted = false

    const handleMouseDown = () => {
      isDragging = false
      dragStarted = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons === 1 && !dragStarted) { // Left mouse button is pressed
        isDragging = true
        dragStarted = true
        if (isExpanded) {
          handleCollapse()
        }
      }
    }

    const handleMouseUp = () => {
      isDragging = false
      dragStarted = false
    }

    const handleTouchStart = () => {
      isDragging = false
      dragStarted = false
    }

    const handleTouchMove = () => {
      if (!dragStarted) {
        isDragging = true
        dragStarted = true
        if (isExpanded) {
          handleCollapse()
        }
      }
    }

    const handleTouchEnd = () => {
      isDragging = false
      dragStarted = false
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isExpanded])

  return (
    <>
      {/* Search Widget */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="relative">
          {/* Collapsed State - Circular Search Button */}
          {!isExpanded && (
            <div className="relative">
              {/* Glowing background effect */}
              <div
                className="absolute top-0 left-0 w-full h-full rounded-full opacity-40 blur-[8px] scale-110"
                style={{
                  background: "linear-gradient(270deg, rgb(85, 254, 254) 0%, rgb(191, 73, 238) 100%)",
                }}
              ></div>
              
              {/* Button */}
              <button
                onClick={handleToggle}
                className="relative bg-white/50 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 w-12 h-12 sm:w-14 sm:h-14"
              >
                <Search className="w-6 h-6 text-slate-900" />
              </button>
            </div>
          )}

          {/* Expanded State - Full Search Bar */}
          {isExpanded && (
            <div className="bg-white/50 rounded-full px-6 py-3 shadow-lg border border-white/20 animate-in fade-in-0 zoom-in-95 duration-300 sm:px-8 sm:py-4">
              <div className="flex items-center space-x-3">
                <Search className="w-5 h-5 text-slate-900 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit()
                    }
                  }}
                  placeholder="Search artworks..."
                  className="bg-transparent outline-none text-slate-900 placeholder-slate-600 w-48 sm:w-64"
                />
                {searchValue && (
                  <button
                    onClick={handleSubmit}
                    className="text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}