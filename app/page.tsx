// app/page.tsx
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import ImageCanvas from "@/components/dashboard/ImageCanvas"
import MetadataPanel from "@/components/dashboard/MetadataPanel"
import { useRouter } from "next/navigation"

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

type YesNo = boolean | null

type Filters = {
  crop: string
  farmer: string

  plantingFrom: string
  plantingTo: string

  pestDetected: YesNo
  diseaseDetected: YesNo
  goldStandard: YesNo

  cropStage: string
  pestStage: string
  pestName: string
  diseaseName: string
}

const DEFAULT_FILTERS: Filters = {
  crop: "all",
  farmer: "all",

  plantingFrom: "",
  plantingTo: "",

  pestDetected: null,
  diseaseDetected: null,
  goldStandard: null,

  cropStage: "all",
  pestStage: "all",
  pestName: "all",
  diseaseName: "all",
}

export default function ImageReviewer() {
  const router = useRouter()

  // ---------- AUTH GATE ----------
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let alive = true

    fetch("/api/auth/ping", { credentials: "include", cache: "no-store" })
      .then((res) => {
        if (!alive) return
        if (!res.ok) router.replace("/login")
        else setAuthChecked(true)
      })
      .catch(() => {
        if (!alive) return
        router.replace("/login")
      })

    return () => {
      alive = false
    }
  }, [router])

  // ---------- STATE ----------
  const loggingOutRef = useRef(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [images, setImages] = useState<ImageItem[]>([])
  const [index, setIndex] = useState(0)

  const [editable, setEditable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // keep latest cursor in a ref (prevents stale closure issues)
  const nextCursorRef = useRef<string | null>(null)
  useEffect(() => {
    nextCursorRef.current = nextCursor
  }, [nextCursor])

  // safer current
  const current = images[index] ?? images[0]

  // --------- Zoom + Pan state ----------
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  })

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [index])

  // --------- Load images (paged) ----------
  async function fetchPage(cursor?: string | null, append = false) {
    setPageLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("limit", "20")

      if (filters.crop !== "all") params.set("crop", filters.crop)
      if (filters.pestDetected !== null) params.set("pestDetected", String(filters.pestDetected))
      if (filters.diseaseDetected !== null) params.set("diseaseDetected", String(filters.diseaseDetected))
      if (filters.goldStandard !== null) params.set("goldStandard", String(filters.goldStandard))

      if (cursor) params.set("cursor", cursor)

      const res = await fetch(`/api/images?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      })

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      let json: any = null
      try {
        json = await res.json()
      } catch {
        json = null
      }

      if (!res.ok) {
        console.error("FETCH ERROR:", json)
        throw new Error(json?.error ?? "Failed to fetch images")
      }

      const normalized: ImageItem[] = (json?.items ?? []).map((img: ImageItem) => ({
        ...img,
        createdAt: img.createdAt ?? new Date().toISOString(),
        plantingDate: img.plantingDate ?? "",
        pestName: img.pestName ?? "",
        pestStage: img.pestStage ?? "",
        diseaseName: img.diseaseName ?? "",
        cropStage: img.cropStage ?? "",
        remarks: img.remarks ?? "",
        isGoldStandard: !!img.isGoldStandard,
        pestDetected: !!img.pestDetected,
        diseaseDetected: !!img.diseaseDetected,
      }))

      setImages((prev) => (append ? [...prev, ...normalized] : normalized))
      setNextCursor(json?.nextCursor ?? null)

      if (!append) setIndex(0)
    } finally {
      setPageLoading(false)
    }
  }

  // initial + refetch when filters change (only after auth checked)
  useEffect(() => {
    if (!authChecked) return

    setRefreshing(true)
    setNextCursor(null)
    setIndex(0)

    fetchPage(null, false).finally(() => setRefreshing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, authChecked])

  function updateField<K extends keyof ImageItem>(field: K, value: ImageItem[K]) {
    if (editable) setDirty(true)

    setImages((prev) => {
      const copy = [...prev]
      const safeIndex = copy[index] ? index : 0
      if (!copy[safeIndex]) return prev
      copy[safeIndex] = { ...copy[safeIndex], [field]: value }
      return copy
    })
  }

  function isAlphabetOnly(value: string) {
    if (!value) return true
    return /^[A-Za-z\s]+$/.test(value)
  }

  async function saveChanges() {
    const cur = current
    if (!cur) return

    if (!isAlphabetOnly(cur.pestName ?? "")) {
      setToast({ type: "error", message: "Pest name can only contain alphabets." })
      return
    }
    if (!isAlphabetOnly(cur.diseaseName ?? "")) {
      setToast({ type: "error", message: "Disease name can only contain alphabets." })
      return
    }

    try {
      setSaving(true)

      const payload = {
        key: cur.key,
        plantingDate: cur.plantingDate ?? "",
        pestDetected: cur.pestDetected,
        diseaseDetected: cur.diseaseDetected,
        goldStandard: cur.isGoldStandard,
        pestName: cur.pestName ?? "",
        pestStage: cur.pestStage ?? "",
        diseaseName: cur.diseaseName ?? "",
        cropStage: cur.cropStage ?? "",
        remarks: cur.remarks ?? "",
      }

      const res = await fetch("/api/images/update", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setToast({ type: "error", message: data?.message ?? "Failed to save changes" })
        return
      }

      setToast({ type: "success", message: "Changes saved successfully!" })
      setEditable(false)
      setDirty(false)
    } catch (e: any) {
      setToast({ type: "error", message: e?.message ?? "Unexpected error" })
    } finally {
      setSaving(false)
    }
  }

  // --------- Auto-save on navigation ----------
  async function goPrev() {
    if (index === 0) return
    setDirection(-1)
    if (editable && dirty) await saveChanges()
    setIndex((i) => Math.max(0, i - 1))
    setEditable(false)
    setDirty(false)
  }

  async function goNext() {
    setDirection(1)

    if (index < images.length - 1) {
      if (editable && dirty) await saveChanges()
      setIndex((i) => i + 1)
      setEditable(false)
      setDirty(false)
      return
    }

    const cursor = nextCursorRef.current
    if (!cursor || pageLoading) return

    if (editable && dirty) await saveChanges()

    await fetchPage(cursor, true)

    setIndex((i) => i + 1)
    setEditable(false)
    setDirty(false)
  }

  // --------- Keyboard shortcuts ----------
  useEffect(() => {
    function isTypingTarget(t: EventTarget | null) {
      if (!(t instanceof HTMLElement)) return false
      const tag = t.tagName.toLowerCase()
      return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable
    }

    async function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        await goPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        await goNext()
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault()
        setEditable((v) => {
          const next = !v
          if (next) setDirty(false)
          return next
        })
      } else if (e.key.toLowerCase() === "s") {
        if (!editable) return
        e.preventDefault()
        await saveChanges()
      } else if (e.key === "Escape") {
        if (editable) {
          e.preventDefault()
          setEditable(false)
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, index, images.length, current])

  // --------- Zoom helpers ----------
  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom])

  function clampZoom(z: number) {
    return Math.min(4, Math.max(1, z))
  }
  function zoomIn() {
    setZoom((z) => clampZoom(Number((z + 0.2).toFixed(2))))
  }
  function zoomOut() {
    setZoom((z) => clampZoom(Number((z - 0.2).toFixed(2))))
  }
  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  function onWheelZoom(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => clampZoom(Number((z + delta).toFixed(2))))
  }

  function onPointerDown(e: React.PointerEvent) {
    ; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current.active = true
    dragRef.current.startX = e.clientX
    dragRef.current.startY = e.clientY
    dragRef.current.baseX = pan.x
    dragRef.current.baseY = pan.y
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy })
  }
  function onPointerUp() {
    dragRef.current.active = false
  }

  const hasImages = images.length > 0
  const currentSafe = hasImages ? (images[index] ?? images[0]) : null

  // prefetch adjacent images
  useEffect(() => {
    if (!images.length) return

    const next = images[index + 1]
    if (next?.imageUrl) {
      const img = new Image()
      img.src = next.imageUrl
    }

    const prev = images[index - 1]
    if (prev?.imageUrl) {
      const img = new Image()
      img.src = prev.imageUrl
    }
  }, [index, images])

  // ✅ no early return => hooks order stays stable
  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="text-lg">Checking session...</div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-zinc-950 text-zinc-100">
      <div className="h-full flex flex-col">
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 pt-4">
          <h3 className="text-2xl font-bold text-center tracking-tight">
            <span className="text-white">Image Label</span>{" "}
            <span className="text-green-700/80">Reviewer</span>
          </h3>
        </div>

        {/* FILTER BAR */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 pt-3">
          <div className="max-w-screen-2xl mx-auto">
            <div className="bg-green-700/80 backdrop-blur border border-white/10 rounded px-3 py-2 flex flex-wrap items-center gap-3 text-xs overflow-x-auto">
              <div className="flex items-center">
                <img
                  src="https://res.cloudinary.com/dgwhmqdhr/image/upload/v1769143824/annam-white-with-icon_cp78pb.png"
                  alt="Logo"
                  className="h-8 w-auto"
                />
              </div>

              <div className="ml-0 sm:ml-auto flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-white">Crop</span>
                  <select
                    value={filters.crop}
                    onChange={(e) => setFilters((f) => ({ ...f, crop: e.target.value }))}
                    className="h-8 border rounded px-2 text-zinc-900 border-white/50"
                  >
                    <option value="all">All</option>
                    <option value="wheat">Wheat</option>
                    <option value="rice">Rice</option>
                    <option value="maize">Maize</option>
                    <option value="tomato">Tomato</option>
                    <option value="chili">Chilli</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white">Pest</span>
                  <select
                    value={filters.pestDetected === null ? "all" : filters.pestDetected ? "yes" : "no"}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        pestDetected: e.target.value === "all" ? null : e.target.value === "yes",
                      }))
                    }
                    className="h-8 border rounded px-2 text-zinc-900 border-white/50"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white">Disease</span>
                  <select
                    value={filters.diseaseDetected === null ? "all" : filters.diseaseDetected ? "yes" : "no"}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        diseaseDetected: e.target.value === "all" ? null : e.target.value === "yes",
                      }))
                    }
                    className="h-8 border rounded px-2 text-zinc-900 border-white/50"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white">Gold</span>
                  <select
                    value={filters.goldStandard === null ? "all" : filters.goldStandard ? "yes" : "no"}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        goldStandard: e.target.value === "all" ? null : e.target.value === "yes",
                      }))
                    }
                    className="h-8 border rounded px-2 text-zinc-900 border-white/50"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="flex-1" />

                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="h-8 px-3 rounded bg-zinc-900 text-white text-xs hover:bg-zinc-700"
                >
                  Reset
                </button>

                <button
                  onClick={async () => {
                    loggingOutRef.current = true
                    setImages([])
                    setNextCursor(null)

                    const res = await fetch("/logout", { method: "POST", credentials: "include" })
                    const data = await res.json().catch(() => null)

                    if (data?.logoutUrl) window.location.href = data.logoutUrl
                    else router.replace("/login")
                  }}
                  className="h-8 px-3 rounded bg-red-900 text-white text-xs hover:bg-red-700"
                >
                  Logout
                </button>

                {pageLoading ? <span className="text-white/80 text-xs">Loading…</span> : null}
              </div>
            </div>
          </div>
        </div>

        {/* 60:40 layout */}
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 pb-4 pt-3">
          <div className="h-full min-h-0 max-w-screen-2xl mx-auto">
            <DashboardLayout
              left={
                <ImageCanvas
                  current={currentSafe}
                  direction={direction}
                  imageLoading={refreshing}
                  zoomPercent={zoomPercent}
                  zoom={zoom}
                  pan={pan}
                  dragActive={dragRef.current.active}
                  zoomIn={zoomIn}
                  zoomOut={zoomOut}
                  resetView={resetView}
                  onWheelZoom={onWheelZoom}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  goPrev={goPrev}
                  goNext={goNext}
                  canPrev={index > 0}
                  canNext={index < images.length - 1 || !!nextCursor}
                />
              }
              right={
                <MetadataPanel
                  current={currentSafe}
                  index={index}
                  total={images.length}
                  nextCursor={nextCursor}
                  editable={editable}
                  saving={saving}
                  setEditable={setEditable}
                  updateField={updateField}
                  saveChanges={saveChanges}
                  goPrev={goPrev}
                  goNext={goNext}
                />
              }
            />
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          <div
            className={`px-5 py-3 rounded-lg shadow-lg text-white text-sm transition-all duration-300 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"
              }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </main>
  )
}