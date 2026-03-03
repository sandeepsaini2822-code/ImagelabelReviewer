// app/api/auth/me/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyCognitoIdToken } from "@/lib/auth"

export async function GET() {
  try {
    const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"

    // ✅ In your Next version cookies() is async
    const store = await cookies()
    const token = store.get(cookieName)?.value

    if (!token) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    await verifyCognitoIdToken(token)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}