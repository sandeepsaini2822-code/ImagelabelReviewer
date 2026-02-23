//components\dashboard\ImageCanvas.tsx
"use client"

import React from "react"
import { AnimatePresence, motion } from "framer-motion"

type ImageItem = {
  key: string
  imageUrl?: string
  farmer: string
  crop: string
  weatherLocation?: string
  createdAt: string
  pestDetected: boolean
  diseaseDetected: boolean
  isGoldStandard: boolean
  pestName?: string
  pestStage?: string
  diseaseName?: string
  cropStage?: string
  remarks?: string
}

export default function ImageCanvas({
  current,
  direction,
  zoomPercent,
  zoom,
  pan,
  dragActive,
  imageLoading,

  zoomIn,
  zoomOut,
  resetView,

  onWheelZoom,
  onPointerDown,
  onPointerMove,
  onPointerUp,

  goPrev,
  goNext,
  canPrev,
  canNext,
}: {
  current: ImageItem | null
  direction: 1 | -1

  zoomPercent: number
  zoom: number
  pan: { x: number; y: number }
  dragActive: boolean
  imageLoading: boolean
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void

  onWheelZoom: (e: React.WheelEvent<HTMLDivElement>) => void
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: () => void

  goPrev: () => void
  goNext: () => void
  canPrev: boolean
  canNext: boolean
}) {
  if (!current) {
    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center text-white/70">
        No image selected
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-0 relative">
      {/* Zoom UI */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={zoomOut}
          className="bg-white/10 text-white px-3 py-2 rounded border border-white/20"
        >
          −
        </button>

        <button
          type="button"
          onClick={resetView}
          className="bg-white/10 text-white px-3 py-2 rounded border border-white/20"
        >
          Reset ({zoomPercent}%)
        </button>

        <button
          type="button"
          onClick={zoomIn}
          className="bg-white/10 text-white px-3 py-2 rounded border border-white/20"
        >
          +
        </button>
      </div>

      {/* Crop overlay (top-right) */}
      {current.crop && (
        <div className="absolute top-5 right-4 z-10 bg-black/60 backdrop-blur text-white px-3 py-1 rounded text-sm font-semibold">
          {current.crop}
        </div>
      )}

      {/* Drag hint */}
      <div className="absolute bottom-6 left-3 z-10 text-white/70 text-xs">
        Drag to pan • Wheel to zoom • ←/→ navigate • E edit • S save
      </div>

      {/* Image viewport (fills parent) */}
      <div
        className="w-full h-full min-h-0 flex items-center justify-center overflow-hidden relative group"
        onWheel={onWheelZoom}
        style={{ touchAction: "none" }}
      >
        {/* Loading overlay */}
        {imageLoading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm z-20">
            Loading image…
          </div>
        )}

        {/* Side Navigation Buttons (show on hover) */}
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev || imageLoading}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20
             bg-black/40 hover:bg-black/60 text-white
             w-12 h-12 rounded-full flex items-center justify-center
             border border-white/20 disabled:opacity-30
             opacity-0 group-hover:opacity-100
             transition-all duration-200"
          aria-label="Previous image"
          title="Previous (←)"
        >
          ◀
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={!canNext || imageLoading}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20
             bg-black/40 hover:bg-black/60 text-white
             w-12 h-12 rounded-full flex items-center justify-center
             border border-white/20 disabled:opacity-30
             opacity-0 group-hover:opacity-100
             transition-all duration-200"
          aria-label="Next image"
          title="Next (→)"
        >
          ▶
        </button>

        <div
          className="select-none z-10 w-full h-full min-h-0 relative"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={(e) => {
            if (dragActive) return

            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const x = e.clientX - rect.left
            const isLeftHalf = x < rect.width / 2

            if (isLeftHalf) {
              if (canPrev && !imageLoading) goPrev()
            } else {
              if (canNext && !imageLoading) goNext()
            }
          }}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
            cursor: dragActive ? "grabbing" : "grab",
          }}
        >
          <AnimatePresence mode="sync">
            {current.imageUrl && (
              <motion.div
                key={current.key}
                initial={{ x: direction === 1 ? 120 : -120, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction === 1 ? -120 : 120, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <img
                  src={current.imageUrl}
                  alt="crop"
                  loading="eager"
                  decoding="async"
                  className="max-h-full max-w-full object-contain pointer-events-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}