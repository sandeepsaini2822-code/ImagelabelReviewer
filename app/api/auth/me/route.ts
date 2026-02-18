import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyCognitoIdToken } from "@/lib/auth"

export async function GET() {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
  const store = await cookies()
  const token = store.get(cookieName)?.value

  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    const user = await verifyCognitoIdToken(token)
    return NextResponse.json({ ok: true, user: { email: user?.email, sub: user?.sub } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Invalid/expired" }, { status: 401 })
  }
}
