/**
 * usePointerPan - Camera control with pointer interactions
 * 
 * Handles mouse and touch interactions for panning the world plane.
 * Includes click vs drag detection and smooth RAF-throttled updates.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { UsePointerPanReturn } from '../types/grid'
import { CLICK_MOVE_THRESHOLD, DEBUG_LOGGING } from '../utils/constants'

interface UsePointerPanOptions {
  initialTranslate?: { x: number; y: number }
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function usePointerPan(options: UsePointerPanOptions = {}): UsePointerPanReturn {
  const { 
    initialTranslate = { x: 0, y: 0 },
    onDragStart,
    onDragEnd
  } = options

  // ============================================================================
  // STATE
  // ============================================================================
  
  const [translate, setTranslate] = useState(initialTranslate)
  const [isDragging, setIsDragging] = useState(false)
  
  // ============================================================================
  // REFS
  // ============================================================================
  
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const rafIdRef = useRef<number | undefined>()
  const dragDistanceRef = useRef(0)
  
  // ============================================================================
  // DRAG DISTANCE CALCULATION
  // ============================================================================
  
  const calculateDragDistance = useCallback((currentX: number, currentY: number): number => {
    const dx = currentX - pointerStartRef.current.x
    const dy = currentY - pointerStartRef.current.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])
  
  // ============================================================================
  // POINTER EVENT HANDLERS
  // ============================================================================
  
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Capture pointer for proper event handling
    e.currentTarget.setPointerCapture(e.pointerId)
    
    // Store initial positions
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    dragStartRef.current = { 
      x: e.clientX - translate.x, 
      y: e.clientY - translate.y 
    }
    
    dragDistanceRef.current = 0
    setIsDragging(true)
    onDragStart?.()
    
    if (DEBUG_LOGGING) {
      console.log('🖱️ Pointer drag started at:', pointerStartRef.current)
    }
  }, [translate, onDragStart])
  
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return
    
    // Calculate new position
    const newTranslate = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }
    
    // Update drag distance
    dragDistanceRef.current = calculateDragDistance(e.clientX, e.clientY)
    
    // Use RAF for smooth updates
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      setTranslate(newTranslate)
    })
  }, [isDragging, calculateDragDistance])
  
  const onPointerUp = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    onDragEnd?.()
    
    if (DEBUG_LOGGING) {
      const isClick = dragDistanceRef.current < CLICK_MOVE_THRESHOLD
      console.log('🖱️ Pointer drag ended:', {
        distance: dragDistanceRef.current,
        isClick,
        threshold: CLICK_MOVE_THRESHOLD
      })
    }
  }, [isDragging, onDragEnd])
  
  // ============================================================================
  // GLOBAL EVENT LISTENERS
  // ============================================================================
  
  useEffect(() => {
    if (!isDragging) return
    
    // Add global listeners for pointer events
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)
    
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      
      // Cleanup RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [isDragging, onPointerMove, onPointerUp])
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const resetPosition = useCallback(() => {
    setTranslate(initialTranslate)
    dragDistanceRef.current = 0
    
    if (DEBUG_LOGGING) {
      console.log('🔄 Camera position reset to:', initialTranslate)
    }
  }, [initialTranslate])
  
  const updatePosition = useCallback((deltaX: number, deltaY: number) => {
    setTranslate(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }))
  }, [])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    translate,
    isDragging,
    dragDistance: dragDistanceRef.current,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetPosition,
    updatePosition,
  }
}
