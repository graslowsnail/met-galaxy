/**
 * Grid Comparison Page
 * 
 * This page allows you to compare the original DraggableImageGrid 
 * with the new DraggableImageGridV2 (column carry-over) implementation.
 */

"use client"

import React, { useState } from 'react'
import { DraggableImageGrid } from '@/components/draggable-image-grid'
import { DraggableImageGridV2 } from '@/components/draggable-image-grid-v2'

type GridVersion = 'v1' | 'v2'

export default function GridComparisonPage() {
  const [activeVersion, setActiveVersion] = useState<GridVersion>('v2')
  
  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header with version switcher */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Grid Implementation Comparison
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Compare the original chunked grid vs the new column carry-over implementation
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveVersion('v1')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeVersion === 'v1'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Original (Fixed Chunks)
            </button>
            <button
              onClick={() => setActiveVersion('v2')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeVersion === 'v2'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              V2 (Column Carry-Over)
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            Current: <span className="font-medium">
              {activeVersion === 'v1' ? 'Original Grid' : 'Column Carry-Over Grid'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Implementation details */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl">
          {activeVersion === 'v1' ? (
            <div className="text-sm text-gray-700">
              <span className="font-medium text-red-600">⚠️ Original Implementation:</span>{' '}
              Uses fixed-height chunk containers ({1600}px). May show horizontal gaps between chunks when content height varies.
              Each chunk calculates its own masonry layout independently.
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <span className="font-medium text-green-600">✨ Column Carry-Over Implementation:</span>{' '}
              Treats the world as a continuous plane with column heights that carry over between chunks per vertical strip.
              Eliminates horizontal gaps by positioning tiles at absolute world coordinates.
            </div>
          )}
        </div>
      </div>
      
      {/* Grid container */}
      <div className="flex-1 relative">
        {activeVersion === 'v1' ? (
          <DraggableImageGrid />
        ) : (
          <DraggableImageGridV2
            onArtworkClick={(image) => {
              console.log('Artwork clicked in V2:', image)
              // You can implement similarity view or other actions here
            }}
            showPerformanceOverlay={true}
            showLoadingIndicators={true}
          />
        )}
      </div>
      
      {/* Instructions overlay */}
      <div className="absolute bottom-4 right-4 bg-black/75 text-white p-4 rounded-lg text-sm max-w-sm">
        <h3 className="font-medium mb-2">How to Test:</h3>
        <ul className="space-y-1 text-xs">
          <li>• Drag to pan around the infinite canvas</li>
          <li>• Look for horizontal gaps between chunks (V1 issue)</li>
          <li>• Notice performance overlay differences</li>
          <li>• Switch between versions to compare</li>
          <li>• Check smooth panning and loading behavior</li>
        </ul>
      </div>
    </div>
  )
}
