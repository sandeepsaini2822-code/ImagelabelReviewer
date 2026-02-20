"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loggedOut = searchParams.get("loggedOut") === "true"

  const [checking, setChecking] = useState(true)
  const ran = useRef(false)
  const [signingIn, setSigningIn] = useState(false)

  // ✅ If coming from logout, show message then clean URL
  useEffect(() => {
    if (!loggedOut) return

    const t = setTimeout(() => {
      router.replace("/login") // ✅ removes ?loggedOut=true
    }, 1200)

    return () => clearTimeout(t)
  }, [loggedOut, router])

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    fetch("/api/auth/ping", { credentials: "include", cache: "no-store" })
      .then((res) => {
        if (res.ok) {
          router.replace("/")
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        setChecking(false)
      })
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900/60 p-6">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="text-sm text-zinc-300 mt-2">Sign in to access the dashboard.</p>

        {loggedOut && (
          <div className="mt-3 mb-3 rounded bg-green-900/40 border border-green-700 text-green-400 px-3 py-2 text-sm">
            You have been logged out successfully.
          </div>
        )}

        <button
          disabled={checking || signingIn}
          onClick={() => {
            setSigningIn(true)
            router.replace("/auth/login")
          }}
          className="mt-6 w-full h-10 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50"
        >
          {checking ? "Checking session..." : signingIn ? "Redirecting..." : "Sign in"}
        </button>
      </div>
    </main>
  )
}