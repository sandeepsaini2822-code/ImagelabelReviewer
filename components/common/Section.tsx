"use client"
import React, { useState } from "react"

export default function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-3 border border-gray-200 rounded bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-3 py-2 text-sm font-semibold"
      >
        {title}
        <span className="text-gray-500">{open ? "▾" : "▸"}</span>
      </button>

      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  )
}
