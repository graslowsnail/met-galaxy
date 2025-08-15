"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"

interface ImageItem {
  id: string
  src: string
  width: number
  height: number
  aspectRatio: number
  gridX: number // Added grid coordinates for omnidirectional layout
  gridY: number
}

const COLUMN_WIDTH = 280
const GAP = 16

// Generate random botanical/vintage style images
const generateImageData = (startIndex: number, count: number, gridX = 0, gridY = 0): ImageItem[] => {
  const queries = [
    "vintage botanical illustration",
    "antique scientific drawing",
    "old botanical print",
    "vintage nature illustration",
    "historical botanical art",
    "antique plant drawing",
    "vintage scientific diagram",
    "old natural history illustration",
    "botanical vintage print",
    "antique nature study",
  ]

  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i
    const aspectRatios = [0.7, 0.8, 1.0, 1.2, 1.4, 0.6, 1.6] // Mix of portrait, square, landscape
    const aspectRatio = aspectRatios[index % aspectRatios.length]
    const width = COLUMN_WIDTH
    const height = Math.round(width / aspectRatio)
    const query = queries[index % queries.length]

    return {
      id: `image-${index}-${gridX}-${gridY}`,
      src: `/placeholder.svg?height=${height}&width=${width}&query=${encodeURIComponent(query)}`,
      width,
      height,
      aspectRatio,
      gridX, // Store grid position for omnidirectional layout
      gridY,
    }
  })
}

