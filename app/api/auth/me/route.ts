import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
  const store = await cookies()
  const token = store.get(cookieName)?.value

  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  // minimal "me" response (you can expand later)
  return NextResponse.json({ ok: true })
}
