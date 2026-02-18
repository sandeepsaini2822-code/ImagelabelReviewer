"use client"

import React from "react"

export default function InputField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  className = "",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <input
        type={type}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={
          "h-9 w-full rounded border px-3 text-sm outline-none " +
          "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 " +
          "disabled:bg-gray-100 disabled:text-gray-500 " +
          className
        }
      />
    </div>
  )
}
