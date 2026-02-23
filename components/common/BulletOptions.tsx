"use client"
import React from "react"

export default function BulletOptions({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  disabled?: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="mt-2 sm:mt-3">
      <div className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
        {label}
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm ${
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name={label}
              checked={value === opt}
              disabled={disabled}
              onChange={() => onChange(opt)}
              className="
                w-4 h-4 cursor-pointer
                accent-green-600
                disabled:cursor-not-allowed
                disabled:opacity-100
              "
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}