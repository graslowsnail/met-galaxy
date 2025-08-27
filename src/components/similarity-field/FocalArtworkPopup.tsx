"use client"

import { X } from "lucide-react"

interface FocalArtworkPopupProps {
  artwork: {
    title: string | null
    artist: string | null
    dateDisplay?: string | null
    medium?: string | null
    dimensions?: string | null
    creditLine?: string | null
    accessionNumber?: string | null
    department?: string | null
    classification?: string | null
    culture?: string | null
    period?: string | null
    dynasty?: string | null
  }
  isOpen: boolean
  onClose: () => void
}

export function FocalArtworkPopup({ artwork, isOpen, onClose }: FocalArtworkPopupProps) {
  const formatField = (label: string, value: string | null | undefined) => {
    if (!value || value.trim() === '') return null
    return (
      <div key={label}>
        <span className="text-gray-500 text-sm">{label}:</span>
        <span className="text-gray-700 text-sm ml-2">{value}</span>
      </div>
    )
  }

  const fields = [
    formatField("Artist", artwork.artist),
    formatField("Date", artwork.dateDisplay),
    formatField("Medium", artwork.medium),
    formatField("Dimensions", artwork.dimensions),
    formatField("Classification", artwork.classification),
    formatField("Department", artwork.department),
    formatField("Culture", artwork.culture),
    formatField("Period", artwork.period),
    formatField("Dynasty", artwork.dynasty),
    formatField("Credit Line", artwork.creditLine),
    formatField("Accession Number", artwork.accessionNumber),
  ].filter(Boolean)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-white/85 backdrop-blur-sm rounded-2xl p-6 shadow-xl shadow-black/25 animate-in fade-in-0 zoom-in-95 duration-300 border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Main Content */}
          <div className="text-gray-700 space-y-4">
            {/* Artwork Title */}
            {artwork.title && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 leading-tight">
                  {artwork.title}
                </h3>
              </div>
            )}

            {/* Artwork Details */}
            {fields.length > 0 && (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={index} className="flex flex-wrap">
                    {field}
                  </div>
                ))}
              </div>
            )}

            {fields.length === 0 && !artwork.title && (
              <p className="text-gray-500 text-sm italic">
                No additional information available for this artwork.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}