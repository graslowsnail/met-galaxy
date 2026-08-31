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
  COLUMN_WIDTH,
  DESKTOP_GRID_SCALE,
  GLIDE_FRICTION,
  GLIDE_MIN_START_SPEED,
  GLIDE_MIN_STOP_SPEED,
  GLIDE_MAX_SPEED,
  GLIDE_VELOCITY_WINDOW,
  GLIDE_MAX_FRAME_DELTA
} from '../utils/constants'

/** Reference frame duration used to keep glide friction display-rate independent */
const GLIDE_REFERENCE_FRAME_MS = 1000 / 60

/**
 * Custom hook for viewport and drag management
 * 
 * Features:
 * - Mouse, pen, and touch drag handling
 * - Viewport dimension tracking
 * - Coordinate transformation utilities
 * - Smooth drag performance with optimized updates
 * - Post-drag update callbacks
 */
export function useViewport(mobileScale = DESKTOP_GRID_SCALE): UseViewportReturn {
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
  
  /** RAF ID for throttled drag updates */
  const rafId = useRef<number | undefined>(undefined)

  const activePointerId = useRef<number | null>(null)
  const pointerCaptureTarget = useRef<Element | null>(null)
  const dragStartRef = useRef<Position>({ x: 0, y: 0 })
  const initialPointerPosition = useRef<Position>({ x: 0, y: 0 })
  const pendingTranslate = useRef<Position | null>(null)

  /** Always-current translate, so pointer and glide math never read a stale render */
  const translateRef = useRef<Position>({ x: 0, y: 0 })

  /** Recent pointer positions used to measure release velocity */
  const pointerSamples = useRef<Array<{ x: number; y: number; t: number }>>([])

  /** Glide (post-drag momentum) state */
  const glideRafId = useRef<number | null>(null)
  const glideVelocity = useRef<Position>({ x: 0, y: 0 })
  const glideLastFrameTime = useRef(0)
  const isGlidingRef = useRef(false)

  /** Set when a pointer down interrupts a glide, so that tap doesn't also open an artwork */
  const suppressClickRef = useRef(false)
  
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
   * Commit a new translation, keeping the ref mirror in sync
   */
  const applyTranslate = useCallback((next: Position) => {
    translateRef.current = next
    setTranslate(next)
  }, [])

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
      const scale = isMobile ? mobileScale : DESKTOP_GRID_SCALE
      
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
      const translateX = viewportCenterX - chunkCenterX * scale
      const translateY = viewportCenterY - chunkCenterY * scale
      
      applyTranslate({ x: translateX, y: translateY })
      setIsInitialized(true)
    }
  }, [viewportDimensions, isInitialized, mobileScale, applyTranslate])
  
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
  // DRAG HANDLING
  // ============================================================================

  /** trackMovement changes identity every frame; the glide loop reads it through a ref */
  const trackMovementRef = useRef(trackMovement)
  trackMovementRef.current = trackMovement

  const schedulePostDragCallbacks = useCallback(() => {
    setTimeout(() => {
      postDragCallbacks.current.forEach(callback => callback())
    }, POST_DRAG_UPDATE_DELAY)
  }, [])

  /**
   * Cancel an in-flight glide. Does not run post-drag callbacks - the caller
   * either starts a new gesture or moves the viewport itself.
   */
  const stopGlide = useCallback(() => {
    if (glideRafId.current !== null) {
      cancelAnimationFrame(glideRafId.current)
      glideRafId.current = null
    }
    isGlidingRef.current = false
  }, [])

  /**
   * Measure the pointer velocity (px/s) over the last GLIDE_VELOCITY_WINDOW ms.
   * Returns zero when the pointer was resting before release, so holding still
   * before lifting stops the viewport instead of flinging it.
   */
  const readReleaseVelocity = useCallback((now: number): Position => {
    const samples = pointerSamples.current
    const last = samples[samples.length - 1]
    if (!last || now - last.t > GLIDE_VELOCITY_WINDOW) return { x: 0, y: 0 }

    let first = last
    for (let i = samples.length - 2; i >= 0; i--) {
      const sample = samples[i]!
      if (last.t - sample.t > GLIDE_VELOCITY_WINDOW) break
      first = sample
    }

    const elapsed = last.t - first.t
    if (elapsed <= 0) return { x: 0, y: 0 }

    return {
      x: ((last.x - first.x) / elapsed) * 1000,
      y: ((last.y - first.y) / elapsed) * 1000,
    }
  }, [])

  /**
   * Continue panning after release, decaying the release velocity by
   * GLIDE_FRICTION per reference frame until it falls below GLIDE_MIN_STOP_SPEED.
   */
  const startGlide = useCallback((velocity: Position): boolean => {
    const speed = Math.hypot(velocity.x, velocity.y)
    if (speed < GLIDE_MIN_START_SPEED) return false

    const clamp = speed > GLIDE_MAX_SPEED ? GLIDE_MAX_SPEED / speed : 1
    glideVelocity.current = { x: velocity.x * clamp, y: velocity.y * clamp }
    glideLastFrameTime.current = performance.now()
    isGlidingRef.current = true

    const step = () => {
      const now = performance.now()
      const elapsed = Math.min(now - glideLastFrameTime.current, GLIDE_MAX_FRAME_DELTA)
      glideLastFrameTime.current = now

      const current = glideVelocity.current
      const next = {
        x: translateRef.current.x + (current.x * elapsed) / 1000,
        y: translateRef.current.y + (current.y * elapsed) / 1000,
      }
      applyTranslate(next)
      trackMovementRef.current(next)

      const retained = Math.pow(GLIDE_FRICTION, elapsed / GLIDE_REFERENCE_FRAME_MS)
      glideVelocity.current = { x: current.x * retained, y: current.y * retained }

      if (Math.hypot(glideVelocity.current.x, glideVelocity.current.y) < GLIDE_MIN_STOP_SPEED) {
        glideRafId.current = null
        isGlidingRef.current = false
        schedulePostDragCallbacks()
        return
      }

      glideRafId.current = requestAnimationFrame(step)
    }

    glideRafId.current = requestAnimationFrame(step)
    return true
  }, [applyTranslate, schedulePostDragCallbacks])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || activePointerId.current !== null) return
    if (e.pointerType === 'mouse' && e.button !== 0) return

    // A press during a glide catches the viewport rather than activating artwork
    suppressClickRef.current = isGlidingRef.current
    stopGlide()

    activePointerId.current = e.pointerId
    pointerCaptureTarget.current = e.target as Element
    pointerCaptureTarget.current.setPointerCapture(e.pointerId)

    const start = {
      x: e.clientX - translateRef.current.x,
      y: e.clientY - translateRef.current.y,
    }

    dragStartRef.current = start
    initialPointerPosition.current = { x: e.clientX, y: e.clientY }
    pendingTranslate.current = null
    pointerSamples.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }]
    setIsDragging(true)
    setDragStart(start)
    setDragDistance(0)

    if (DEBUG_LOGGING) {
      console.log(`Pointer drag started at (${e.clientX}, ${e.clientY})`)
    }
  }, [stopGlide])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return

    const initial = initialPointerPosition.current
    const distance = Math.hypot(
      e.clientX - initial.x,
      e.clientY - initial.y,
    )
    setDragDistance(distance)

    const now = performance.now()
    const samples = pointerSamples.current
    samples.push({ x: e.clientX, y: e.clientY, t: now })
    while (samples.length > 2 && now - samples[0]!.t > GLIDE_VELOCITY_WINDOW) {
      samples.shift()
    }

    const start = dragStartRef.current
    pendingTranslate.current = {
      x: e.clientX - start.x,
      y: e.clientY - start.y,
    }

    if (rafId.current === undefined) {
      rafId.current = requestAnimationFrame(() => {
        const nextTranslate = pendingTranslate.current
        if (nextTranslate) {
          applyTranslate(nextTranslate)
          trackMovement(nextTranslate)
        }
        rafId.current = undefined
      })
    }
  }, [applyTranslate, trackMovement])

  const finishPointerDrag = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    allowGlide: boolean,
  ) => {
    if (e.pointerId !== activePointerId.current) return

    if (rafId.current !== undefined) {
      cancelAnimationFrame(rafId.current)
      rafId.current = undefined
    }

    const finalTranslate = pendingTranslate.current
    if (finalTranslate) {
      applyTranslate(finalTranslate)
      trackMovement(finalTranslate)
    }

    const captureTarget = pointerCaptureTarget.current
    if (captureTarget?.hasPointerCapture(e.pointerId)) {
      captureTarget.releasePointerCapture(e.pointerId)
    }

    activePointerId.current = null
    pointerCaptureTarget.current = null
    pendingTranslate.current = null
    setIsDragging(false)

    const glided = allowGlide && startGlide(readReleaseVelocity(performance.now()))
    pointerSamples.current = []

    if (DEBUG_LOGGING) {
      console.log(glided ? 'Pointer drag ended, gliding' : 'Pointer drag ended')
    }

    // A glide runs the post-drag callbacks once it settles
    if (!glided) {
      schedulePostDragCallbacks()
    }
  }, [applyTranslate, trackMovement, startGlide, readReleaseVelocity, schedulePostDragCallbacks])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    finishPointerDrag(e, true)
  }, [finishPointerDrag])

  /** A cancelled gesture was interrupted rather than released, so it never glides */
  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    finishPointerDrag(e, false)
  }, [finishPointerDrag])

  /**
   * Swallow the click produced by the press that caught a glide, so grabbing a
   * moving grid never opens the artwork under the finger.
   */
  const handleClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    e.stopPropagation()
    e.preventDefault()
  }, [])

  useEffect(() => {
    return () => {
      if (rafId.current !== undefined) cancelAnimationFrame(rafId.current)
      if (glideRafId.current !== null) cancelAnimationFrame(glideRafId.current)
    }
  }, [])
  
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
    const scale = viewportDimensions.width < 768 ? mobileScale : DESKTOP_GRID_SCALE

    return {
      width: viewportDimensions.width / scale,
      height: viewportDimensions.height / scale,
      translateX: translate.x / scale,
      translateY: translate.y / scale,
    }
  }, [viewportDimensions, translate, mobileScale])
  
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
    stopGlide()
    applyTranslate(position)
    trackMovement(position)
    
    if (DEBUG_LOGGING) {
      console.log(`📍 Viewport position set to (${position.x}, ${position.y})`)
    }
  }, [stopGlide, applyTranslate, trackMovement])
  
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
    stopGlide()

    const newPosition = {
      x: translateRef.current.x + deltaX,
      y: translateRef.current.y + deltaY
    }
    applyTranslate(newPosition)
    trackMovement(newPosition)
    
    if (DEBUG_LOGGING) {
      console.log(`🖱️ Position updated by delta (${deltaX}, ${deltaY})`)
    }
  }, [stopGlide, applyTranslate, trackMovement])
  
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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClickCapture,
    
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
