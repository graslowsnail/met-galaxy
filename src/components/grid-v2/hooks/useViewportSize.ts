/**
 * useViewportSize - Viewport dimension tracking
 * 
 * Tracks window size and container dimensions with resize event handling.
 * Provides container ref for DOM measurements.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { UseViewportSizeReturn, ViewportSize } from '../types/grid'
import { DEBUG_LOGGING, DEBOUNCE_DELAY_MS } from '../utils/constants'

export function useViewportSize(): UseViewportSizeReturn {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  
  // ============================================================================
  // REFS
  // ============================================================================
  
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  
  // ============================================================================
  // SIZE MEASUREMENT
  // ============================================================================
  
  const measureSize = useCallback(() => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const newSize = {
      width: rect.width,
      height: rect.height
    }
    
    // Only update if size actually changed
    setSize(prevSize => {
      if (prevSize.width !== newSize.width || prevSize.height !== newSize.height) {
        if (DEBUG_LOGGING) {
          console.log('📐 Viewport size updated:', newSize)
        }
        return newSize
      }
      return prevSize
    })
    
    // Mark as initialized once we have valid dimensions
    if (newSize.width > 0 && newSize.height > 0 && !isInitialized) {
      setIsInitialized(true)
      if (DEBUG_LOGGING) {
        console.log('✅ Viewport initialized with size:', newSize)
      }
    }
  }, [isInitialized])
  
  // ============================================================================
  // DEBOUNCED RESIZE HANDLER
  // ============================================================================
  
  const handleResize = useCallback(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    // Debounce resize events for performance
    debounceTimeoutRef.current = setTimeout(() => {
      measureSize()
    }, DEBOUNCE_DELAY_MS)
  }, [measureSize])
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initial measurement when container ref is available
  useEffect(() => {
    if (containerRef.current) {
      measureSize()
    }
  }, [measureSize])
  
  // Window resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      
      // Cleanup debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [handleResize])
  
  // Measure on mount and when container changes
  useEffect(() => {
    // Use ResizeObserver if available for more accurate container size tracking
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          const newSize = { width, height }
          
          setSize(prevSize => {
            if (prevSize.width !== newSize.width || prevSize.height !== newSize.height) {
              if (DEBUG_LOGGING) {
                console.log('📐 Container size updated (ResizeObserver):', newSize)
              }
              return newSize
            }
            return prevSize
          })
          
          // Mark as initialized
          if (width > 0 && height > 0 && !isInitialized) {
            setIsInitialized(true)
            if (DEBUG_LOGGING) {
              console.log('✅ Viewport initialized via ResizeObserver:', newSize)
            }
          }
        }
      })
      
      resizeObserver.observe(containerRef.current)
      
      return () => {
        resizeObserver.disconnect()
      }
    } else {
      // Fallback to manual measurement
      measureSize()
    }
  }, [measureSize, isInitialized])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    size,
    containerRef,
    isInitialized,
  }
}
