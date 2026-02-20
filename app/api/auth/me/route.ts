import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const store = await cookies()
  const token = store.get("agri_auth")?.value

  if (!token) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true })
}
//app\api\auth\me\route.ts