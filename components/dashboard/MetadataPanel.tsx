// components/dashboard/MetadataPanel.tsx
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import YesNo from "@/components/common/YesNo"
import InputField from "@/components/common/InputField"
import BulletOptions from "@/components/common/BulletOptions"

type ImageItem = {
  key: string
  s3Key?: string
  imageUrl?: string
  farmer: string
  crop: string
  weatherLocation?: string

  createdAt: string
  plantingDate?: string

  pestDetected: boolean
  diseaseDetected: boolean
  isGoldStandard: boolean // Verified
  diseaseStage?: string

  pestName?: string
  pestStage?: string
  diseaseName?: string
  cropStage?: string
  remarks?: string
}

export default function MetadataPanel({
  current,
  index,
  total,
  nextCursor,

  editable,
  saving,

  updateField,
  saveChanges,

  goPrev,
  goNext,
  
  canUndo,     
  onUndo,
  hasLastVerified,
  copyFromLastVerified,
  onMarkVerified,
  showMoreHint = true,
}: {
  current: ImageItem | null
  index: number
  total: number
  nextCursor?: string | null

  editable: boolean
  saving: boolean

  updateField: <K extends keyof ImageItem>(field: K, value: ImageItem[K]) => void
  saveChanges: () => void
  canUndo: boolean
  onUndo: () => void
  goPrev: () => void
  goNext: () => void
  onMarkVerified: () => void
  hasLastVerified: boolean
  copyFromLastVerified: () => void

  showMoreHint?: boolean
}) {
  const disabled = saving
  const [copiedActive, setCopiedActive] = useState(false)
  const copiedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
    }
  }, [])
  // ✅ IMPORTANT: never return before hooks
  const item = current

  // ----- Options -----
  const CROP_STAGE_OPTIONS = ["Early", "Vegetative", "Reproductive", "Maturity"]
  const PEST_STAGE_OPTIONS = ["Egg", "Larva", "Pupa", "Adult"]
  const DISEASE_STAGE_OPTIONS = ["Early", "Moderate", "Severe"]

  const PEST_NAME_OPTIONS = ["", "Fall Armyworm", "Aphids", "Whitefly", "Thrips", "Stem Borer"]
  const DISEASE_NAME_OPTIONS = ["", "Leaf blight", "Rust", "Powdery mildew", "Bacterial wilt", "Leaf spot"]

  function toYMD(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  function parseDateSafe(value?: string) {
    if (!value) return null
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }

  function cropAgeDaysNumber(it: ImageItem | null) {
    if (!it) return 0
    const planting = parseDateSafe(it.plantingDate)
    const uploaded = parseDateSafe(it.createdAt)
    if (!planting || !uploaded) return 0

    const p = new Date(planting.getFullYear(), planting.getMonth(), planting.getDate())
    const u = new Date(uploaded.getFullYear(), uploaded.getMonth(), uploaded.getDate())
    const diffMs = u.getTime() - p.getTime()
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  function plantingDateFromAge(it: ImageItem | null, ageDays: number) {
    if (!it) return ""
    const uploaded = parseDateSafe(it.createdAt)
    if (!uploaded) return ""

    const u = new Date(uploaded.getFullYear(), uploaded.getMonth(), uploaded.getDate())
    u.setDate(u.getDate() - ageDays)
    return toYMD(u)
  }

  // ✅ keep crop-age input stable while typing
  const derivedAge = useMemo(
    () => String(cropAgeDaysNumber(item)),
    [item?.key, item?.createdAt, item?.plantingDate]
  )

  const [ageInput, setAgeInput] = useState<string>(derivedAge)

  useEffect(() => {
    setAgeInput(derivedAge)
  }, [derivedAge])

  // ---- UI ----
  if (!item) {
    return (
      <div className="lg:col-span-2 p-3 sm:p-4 text-gray-800 bg-gray-50 h-full flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading images…</div>
      </div>
    )
  }

  return (
    <div className="lg:col-span-2 p-3 sm:p-4 text-gray-800 bg-gray-50 h-full flex flex-col">
      {/* Header + buttons */}
      <div className="pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-black font-bold">Metadata</h2>

          <div className="flex flex-wrap gap-2">
            <div className="relative group">
              <button
                type="button"
                disabled={!hasLastVerified || saving}
                onClick={() => {
                  copyFromLastVerified()

                  // visible feedback
                  setCopiedActive(true)
                  if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
                  copiedTimerRef.current = window.setTimeout(() => setCopiedActive(false), 800)
                }}
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded text-sm",
                  "transition-transform duration-200",
                  "active:scale-95", // instant feedback
                  (!hasLastVerified || saving) ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-700",
                  copiedActive ? "bg-green-600 text-white scale-[1.05]" : "bg-zinc-900 text-white",
                ].join(" ")}

              >
                {/* Copy icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16h8M8 12h8m-6-8h6a2 2 0 012 2v12a2 2 0 01-2 2h-6l-4-4V6a2 2 0 012-2z"
                  />
                </svg>

                Same as previous?
              </button>

              {/* Optional fancy tooltip (can keep/remove) */}
              <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                <div className="bg-black text-white text-xs px-2 py-2 rounded shadow-lg">
                  Copy labels from last verified image
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={!canUndo || saving}
              onClick={() => {
                onUndo()
              }}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded text-sm",
                "transition-transform duration-200 active:scale-95",
                (!canUndo || saving) ? "opacity-50 cursor-not-allowed bg-zinc-200 text-zinc-600" : "bg-zinc-900 text-white hover:bg-zinc-700",
              ].join(" ")}
              title="Undo changes on this image"
            >
              {/* Undo icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h9a5 5 0 110 10h-1" />
              </svg>
              Undo
            </button>

          </div>
        </div>

        <div className="mt-1 text-xs text-gray-500">
          Image {Math.min(index + 1, total)} / {total}
          {showMoreHint && nextCursor && (
            <div className="text-xs text-gray-400 mt-0.5">More images available…</div>
          )}
        </div>
      </div>

      {/* Farmer | Crop | Location */}
      <div className="mt-1 px-3 py-1 bg-white border rounded text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><span className="font-semibold text-gray-900">Farmer:</span> {item.farmer || "-"}</span>
          <span className="text-gray-300">|</span>
          <span><span className="font-semibold text-gray-900">Crop:</span> {item.crop || "-"}</span>
          <span className="text-gray-300">|</span>
          <span><span className="font-semibold text-gray-900">Location:</span> {item.weatherLocation || "-"}</span>
        </div>
      </div>

      {/* Editable Panel (NOT collapsible) */}
      <div className="mt-3 border border-gray-200 rounded bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Crop + Crop age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Crop</label>
              <select
                disabled={disabled}
                value={item.crop ?? ""}
                onChange={(e) => updateField("crop", e.target.value)}
                className="h-9 w-full rounded border px-3 text-sm outline-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select crop</option>
                <option value="wheat">Wheat</option>
                <option value="rice">Rice</option>
                <option value="maize">Maize</option>
                <option value="tomato">Tomato</option>
                <option value="chili">Chilli</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Crop Age (Days)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                disabled={disabled}
                value={ageInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setAgeInput(raw)
                  const age = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0))
                  updateField("plantingDate", plantingDateFromAge(item, age))
                }}
                className="h-9 w-full rounded border px-3 text-sm outline-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="e.g., 12"
              />
            </div>
          </div>

          {/* Crop stage moved up */}
          <BulletOptions
            label="Crop Stage"
            disabled={disabled}
            value={item.cropStage ?? ""}
            options={CROP_STAGE_OPTIONS}
            onChange={(v) => updateField("cropStage", v)}
          />

          {/* Pest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <YesNo
              label="Pest Detected"
              value={!!item.pestDetected}
              disabled={disabled}
              onChange={(v) => {
                updateField("pestDetected", v)
                if (!v) {
                  updateField("pestName", "")
                  updateField("pestStage", "")
                }
              }}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Pest Name</label>
              <select
                disabled={disabled || !item.pestDetected}
                value={item.pestName ?? ""}
                onChange={(e) => updateField("pestName", e.target.value)}
                className="h-9 w-full rounded border px-3 text-sm outline-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {PEST_NAME_OPTIONS.map((p) => (
                  <option key={p || "__none__"} value={p}>
                    {p ? p : "Select pest"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Disease */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <YesNo
              label="Disease Detected"
              value={!!item.diseaseDetected}
              disabled={disabled}
              onChange={(v) => {
                updateField("diseaseDetected", v)
                if (!v) {
                  updateField("diseaseName", "")
                  updateField("diseaseStage", "")
                }
              }}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Disease Name</label>
              <select
                disabled={disabled || !item.diseaseDetected}
                value={item.diseaseName ?? ""}
                onChange={(e) => updateField("diseaseName", e.target.value)}
                className="h-9 w-full rounded border px-3 text-sm outline-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {DISEASE_NAME_OPTIONS.map((d) => (
                  <option key={d || "__none__"} value={d}>
                    {d ? d : "Select disease"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <BulletOptions
            label="Pest Stage"
            disabled={disabled || !item.pestDetected}
            value={item.pestStage ?? ""}
            options={PEST_STAGE_OPTIONS}
            onChange={(v) => updateField("pestStage", v)}
          />

          <BulletOptions
            label="Disease Stage"
            disabled={disabled || !item.diseaseDetected}
            value={item.diseaseStage ?? ""}
            options={DISEASE_STAGE_OPTIONS}
            onChange={(v) => updateField("diseaseStage", v)}
          />

          {/* Verified just above remarks */}
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              disabled={disabled}
              checked={!!item.isGoldStandard}
              onChange={(e) => {
                const checked = e.target.checked
                updateField("isGoldStandard", checked)
                if (checked) onMarkVerified()
              }}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <label className="text-sm text-gray-700">Verified</label>
          </div>

          <InputField
            label="Remarks"
            type="text"
            disabled={disabled}
            value={item.remarks ?? ""}
            onChange={(v) => updateField("remarks", v)}
            placeholder="Optional notes"
          />

          {/* Navigation */}
          <div className="flex justify-between pt-1">
            <button
              type="button"
              disabled={index === 0 || saving}
              onClick={goPrev}
              className="px-3 py-1 border rounded disabled:opacity-40 text-sm bg-white"
            >
              ◀ Prev (←)
            </button>

            <button
              type="button"
              disabled={(index >= total - 1 && !nextCursor) || saving}
              onClick={goNext}
              className="px-3 py-1 border rounded disabled:opacity-40 text-sm bg-white"
            >
              Next (→) ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}