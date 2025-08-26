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
  const formatField = (label: string, value: string | null) => {
    if (!value || value.trim() === '') return null
    return (
      <div key={label}>
        <span className="text-white/70 text-sm">{label}:</span>
        <span className="text-white/90 text-sm ml-2">{value}</span>
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
          className="w-full max-w-md bg-[#26252480] backdrop-blur-sm rounded-2xl p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300"
          style={{ backgroundColor: "#26252480" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Main Content */}
          <div className="text-white/90 space-y-4">
            {/* Artwork Title */}
            {artwork.title && (
              <div>
                <h3 className="text-lg font-medium text-white/95 leading-tight">
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
              <p className="text-white/70 text-sm italic">
                No additional information available for this artwork.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}