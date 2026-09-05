import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

const ArtworkImage = memo(function ArtworkImage({
  src,
  alt,
  width,
  height,
  className = 'h-full w-full object-cover object-center',
  style,
  loading = 'lazy',
  onLoad,
  onError,
}: {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  style?: CSSProperties
  loading?: 'eager' | 'lazy'
  onLoad?: () => void
  onError?: () => void
}) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const loaded = loadedSrc === src
  const failed = failedSrc === src

  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) {
      setLoadedSrc(src)
      onLoad?.()
    }
  }, [src, onLoad])

  return (
    <>
      {!loaded && (
        <div
          aria-hidden={!failed}
          style={{ borderRadius: 'inherit' }}
          className={`pointer-events-none absolute inset-0 ${failed ? 'flex items-center justify-center bg-gray-100 text-xs text-gray-400' : 'gallery-skeleton'}`}
        >
          {failed ? 'Image unavailable' : null}
        </div>
      )}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`relative ${className} pointer-events-none select-none transition-opacity duration-200 motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={style}
        draggable={false}
        loading={loading}
        decoding="async"
        onLoad={() => { setLoadedSrc(src); onLoad?.() }}
        onError={() => { setFailedSrc(src); onError?.() }}
      />
    </>
  )
})

export default ArtworkImage
