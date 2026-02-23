"use client"
import React from "react"

export default function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1 sm:mb-2">
      <div className="text-xs font-medium text-gray-600">{label}</div>
      <div className="border rounded px-2 py-1 text-xs sm:text-sm bg-gray-100 wrap-break-word">
        {value}
      </div>
    </div>
  )
}