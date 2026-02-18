"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const router = useRouter()
    const [checking, setChecking] = useState(true)
    const ran = useRef(false)
    const [signingIn, setSigningIn] = useState(false)

    useEffect(() => {
        if (ran.current) return
        ran.current = true

        fetch("/api/auth/ping", { credentials: "include", cache: "no-store" })
            .then((res) => {
                if (res.ok) {
                    router.replace("/")
                } else {
                    // ✅ 401 -> not logged in -> enable Sign in button
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
