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
  isSignificantViewportChange,
  pixelToChunkCoords,
  chunkToPixelCoords 
} from '../utils/chunkCalculations'
import { 
  POST_DRAG_UPDATE_DELAY, 
  VIEWPORT_CHANGE_THRESHOLD,
  DEBUG_LOGGING,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  AXIS_MARGIN,
  COLUMN_WIDTH 
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
  
  // ============================================================================
  // MOVEMENT PREDICTION STATE
  // ============================================================================
  
  /** Movement velocity tracking for prediction */
  const [velocity, setVelocity] = useState<Position>({ x: 0, y: 0 })
  
  /** Movement prediction data */
  const [movementPrediction, setMovementPrediction] = useState<{
    direction: Position
    speed: number
    predictedChunks: Array<{ x: number; y: number; priority: number }>
  }>({
    direction: { x: 0, y: 0 },
    speed: 0,
    predictedChunks: []
  })
  
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
  
  /** Movement tracking refs for velocity calculation */
  const lastPosition = useRef<Position>({ x: 0, y: 0 })
  const lastPositionTime = useRef<number>(Date.now())
  const velocityHistory = useRef<Array<{ velocity: Position; timestamp: number }>>([])
  const VELOCITY_HISTORY_SIZE = 5
  const PREDICTION_DISTANCE = 2 // Number of chunks ahead to predict
  
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
      
      if (DEBUG_LOGGING) {
        console.log(`📐 Viewport dimensions updated: ${containerWidth}x${containerHeight}`)
      }
    }
  }, [])
  
  /**
   * Initialize viewport to center on a specific chunk
   */
  const initializeViewport = useCallback(() => {
    if (viewportDimensions.width && viewportDimensions.height && !isInitialized) {
      // Focus on chunk (0, 0) at the origin
      const targetChunkX = 0
      const targetChunkY = 0
      
      // Get the pixel coordinates of the target chunk's top-left corner
      const chunkPixelCoords = chunkToPixelCoords(targetChunkX, targetChunkY)
      
      // Check if we're on a mobile/small screen
      const isMobile = viewportDimensions.width < 768 // sm breakpoint
      
      let chunkCenterX: number
      let chunkCenterY: number
      
      if (isMobile) {
        // On mobile, center on first image in top-left of chunk (0,0)
        // First column: AXIS_MARGIN + COLUMN_WIDTH/2
        // First row: AXIS_MARGIN + estimated first image center
        chunkCenterX = chunkPixelCoords.x + AXIS_MARGIN + (COLUMN_WIDTH / 2)
        chunkCenterY = chunkPixelCoords.y + AXIS_MARGIN + 200 // Approximate center of first image
      } else {
        // On desktop, use standard chunk center
        chunkCenterX = chunkPixelCoords.x + (CHUNK_WIDTH / 2)
        chunkCenterY = chunkPixelCoords.y + (CHUNK_HEIGHT / 2)
      }
      
      // Calculate translation needed to center this point in the viewport
      const viewportCenterX = viewportDimensions.width / 2
      const viewportCenterY = viewportDimensions.height / 2
      
      // Translation = viewport center - target point
      const translateX = viewportCenterX - chunkCenterX
      const translateY = viewportCenterY - chunkCenterY
      
      setTranslate({ x: translateX, y: translateY })
      setIsInitialized(true)
    }
  }, [viewportDimensions, isInitialized])
  
  // ============================================================================
  // MOVEMENT PREDICTION LOGIC
  // ============================================================================
  
  /**
   * Calculate current movement velocity based on position changes
   */
  const calculateVelocity = useCallback((newPosition: Position) => {
    const now = Date.now()
    const deltaTime = now - lastPositionTime.current
    
    if (deltaTime === 0) return { x: 0, y: 0 }
    
    const deltaX = newPosition.x - lastPosition.current.x
    const deltaY = newPosition.y - lastPosition.current.y
    
    // Velocity in pixels per second
    const velocityX = (deltaX / deltaTime) * 1000
    const velocityY = (deltaY / deltaTime) * 1000
    
    return { x: velocityX, y: velocityY }
  }, [])
  
  /**
   * Update movement prediction based on current velocity
   */
  const updateMovementPrediction = useCallback((newVelocity: Position) => {
    // Add current velocity to history
    velocityHistory.current.push({
      velocity: newVelocity,
      timestamp: Date.now()
    })
    
    // Keep only recent history
    if (velocityHistory.current.length > VELOCITY_HISTORY_SIZE) {
      velocityHistory.current.shift()
    }
    
    // Calculate average velocity from recent history
    if (velocityHistory.current.length === 0) {
      setMovementPrediction({
        direction: { x: 0, y: 0 },
        speed: 0,
        predictedChunks: []
      })
      return
    }
    
    const avgVelocity = velocityHistory.current.reduce(
      (acc, entry) => ({
        x: acc.x + entry.velocity.x,
        y: acc.y + entry.velocity.y
      }),
      { x: 0, y: 0 }
    )
    
    avgVelocity.x /= velocityHistory.current.length
    avgVelocity.y /= velocityHistory.current.length
    
    const speed = Math.sqrt(avgVelocity.x * avgVelocity.x + avgVelocity.y * avgVelocity.y)
    
    // Only predict if there's significant movement
    if (speed < 50) { // 50 pixels per second threshold
      setMovementPrediction({
        direction: { x: 0, y: 0 },
        speed: 0,
        predictedChunks: []
      })
      return
    }
    
    // Normalize direction
    const direction = {
      x: avgVelocity.x / speed,
      y: avgVelocity.y / speed
    }
    
    // Predict future chunks based on direction and current viewport
    const predictedChunks = []
    const currentViewportBounds = calculateViewportBounds({ 
      width: viewportDimensions.width, 
      height: viewportDimensions.height, 
      translateX: translate.x, 
      translateY: translate.y 
    }, false)
    
    // Calculate chunks in movement direction
    for (let i = 1; i <= PREDICTION_DISTANCE; i++) {
      const futureX = currentViewportBounds.left + direction.x * CHUNK_WIDTH * i
      const futureY = currentViewportBounds.top + direction.y * CHUNK_HEIGHT * i
      
      const chunkCoord = pixelToChunkCoords(futureX, futureY)
      const priority = Math.max(0, 1 - (i / PREDICTION_DISTANCE)) // Higher priority for closer predictions
      
      predictedChunks.push({
        x: chunkCoord.x,
        y: chunkCoord.y,
        priority
      })
    }
    
    setMovementPrediction({
      direction,
      speed,
      predictedChunks
    })
    
    setVelocity(avgVelocity)
  }, [viewportDimensions, translate, calculateVelocity])
  
  /**
   * Track position changes and update predictions
   */
  const trackMovement = useCallback((newPosition: Position) => {
    const newVelocity = calculateVelocity(newPosition)
    updateMovementPrediction(newVelocity)
    
    // Update tracking references
    lastPosition.current = newPosition
    lastPositionTime.current = Date.now()
  }, [calculateVelocity, updateMovementPrediction])
  
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
    
    if (DEBUG_LOGGING) {
      console.log(`🖱️ Mouse drag started at (${e.clientX}, ${e.clientY})`)
    }
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
    trackMovement(newTranslate)
  }, [isDragging, dragStart, initialMousePos, trackMovement])
  
  /**
   * Handle mouse up to end dragging
   */
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    if (DEBUG_LOGGING) {
      console.log('🖱️ Mouse drag ended')
    }
    
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
    
    if (DEBUG_LOGGING) {
      console.log(`👆 Touch drag started at (${touch.clientX}, ${touch.clientY})`)
    }
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
    trackMovement(newTranslate)
  }, [isDragging, dragStart, initialMousePos, trackMovement])
  
  /**
   * Handle touch end to end dragging
   */
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    if (DEBUG_LOGGING) {
      console.log('👆 Touch drag ended')
    }
    
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
    trackMovement(position)
    
    if (DEBUG_LOGGING) {
      console.log(`📍 Viewport position set to (${position.x}, ${position.y})`)
    }
  }, [trackMovement])
  
  /**
   * Reset viewport to default chunk position
   */
  const resetViewport = useCallback(() => {
    if (viewportDimensions.width && viewportDimensions.height) {
      // Reset to the same chunk we initialize to
      const targetChunkX = 0
      const targetChunkY = 0
      
      // Get the pixel coordinates of the target chunk's top-left corner
      const chunkPixelCoords = chunkToPixelCoords(targetChunkX, targetChunkY)
      
      // Calculate the center of the target chunk
      const chunkCenterX = chunkPixelCoords.x + (CHUNK_WIDTH / 2)
      const chunkCenterY = chunkPixelCoords.y + (CHUNK_HEIGHT / 2)
      
      // Calculate translation needed to center this chunk in the viewport
      const viewportCenterX = viewportDimensions.width / 2
      const viewportCenterY = viewportDimensions.height / 2
      
      // Translation = viewport center - chunk center
      const translateX = viewportCenterX - chunkCenterX
      const translateY = viewportCenterY - chunkCenterY
      
      setViewportPosition({ x: translateX, y: translateY })
    }
  }, [viewportDimensions, setViewportPosition])

  /**
   * Update position by delta amount (for trackpad/wheel navigation)
   */
  const updatePosition = useCallback((deltaX: number, deltaY: number) => {
    setTranslate(prev => {
      const newPosition = {
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }
      trackMovement(newPosition)
      return newPosition
    })
    
    if (DEBUG_LOGGING) {
      console.log(`🖱️ Position updated by delta (${deltaX}, ${deltaY})`)
    }
  }, [trackMovement])
  
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
    
    // Movement prediction
    velocity,
    movementPrediction,
    
    // Refs for components that need them
    containerRef,
  }
}
