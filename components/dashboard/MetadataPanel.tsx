//components\dashboard\MetadataPanel.tsx
"use client"

import React from "react"
import Section from "@/components/common/Section"
import YesNo from "@/components/common/YesNo"
import InputField from "@/components/common/InputField"
import BulletOptions from "@/components/common/BulletOptions"
import ReadOnly from "@/components/common/ReadOnly"


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
  isGoldStandard: boolean

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
  setEditable,

  updateField,
  saveChanges,

  goPrev,
  goNext,

  // Optional: pass these if you want exact same keyboard hints / disable logic
  showMoreHint = true,
}: {
  current: ImageItem | null
  index: number
  total: number
  nextCursor?: string | null

  editable: boolean
  saving: boolean
  setEditable: (v: boolean) => void

  updateField: (field: keyof ImageItem, value: any) => void
  saveChanges: () => void

  goPrev: () => void
  goNext: () => void

  showMoreHint?: boolean
}) {
  const disabled = !editable || saving
  if (!current) {
    return (
      <div className="lg:col-span-2 p-4 text-gray-800 bg-gray-50 h-full flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading images…</div>
      </div>
    )
  }


  // Options (edit these to match your exact enums)
  const CROP_STAGE_OPTIONS = ["Early", "Vegetative", "Reproductive", "Maturity"]
  const PEST_STAGE_OPTIONS = ["Egg", "Larva", "Pupa", "Adult"]

  return (
    <div className="lg:col-span-2 p-4 text-gray-800 bg-gray-50 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-50 pb-3">
        <div className="flex justify-between items-center">
          <h2 className="text-black font-bold">Metadata</h2>

          {!editable ? (
            <button
              type="button"
              onClick={() => setEditable(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
            >
              Edit (E)
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditable(false)}
                className="px-3 py-2 bg-gray-600 text-white rounded text-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveChanges}
                className="px-3 py-2 bg-green-600 text-white rounded text-sm"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save (S)"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-1 text-xs text-gray-500">
          Image {Math.min(index + 1, total)} / {total}
          {showMoreHint && nextCursor && (
            <div className="text-xs text-gray-400 mb-1">More images available…</div>
          )}
        </div>
      </div>

      {/* Farmer | Crop | Location - Inline Header */}
      <div className="mt-1 px-3 py-1 bg-white border rounded text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            <span className="font-semibold text-gray-900">Farmer:</span>{" "}
            {current.farmer || "-"}
          </span>

          <span className="text-gray-300">|</span>

          <span>
            <span className="font-semibold text-gray-900">Crop:</span>{" "}
            {current.crop || "-"}
          </span>

          <span className="text-gray-300">|</span>

          <span>
            <span className="font-semibold text-gray-900">Location:</span>{" "}
            {current.weatherLocation || "-"}
          </span>
        </div>
      </div>


      {/* EDITABLE */}
      <Section title="Editable" defaultOpen={true}>

        <div className="flex flex-col h-full justify-between gap-1.5">

          <div className="w-52 mb-1 mt-0.5"> {/* ✅ small width (adjust: w-44 / w-56) */}
            <InputField
              label="Planting Date"
              type="date"
              disabled={disabled}
              value={current.plantingDate ?? ""}
              onChange={(v) => updateField("plantingDate", v ?? "")}
            />
          </div>



          <div className="grid grid-cols-3 gap-2">
            <YesNo
              label="Pest Detected"
              value={!!current.pestDetected}
              disabled={disabled}
              onChange={(v) => {
                updateField("pestDetected", v)

                if (!v) {
                  // ✅ clear & save as empty when pest = No
                  updateField("pestName", "")
                  updateField("pestStage", "")
                }
              }}
            />

            <YesNo
              label="Disease Detected"
              value={!!current.diseaseDetected}
              disabled={disabled}
              onChange={(v) => {
                updateField("diseaseDetected", v)

                if (!v) {
                  // ✅ clear & save as empty when disease = No
                  updateField("diseaseName", "")
                }
              }}
            />

            <YesNo
              label="Gold Standard"
              value={!!current.isGoldStandard}
              disabled={disabled}
              onChange={(v) => updateField("isGoldStandard", v)}
            />
          </div>



          {/* Crop Stage (always visible) */}
          <BulletOptions
            label="Crop Stage"
            disabled={disabled}
            value={current.cropStage ?? ""}
            options={CROP_STAGE_OPTIONS}
            onChange={(v) => updateField("cropStage", v)}
          />

          {/* Pest Stage (always visible, but locked when pestDetected = false) */}
          <BulletOptions
            label="Pest Stage"
            disabled={disabled || !current.pestDetected}   // ✅ locked if pestDetected = false
            value={current.pestStage ?? ""}
            options={PEST_STAGE_OPTIONS}
            onChange={(v) => updateField("pestStage", v)}
          />

          <div className="mt-4">
            <InputField
              label="Pest Name"
              type="text"
              disabled={disabled || !current.pestDetected} // ✅ locked if pestDetected = false
              value={current.pestName ?? ""}
              onChange={(v) => updateField("pestName", v)}
              placeholder="Enter pest name (e.g., Fall Armyworm)"
            />
          </div>

          <div className="mt-4">
            <InputField
              label="Disease Name"
              type="text"
              disabled={disabled || !current.diseaseDetected} // ✅ locked if diseaseDetected = false
              value={current.diseaseName ?? ""}
              onChange={(v) => updateField("diseaseName", v)}
              placeholder="Enter disease name (e.g., Leaf blight)"
            />
          </div>



          {/* Optional remarks (if you want it always visible) */}
          <div className="mt-4">
            <InputField
              label="Remarks"
              type="text"
              disabled={disabled}
              value={current.remarks ?? ""}
              onChange={(v) => updateField("remarks", v)}
              placeholder="Optional notes"
            />
          </div>
      

      {/* Navigation */}
      <div className="flex justify-between mt-1">
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
      </Section>
    </div>
  )
}
