//components\dashboard\ReadOnlySection.tsx
"use client"

import React from "react"
import Section from "@/components/common/Section"
import ReadOnly from "@/components/common/ReadOnly"

type ImageItem = {
  farmer: string
  crop: string
  weatherLocation?: string
  createdAt: string
}

export default function ReadOnlySection({
  current,
}: {
  current: ImageItem
}) {
  return (
    <Section title="Not editable">
      <div className="flex flex-col gap-1 sm:gap-2">
        <ReadOnly label="Farmer" value={current.farmer || "-"} />
        <ReadOnly label="Crop" value={current.crop || "-"} />
        <ReadOnly
          label="Weather Location"
          value={current.weatherLocation || "-"}
        />
      </div>
    </Section>
  )
}