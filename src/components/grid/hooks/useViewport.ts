/**
 * Hook for managing viewport state and drag interactions
 * 
 * This hook encapsulates all viewport-related logic including drag handling,
 * coordinate transformations, and viewport dimension management. It provides
 * a clean interface for components to interact with the viewport without
 * managing the complex state transitions themselves.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { 
  ViewportState, 
  DragState, 
  Position, 
  UseViewportReturn,
  ViewportBounds
} from '../types/grid'
import { 
  calculateViewportBounds, 
  isSignificantViewportChange 
} from '../utils/chunkCalculations'
import { 
  POST_DRAG_UPDATE_DELAY, 
  VIEWPORT_CHANGE_THRESHOLD
} from '../utils/constants'

/**
 * Custom hook for viewport and drag management
 * 
 * Features:
 * - Mouse and touch drag handling
 * - Viewport dimension tracking
 * - Coordinate transformation utilities
 * - Smooth drag performance with optimized updates
 * - Post-drag update callbacks
 */
export function useViewport(): UseViewportReturn {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /** Current viewport dimensions */
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 })
  
  /** Current translation/pan position */
  const [translate, setTranslate] = useState<Position>({ x: 0, y: 0 })
  
  /** Drag interaction state */
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const [dragDistance, setDragDistance] = useState(0)
  const [initialMousePos, setInitialMousePos] = useState<Position>({ x: 0, y: 0 })
  
  /** Initialization flag */
  const [isInitialized, setIsInitialized] = useState(false)
  
  // ============================================================================
  // REFS FOR PERFORMANCE
  // ============================================================================
  
  /** Reference to the container element for dimension tracking */
  const containerRef = useRef<HTMLDivElement>(null)
  
  /** Track last viewport state for change detection */
  const lastViewport = useRef({ x: 0, y: 0, width: 0, height: 0 })
  
  /** RAF ID for throttled updates */
  const rafId = useRef<number | undefined>(undefined)
  
  /** Callbacks to trigger after drag ends */
  const postDragCallbacks = useRef<Array<() => void>>([])
  
  // ============================================================================
  // VIEWPORT DIMENSION MANAGEMENT
  // ============================================================================
  
  /**
   * Update viewport dimensions based on container size
   */
  const updateViewportDimensions = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      setViewportDimensions({ width: containerWidth, height: containerHeight })
    }
  }, [])
  
  /**
   * Initialize viewport to center position
   */
  const initializeViewport = useCallback(() => {
    if (viewportDimensions.width && viewportDimensions.height && !isInitialized) {
      const centerX = viewportDimensions.width / 2
      const centerY = viewportDimensions.height / 2
      
      setTranslate({ x: centerX, y: centerY })
      setIsInitialized(true)
    }
  }, [viewportDimensions, isInitialized])
  
  // ============================================================================
  // DRAG HANDLING - MOUSE
  // ============================================================================
  
  /**
   * Handle mouse down event to start dragging
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ 
      x: e.clientX - translate.x, 
      y: e.clientY - translate.y 
    })
    setInitialMousePos({ x: e.clientX, y: e.clientY })
    setDragDistance(0)
  }, [translate])
  
  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    // Calculate distance from initial mouse position
    const distance = Math.sqrt(
      Math.pow(e.clientX - initialMousePos.x, 2) + 
      Math.pow(e.clientY - initialMousePos.y, 2)
    )
    setDragDistance(distance)
    
    const newTranslate = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }
    
    setTranslate(newTranslate)
  }, [isDragging, dragStart, initialMousePos])
  
  /**
   * Handle mouse up to end dragging
   */
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    // Trigger post-drag callbacks with delay for smooth UX
    setTimeout(() => {
      postDragCallbacks.current.forEach(callback => callback())
    }, POST_DRAG_UPDATE_DELAY)
  }, [isDragging])
  
  // ============================================================================
  // DRAG HANDLING - TOUCH
  // ============================================================================
  
  /**
   * Handle touch start event to start dragging
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    
    setIsDragging(true)
    setDragStart({ 
      x: touch.clientX - translate.x, 
      y: touch.clientY - translate.y 
    })
    setInitialMousePos({ x: touch.clientX, y: touch.clientY })
    setDragDistance(0)
  }, [translate])
  
  /**
   * Handle touch move during drag
   */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    const touch = e.touches[0]
    if (!touch) return
    
    // Calculate distance from initial touch position
    const distance = Math.sqrt(
      Math.pow(touch.clientX - initialMousePos.x, 2) + 
      Math.pow(touch.clientY - initialMousePos.y, 2)
    )
    setDragDistance(distance)
    
    const newTranslate = {
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    }
    
    setTranslate(newTranslate)
  }, [isDragging, dragStart, initialMousePos])
  
  /**
   * Handle touch end to end dragging
   */
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    // Trigger post-drag callbacks with delay for smooth UX
    setTimeout(() => {
      postDragCallbacks.current.forEach(callback => callback())
    }, POST_DRAG_UPDATE_DELAY)
  }, [isDragging])
  
  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  
  /**
   * Set up global event listeners for drag handling
   */
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
    }
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])
  
  /**
   * Set up resize listener for viewport dimension tracking
   */
  useEffect(() => {
    updateViewportDimensions()
    
    const handleResize = () => {
      updateViewportDimensions()
    }
    
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateViewportDimensions])
  
  /**
   * Initialize viewport when dimensions are available
   */
  useEffect(() => {
    initializeViewport()
  }, [initializeViewport])
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Get current viewport state
   */
  const getViewportState = useCallback((): ViewportState => {
    return {
      width: viewportDimensions.width,
      height: viewportDimensions.height,
      translateX: translate.x,
      translateY: translate.y,
    }
  }, [viewportDimensions, translate])
  
  /**
   * Get current viewport bounds in world coordinates
   */
  const getViewportBounds = useCallback((includeBuffer = true): ViewportBounds => {
    return calculateViewportBounds(getViewportState(), includeBuffer)
  }, [getViewportState])
  
  /**
   * Check if viewport has changed significantly
   */
  const hasSignificantViewportChange = useCallback((threshold = VIEWPORT_CHANGE_THRESHOLD): boolean => {
    const current = translate
    const previous = { x: lastViewport.current.x, y: lastViewport.current.y }
    return isSignificantViewportChange(previous, current, threshold)
  }, [translate])
  
  /**
   * Register callback to be called after drag ends
   */
  const onPostDrag = useCallback((callback: () => void) => {
    postDragCallbacks.current.push(callback)
    
    // Return cleanup function
    return () => {
      const index = postDragCallbacks.current.indexOf(callback)
      if (index > -1) {
        postDragCallbacks.current.splice(index, 1)
      }
    }
  }, [])
  
  /**
   * Manually set viewport position (useful for programmatic navigation)
   */
  const setViewportPosition = useCallback((position: Position) => {
    setTranslate(position)
  }, [])
  
  /**
   * Reset viewport to center position
   */
  const resetViewport = useCallback(() => {
    if (viewportDimensions.width && viewportDimensions.height) {
      const centerX = viewportDimensions.width / 2
      const centerY = viewportDimensions.height / 2
      setViewportPosition({ x: centerX, y: centerY })
    }
  }, [viewportDimensions, setViewportPosition])

  /**
   * Update position by delta amount (for trackpad/wheel navigation)
   */
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
    // Viewport state
    viewport: getViewportState(),
    translate,
    viewportDimensions,
    isInitialized,
    
    // Drag state
    dragState: {
      isDragging,
      startX: dragStart.x,
      startY: dragStart.y,
      distance: dragDistance,
    },
    isDragging,
    dragDistance,
    
    // Event handlers
    handleMouseDown,
    handleTouchStart,
    
    // Utility functions
    getViewportBounds,
    hasSignificantViewportChange,
    onPostDrag,
    setViewportPosition,
    resetViewport,
    updatePosition,
    
    // Refs for components that need them
    containerRef,
  }
}
