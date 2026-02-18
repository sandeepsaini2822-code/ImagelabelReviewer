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
    <Section title="Not editable" defaultOpen={false}>
      <ReadOnly label="Farmer" value={current.farmer || "-"} />
      <ReadOnly label="Crop" value={current.crop || "-"} />
      <ReadOnly
        label="Weather Location"
        value={current.weatherLocation || "-"}
      />
    </Section>
  )
}
