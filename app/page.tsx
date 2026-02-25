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
  isGoldStandard: boolean // used as "Verified"

  cropStage?: string
  pestStage?: string
  pestName?: string
  diseaseName?: string
  diseaseStage?: string

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

type FarmerStat = { farmer: string; total: number; verified: number }

// --------- Copy/Undo Labels ----------
type EditableLabels = Pick<
  ImageItem,
  | "crop"
  | "plantingDate"
  | "cropStage"
  | "pestDetected"
  | "pestStage"
  | "pestName"
  | "diseaseDetected"
  | "diseaseName"
  | "diseaseStage"
  | "remarks"
  | "isGoldStandard"
>

export default function ImageReviewer() {
  const router = useRouter()

  // ---------- AUTH ----------
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let alive = true

    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!alive) return

        if (!res.ok) {
          await fetch("/logout", { method: "POST", credentials: "include" }).catch(() => null)
          router.replace("/login")
          return
        }

        setAuthChecked(true)
      })
      .catch(async () => {
        if (!alive) return
        await fetch("/logout", { method: "POST", credentials: "include" }).catch(() => null)
        router.replace("/login")
      })

    return () => {
      alive = false
    }
  }, [router])

  // ---------- STATE ----------
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [images, setImages] = useState<ImageItem[]>([])
  const [index, setIndex] = useState(0)

  const [farmers, setFarmers] = useState<FarmerStat[]>([])
  const [farmerLoading, setFarmerLoading] = useState(false)
  const [overallStats, setOverallStats] = useState<{ total: number; verified: number } | null>(null)
  const [stats, setStats] = useState<{ total: number; verified: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  // always editable
  const [editable] = useState(true)

  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // last verified (for copy)
  const lastVerifiedRef = useRef<EditableLabels | null>(null)
  const [hasLastVerified, setHasLastVerified] = useState(false)

  // undo snapshots per image key
  const undoSnapshotRef = useRef<Record<string, EditableLabels>>({})

  // keep latest cursor in a ref (prevents stale closure issues)
  const nextCursorRef = useRef<string | null>(null)
  useEffect(() => {
    nextCursorRef.current = nextCursor
  }, [nextCursor])

  // safer current
  const hasImages = images.length > 0
  const currentSafe = hasImages ? images[index] ?? images[0] : null
  const current = currentSafe

  // toast autoclear
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // farmer selected stats
  const selectedFarmerStats = useMemo(() => {
    if (filters.farmer === "all") return null
    return farmers.find((f) => f.farmer === filters.farmer) ?? null
  }, [farmers, filters.farmer])

  // --------- Zoom + Pan ----------
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

  // --------- Farmers ----------
  async function loadFarmers() {
    try {
      setFarmerLoading(true)
      const res = await fetch("/api/farmers", { credentials: "include", cache: "no-store" })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        console.error("FARMERS FETCH ERROR:", data)
        setFarmers([])
        return
      }

      setOverallStats(data?.overall ?? null)
      setFarmers(Array.isArray(data.farmers) ? data.farmers : [])
    } catch (e) {
      console.error("FARMERS FETCH ERROR:", e)
      setFarmers([])
    } finally {
      setFarmerLoading(false)
    }
  }
  async function loadStats(nextFilters = filters) {
    try {
      setStatsLoading(true)

      const params = new URLSearchParams()
      if (nextFilters.crop !== "all") params.set("crop", nextFilters.crop)
      if (nextFilters.farmer !== "all") params.set("farmer", nextFilters.farmer)
      if (nextFilters.pestDetected !== null) params.set("pestDetected", String(nextFilters.pestDetected))
      if (nextFilters.diseaseDetected !== null) params.set("diseaseDetected", String(nextFilters.diseaseDetected))

      const res = await fetch(`/api/stats?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        console.error("STATS FETCH ERROR:", data)
        setStats(null)
        return
      }

      setStats({ total: data.total ?? 0, verified: data.verified ?? 0 })
    } catch (e) {
      console.error("STATS FETCH ERROR:", e)
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }
  // load farmers once after auth
  useEffect(() => {
    if (!authChecked) return
    loadFarmers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked])

  // --------- Undo helpers ----------
  function takeUndoSnapshotIfMissing(item: ImageItem) {
    if (!item?.key) return
    if (undoSnapshotRef.current[item.key]) return

    undoSnapshotRef.current[item.key] = {
      crop: item.crop ?? "",
      plantingDate: item.plantingDate ?? "",
      cropStage: item.cropStage ?? "",
      pestDetected: !!item.pestDetected,
      pestStage: item.pestStage ?? "",
      pestName: item.pestName ?? "",
      diseaseDetected: !!item.diseaseDetected,
      diseaseStage: item.diseaseStage ?? "",
      diseaseName: item.diseaseName ?? "",
      remarks: item.remarks ?? "",
      isGoldStandard: !!item.isGoldStandard,
    }
  }

  function canUndoCurrent() {
    return !!currentSafe?.key && !!undoSnapshotRef.current[currentSafe.key]
  }

  function undoCurrent() {
    const cur = currentSafe
    if (!cur?.key) return

    const snap = undoSnapshotRef.current[cur.key]
    if (!snap) return

    setImages((prev) => {
      const copy = [...prev]
      const safeIndex = copy[index] ? index : 0
      if (!copy[safeIndex]) return prev
      copy[safeIndex] = { ...copy[safeIndex], ...snap }
      return copy
    })

    delete undoSnapshotRef.current[cur.key]
    setDirty(false)
  }

  // --------- Copy last verified ----------
  function captureLastVerified(from: ImageItem) {
    lastVerifiedRef.current = {
      crop: from.crop ?? "",
      plantingDate: from.plantingDate ?? "",
      cropStage: from.cropStage ?? "",
      pestDetected: !!from.pestDetected,
      pestStage: from.pestStage ?? "",
      pestName: from.pestName ?? "",
      diseaseDetected: !!from.diseaseDetected,
      diseaseStage: from.diseaseStage ?? "",
      diseaseName: from.diseaseName ?? "",
      remarks: from.remarks ?? "",
      isGoldStandard: !!from.isGoldStandard,
    }
    setHasLastVerified(true)
  }

  function applyLastVerified(toIndex = index) {
    const labels = lastVerifiedRef.current
    if (!labels) return

    if (currentSafe) takeUndoSnapshotIfMissing(currentSafe)

    setImages((prev) => {
      const copy = [...prev]
      const item = copy[toIndex]
      if (!item) return prev

      copy[toIndex] = {
        ...item,
        crop: labels.crop,
        plantingDate: labels.plantingDate,
        cropStage: labels.cropStage,
        pestDetected: labels.pestDetected,
        pestStage: labels.pestStage,
        pestName: labels.pestName,
        diseaseDetected: labels.diseaseDetected,
        diseaseStage: labels.diseaseStage ?? "",
        diseaseName: labels.diseaseName,
        remarks: labels.remarks,
        isGoldStandard: false, // do not auto-verify
      }
      return copy
    })

    setDirty(true)
  }


  useEffect(() => {
    if (!authChecked) return

    setRefreshing(true)
    setNextCursor(null)

    // load images + stats together
    Promise.all([
      fetchPage(null, false),
      loadStats(filters),
    ]).finally(() => setRefreshing(false))

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, authChecked])
  // --------- Load images ----------
  async function fetchPage(cursor?: string | null, append = false) {
    setPageLoading(true)

    try {
      const params = new URLSearchParams()
      params.set("limit", "20")

      if (filters.crop !== "all") params.set("crop", filters.crop)
      if (filters.farmer !== "all") params.set("farmer", filters.farmer)

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

      let rawText = ""
      let json: any = null

      try {
        rawText = await res.text()
        json = rawText ? JSON.parse(rawText) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        console.error("FETCH ERROR:", {
          status: res.status,
          statusText: res.statusText,
          url: `/api/images?${params.toString()}`,
          body: json ?? rawText,
        })
        throw new Error((json && (json.message || json.error)) || "Failed to fetch images")
      }

      const normalized: ImageItem[] = (json?.items ?? []).map((img: any) => ({
        ...img,

        createdAt: img.createdAt ?? new Date().toISOString(),
        plantingDate: img.plantingDate ?? "",

        crop: img.crop ?? "",
        cropStage: img.cropStage ?? "",

        pestName: img.pestName ?? "",
        pestStage: img.pestStage ?? "",

        diseaseName: img.diseaseName ?? "",
        diseaseStage: img.diseaseStage ?? "",

        remarks: img.remarks ?? "",

        isGoldStandard: !!img.isGoldStandard,
        pestDetected: !!img.pestDetected,
        diseaseDetected: !!img.diseaseDetected,
      }))

      // VERIFIED first then UNVERIFIED, but open on first UNVERIFIED
      const verified = normalized.filter((x) => x.isGoldStandard)
      const unverified = normalized.filter((x) => !x.isGoldStandard)
      const ordered = [...verified, ...unverified]

      setImages((prev) => (append ? [...prev, ...ordered] : ordered))
      setNextCursor(json?.nextCursor ?? null)

      if (!append) {
        const firstUnverifiedIndex = verified.length
        setIndex(unverified.length > 0 ? firstUnverifiedIndex : 0)
      }
    } finally {
      setPageLoading(false)
    }
  }

  // refetch when filters change (after auth)
  useEffect(() => {
    if (!authChecked) return

    setRefreshing(true)
    setNextCursor(null)
    setIndex(0)

    fetchPage(null, false).finally(() => setRefreshing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, authChecked])

  // --------- Update field ----------
  function updateField<K extends keyof ImageItem>(field: K, value: ImageItem[K]) {
    if (editable && currentSafe) takeUndoSnapshotIfMissing(currentSafe)
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

  // --------- Save ----------
  async function saveChanges(): Promise<boolean> {
    const cur = current
    if (!cur) return false

    if (!isAlphabetOnly(cur.pestName ?? "")) {
      setToast({ type: "error", message: "Pest name can only contain alphabets." })
      return false
    }
    if (!isAlphabetOnly(cur.diseaseName ?? "")) {
      setToast({ type: "error", message: "Disease name can only contain alphabets." })
      return false
    }

    try {
      setSaving(true)

      const payload = {
        key: cur.key,

        crop: cur.crop ?? "",
        plantingDate: cur.plantingDate ?? "",
        cropStage: cur.cropStage ?? "",

        pestDetected: !!cur.pestDetected,
        pestName: cur.pestName ?? "",
        pestStage: cur.pestStage ?? "",

        diseaseDetected: !!cur.diseaseDetected,
        diseaseName: cur.diseaseName ?? "",
        diseaseStage: cur.diseaseStage ?? "",

        remarks: cur.remarks ?? "",

        goldStandard: !!cur.isGoldStandard,
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
        return false
      }

      setToast({ type: "success", message: "Changes saved successfully!" })
      await loadStats(filters)
      if (cur.isGoldStandard) captureLastVerified(cur)

      // refresh farmer verified/total counts (global)
      await loadFarmers()

      // saved -> clear dirty + allow undo snapshot to remain (optional)
      setDirty(false)
      return true
    } catch (e: any) {
      setToast({ type: "error", message: e?.message ?? "Unexpected error" })
      return false
    } finally {
      setSaving(false)
    }
  }

  // --------- Navigation (autosave) ----------
  async function goPrev() {
    if (index === 0) return
    setDirection(-1)

    if (editable && dirty) {
      const ok = await saveChanges()
      if (!ok) return
    }

    setIndex((i) => Math.max(0, i - 1))
    setDirty(false)
  }

  async function goNext() {
    setDirection(1)

    if (index < images.length - 1) {
      if (editable && dirty) {
        const ok = await saveChanges()
        if (!ok) return
      }
      setIndex((i) => i + 1)
      setDirty(false)
      return
    }

    const cursor = nextCursorRef.current
    if (!cursor || pageLoading) return

    if (editable && dirty) {
      const ok = await saveChanges()
      if (!ok) return
    }

    await fetchPage(cursor, true)

    setIndex((i) => i + 1)
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
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault()
        await saveChanges()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length, dirty])

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

  // keep auth gate AFTER hooks
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
                {/* Farmer */}
                <div className="flex items-center gap-2">
                  <span className="text-white">Farmer</span>
                  <select
                    value={filters.farmer}
                    onChange={(e) => setFilters((f) => ({ ...f, farmer: e.target.value }))}
                    className="h-8 border rounded px-2 text-zinc-900 border-white/50"
                  >
                    <option value="all">All</option>
                    {farmers.map((f) => (
                      <option key={f.farmer} value={f.farmer}>
                        {f.farmer}
                      </option>
                    ))}
                  </select>



                </div>

                {/* Crop */}
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

                {/* Count badge: shows selected farmer if chosen else overall */}
                {stats && (
                  <span className="ml-2 text-white text-sm bg-black/40 px-3 py-1.5 rounded whitespace-nowrap font-semibold">
                    Verified: {stats.verified} &nbsp; Total: {stats.total}
                  </span>
                )}

                {statsLoading && (
                  <span className="ml-2 text-white/80 text-sm"></span>
                )}

                {/* Pest */}
                {/* <div className="flex items-center gap-2">
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
                </div> */}

                {/* Disease */}
                {/* <div className="flex items-center gap-2">
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
                </div> */}

                {/* Verified filter */}
                {/* <div className="flex items-center gap-2">
                  <span className="text-white">Verified</span>
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
                </div>  */}

                <div className="flex-1" />

                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="h-8 px-3 rounded bg-zinc-900 text-white text-xs hover:bg-zinc-700"
                >
                  Reset
                </button>

                <button
                  onClick={async () => {
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


              </div>
            </div>
          </div>
        </div>

        {/* Layout */}
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
                  hasLastVerified={hasLastVerified}
                  copyFromLastVerified={applyLastVerified}
                  onMarkVerified={() => {
                    const cur = currentSafe
                    if (cur) captureLastVerified(cur)
                  }}
                  updateField={updateField}
                  saveChanges={saveChanges}
                  canUndo={canUndoCurrent()}
                  onUndo={undoCurrent}
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