//components\dashboard\EditableSection.tsx
"use client"

import Section from "@/components/common/Section"
import YesNo from "@/components/common/YesNo"
import InputField from "@/components/common/InputField"
import BulletOptions from "@/components/common/BulletOptions"

type ImageItem = {
  createdAt: string

  pestDetected: boolean
  diseaseDetected: boolean
  isGoldStandard: boolean

  cropStage?: string
  pestStage?: string

  pestName?: string
  diseaseName?: string
  remarks?: string
}

export default function EditableSection({
  current,
  editable,
  saving,
  updateField,
}: {
  current: ImageItem
  editable: boolean
  saving: boolean
  updateField: (field: any, value: any) => void
}) {
  const disabled = !editable || saving

  const CROP_STAGE_OPTIONS = ["SEEDLING", "VEGETATIVE", "FLOWERING", "FRUITING"]
  const PEST_STAGE_OPTIONS = ["EGG", "LARVA", "PUPA", "ADULT"]

  return (
    <Section title="Editable" >
      {/* Planting date */}
      <div className="w-full sm:w-52">
        <InputField
          label="Planting Date"
          type="date"
          disabled={disabled}
          value={(current.createdAt ?? "").split("T")[0]}
          onChange={(v) =>
            updateField(
              "createdAt",
              v ? new Date(v + "T00:00:00Z").toISOString() : new Date().toISOString()
            )
          }
        />
      </div>

      {/* Pest / Disease detected */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <YesNo
          label="Pest Detected"
          value={!!current.pestDetected}
          disabled={disabled}
          onChange={(v) => {
            updateField("pestDetected", v)
            if (!v) {
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
              updateField("diseaseName", "")
            }
          }}
        />
      </div>

      {/* Gold standard */}
      <div className="mt-3 sm:mt-6 pt-3 sm:pt-4 border-t">
        <YesNo
          label="Gold Standard"
          value={!!current.isGoldStandard}
          disabled={disabled}
          onChange={(v) => updateField("isGoldStandard", v)}
        />
      </div>

      {/* Crop stage */}
      <div className="mt-2 sm:mt-4">
        <BulletOptions
          label="Crop Stage"
          value={current.cropStage ?? ""}
          options={CROP_STAGE_OPTIONS}
          disabled={disabled}
          onChange={(v) => updateField("cropStage", v)}
        />
      </div>

      {/* Pest stage (only if pest detected) */}
      {current.pestDetected && (
        <div className="mt-2 sm:mt-4 pl-2 sm:pl-4 border-l">
          <BulletOptions
            label="Pest Stage"
            value={current.pestStage ?? ""}
            options={PEST_STAGE_OPTIONS}
            disabled={disabled}
            onChange={(v) => updateField("pestStage", v)}
          />
        </div>
      )}

      {/* Pest name (manual, only if pest detected) */}
      {current.pestDetected && (
        <div className="mt-2 sm:mt-4 pl-2 sm:pl-4 border-l">
          <InputField
            label="Pest Name"
            type="text"
            disabled={disabled}
            value={current.pestName ?? ""}
            onChange={(v) => updateField("pestName", v)}
            placeholder="Enter pest name (e.g., Fall Armyworm)"
          />
        </div>
      )}

      {/* Disease name (manual, only if disease detected) */}
      {current.diseaseDetected && (
        <div className="mt-2 sm:mt-4 pl-2 sm:pl-4 border-l">
          <InputField
            label="Disease Name"
            type="text"
            disabled={disabled}
            value={current.diseaseName ?? ""}
            onChange={(v) => updateField("diseaseName", v)}
            placeholder="Enter disease name (e.g., Leaf blight)"
          />
        </div>
      )}

      {/* Remarks (optional) */}
      {"remarks" in current && (
        <div className="mt-2 sm:mt-4">
          <InputField
            label="Remarks"
            type="text"
            disabled={disabled}
            value={current.remarks ?? ""}
            onChange={(v) => updateField("remarks", v)}
            placeholder="Optional notes"
          />
        </div>
      )}
    </Section>
  )
}