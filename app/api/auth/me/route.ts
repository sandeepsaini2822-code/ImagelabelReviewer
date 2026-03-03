import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyCognitoIdToken } from "@/lib/auth"

export async function GET() {
  try {
    const store = await cookies() // ✅ await is REQUIRED in your Next version
    const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
    const token = store.get(cookieName)?.value

    if (!token) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    await verifyCognitoIdToken(token)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}