export function DraggableImageGrid() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [columns, setColumns] = useState(4)
  const [loadedSections, setLoadedSections] = useState(new Set<string>()) // Track loaded grid sections
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 }) // Added viewport dimensions state for visibility calculations

  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const imageCount = useRef(0)

  // Calculate number of columns based on container width
  const updateColumns = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      const newColumns = Math.max(2, Math.floor((containerWidth + GAP) / (COLUMN_WIDTH + GAP)))
      setColumns(newColumns)
      setViewportDimensions({ width: containerWidth, height: containerHeight })
    }
  }, [])

  // Load initial images
  useEffect(() => {
    const initialImages = generateImageData(0, 20, 0, 0)
    setImages(initialImages)
    imageCount.current = 20
    setLoadedSections(new Set(["0,0"])) // Track initial section
  }, [])

  // Handle window resize
  useEffect(() => {
    updateColumns()
    const handleResize = () => updateColumns()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateColumns])

  const loadMoreImages = useCallback(
    (direction: "top" | "bottom" | "left" | "right") => {
      if (loading) return

      setLoading(true)
      setTimeout(() => {
        // Calculate which grid section to load based on current view
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (!containerRect) return

        const viewCenterX = -translate.x + containerRect.width / 2
        const viewCenterY = -translate.y + containerRect.height / 2

        const gridWidth = columns * (COLUMN_WIDTH + GAP)
        const gridHeight = 1000 // Approximate section height

        let gridX = Math.floor(viewCenterX / gridWidth)
        let gridY = Math.floor(viewCenterY / gridHeight)

        // Adjust grid coordinates based on direction
        switch (direction) {
          case "top":
            gridY -= 1
            break
          case "bottom":
            gridY += 1
            break
          case "left":
            gridX -= 1
            break
          case "right":
            gridX += 1
            break
        }

        const sectionKey = `${gridX},${gridY}`
        if (loadedSections.has(sectionKey)) {
          setLoading(false)
          return
        }

        const newImages = generateImageData(imageCount.current, 15, gridX, gridY)
        setImages((prev) => [...prev, ...newImages])
        setLoadedSections((prev) => new Set([...prev, sectionKey]))
        imageCount.current += 15
        setLoading(false)
      }, 300)
    },
    [loading, translate, columns, loadedSections],
  )

  const calculateLayout = useCallback(() => {
    const sectionLayouts = new Map<string, { columnHeights: number[]; baseY: number; baseX: number }>()
    const positions: Array<{ x: number; y: number }> = []

    // Group images by grid section
    const imagesBySection = new Map<string, ImageItem[]>()
    images.forEach((image) => {
      const sectionKey = `${image.gridX},${image.gridY}`
      if (!imagesBySection.has(sectionKey)) {
        imagesBySection.set(sectionKey, [])
      }
      imagesBySection.get(sectionKey)!.push(image)
    })

    // Calculate layout for each section
    imagesBySection.forEach((sectionImages, sectionKey) => {
      const [gridX, gridY] = sectionKey.split(",").map(Number)
      const baseX = gridX * columns * (COLUMN_WIDTH + GAP)
      const baseY = gridY * 1000 // Section height

      const columnHeights = new Array(columns).fill(0)

      sectionImages.forEach((image) => {
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
        const x = baseX + shortestColumnIndex * (COLUMN_WIDTH + GAP)
        const y = baseY + columnHeights[shortestColumnIndex]

        positions.push({ x, y })
        columnHeights[shortestColumnIndex] += image.height + GAP
      })

      sectionLayouts.set(sectionKey, { columnHeights, baseY, baseX })
    })

    return { positions }
  }, [images, columns])

  const { positions } = calculateLayout()

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const newTranslate = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }

      setTranslate(newTranslate)
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({ x: touch.clientX - translate.x, y: touch.clientY - translate.y })
  }

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return
      e.preventDefault()

      const touch = e.touches[0]
      const newTranslate = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      }

      setTranslate(newTranslate)
    },
    [isDragging, dragStart],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const checkScroll = () => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const threshold = 800 // Distance from edge to trigger loading

      // Check all four directions
      const viewLeft = -translate.x
      const viewRight = -translate.x + containerRect.width
      const viewTop = -translate.y
      const viewBottom = -translate.y + containerRect.height

      // Find the bounds of current images
      let minX = Number.POSITIVE_INFINITY,
        maxX = Number.NEGATIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY
      positions.forEach((pos) => {
        minX = Math.min(minX, pos.x)
        maxX = Math.max(maxX, pos.x + COLUMN_WIDTH)
        minY = Math.min(minY, pos.y)
        maxY = Math.max(maxY, pos.y + 400) // Approximate image height
      })

      // Load more content when approaching edges
      if (viewLeft < minX + threshold) {
        loadMoreImages("left")
      }
      if (viewRight > maxX - threshold) {
        loadMoreImages("right")
      }
      if (viewTop < minY + threshold) {
        loadMoreImages("top")
      }
      if (viewBottom > maxY - threshold) {
        loadMoreImages("bottom")
      }
    }

    const scrollTimer = setInterval(checkScroll, 200)
    return () => clearInterval(scrollTimer)
  }, [translate, positions, loadMoreImages])

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

  const isImageVisible = useCallback(
    (position: { x: number; y: number }, imageHeight: number) => {
      if (!viewportDimensions.width || !viewportDimensions.height) return true

      const buffer = 500 // Buffer zone around viewport
      const viewLeft = -translate.x - buffer
      const viewRight = -translate.x + viewportDimensions.width + buffer
      const viewTop = -translate.y - buffer
      const viewBottom = -translate.y + viewportDimensions.height + buffer

      const imageLeft = position.x
      const imageRight = position.x + COLUMN_WIDTH
      const imageTop = position.y
      const imageBottom = position.y + imageHeight

      // Check if image intersects with visible area + buffer
      return !(imageRight < viewLeft || imageLeft > viewRight || imageBottom < viewTop || imageTop > viewBottom)
    },
    [translate, viewportDimensions],
  )

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden bg-neutral-50 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        ref={gridRef}
        className="relative transition-transform duration-75"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px)`,
        }}
      >
        {images.map((image, index) => {
          const position = positions[index]
          if (!position) return null

          if (!isImageVisible(position, image.height)) {
            return null
          }

          return (
            <div
              key={image.id}
              className="absolute bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-200 hover:shadow-md transition-shadow duration-200"
              style={{
                left: position.x,
                top: position.y,
                width: image.width,
                height: image.height,
              }}
            >
              <img
                src={image.src || "/placeholder.svg"}
                alt={`Vintage botanical illustration ${index + 1}`}
                className="w-full h-full object-cover pointer-events-none select-none"
                draggable={false}
              />
            </div>
          )
        })}

        {loading && (
          <div
            className="fixed top-4 right-4 z-10"
            style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
          >
            <div className="bg-white rounded-full px-4 py-2 shadow-lg border border-neutral-200">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                Loading more images...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
