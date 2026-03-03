// app/api/auth/ping/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function GET() {
  const store = await cookies()
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
  const token = store.get(cookieName)?.value

  if (!token) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true })
}