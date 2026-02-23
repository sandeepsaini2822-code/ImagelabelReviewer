"use client"
import React from "react"

export default function YesNo({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  disabled: boolean
}) {
  return (
    <div className="mb-1 sm:mb-2">
      <div className="text-xs font-medium text-gray-600">{label}</div>

      <div className="flex gap-1 mt-1 flex-wrap">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={`whitespace-nowrap min-w-14 px-2 py-1 sm:px-3 text-xs sm:text-sm rounded border ${
            value ? "bg-green-600 text-white" : "bg-white"
          } disabled:opacity-50`}
        >
          Yes
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={`whitespace-nowrap min-w-14 px-2 py-1 sm:px-3 text-xs sm:text-sm rounded border ${
            !value ? "bg-red-600 text-white" : "bg-white"
          } disabled:opacity-50`}
        >
          No
        </button>
      </div>
    </div>
  )
}