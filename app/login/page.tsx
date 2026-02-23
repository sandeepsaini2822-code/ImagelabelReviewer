"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loggedOut = searchParams.get("loggedOut") === "true"

  const [checking, setChecking] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const ran = useRef(false)

  // ✅ If coming from logout, show message briefly then clean URL
  useEffect(() => {
    if (!loggedOut) return
    const t = setTimeout(() => {
      router.replace("/login")
    }, 1200)
    return () => clearTimeout(t)
  }, [loggedOut, router])

  // ✅ session check
  useEffect(() => {
    if (ran.current) return
    ran.current = true

    fetch("/api/auth/ping", { credentials: "include", cache: "no-store" })
      .then((res) => {
        if (res.ok) router.replace("/")
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [router])

  return (
    <main className="min-h-screen relative overflow-hidden bg-zinc-950 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-green-600/20 blur-3xl" />
<div className="absolute -bottom-40 -right-40 h-128 w-lg rounded-full bg-emerald-400/10 blur-3xl" />
        {/* subtle grid */}
<div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-size-[52px_52px]" />      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.6)]" />
              Secure Cognito Sign-in
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              <span className="text-white">Image Label</span>{" "}
              <span className="text-green-400">Reviewer</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-300">
              Sign in to review and correct pest/disease labels.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] p-6">
            {loggedOut && (
              <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                ✅ You have been logged out successfully.
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Welcome back</h2>
                <p className="mt-1 text-sm text-zinc-300">
                  Use your organization account to continue.
                </p>
              </div>

              {/* mini badge */}
              <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                Region: <span className="text-white">ap-south-1</span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-5 h-px bg-white/10" />

            {/* Button */}
            <button
              disabled={checking || signingIn}
              onClick={() => {
                setSigningIn(true)
                router.replace("/auth/login")
              }}
              className="group w-full h-11 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium shadow-[0_10px_30px_rgba(34,197,94,0.25)]"
            >
              {checking ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Checking session…
                </>
              ) : signingIn ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                    🔐
                  </span>
                  Sign in with Cognito
                </>
              )}
            </button>

            {/* Helper text */}
            <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
              Having trouble signing in? Try opening in a private window or clear site cookies for{" "}
              <span className="text-zinc-200">image-label-reviewer.vercel.app</span>.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-zinc-500">
            © {new Date().getFullYear()} Image Label Reviewer • Secure session via HttpOnly cookies
          </div>
        </div>
      </div>
    </main>
  )
}



// sandeep saini