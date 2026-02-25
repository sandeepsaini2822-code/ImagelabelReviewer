"use client"
import React from "react"

export default function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 sm:mb-3 border border-gray-200 rounded bg-white">
      {/* Header (non-clickable) */}
      <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold">
        {title}
      </div>

      {/* Always visible content */}
      <div className="px-2 sm:px-3 py-1.5 sm:py-2">
        {children}
      </div>
    </div>
  )
}