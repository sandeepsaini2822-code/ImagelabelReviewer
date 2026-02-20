import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const store = await cookies()

  //  Directly check agri_auth
  const token = store.get("agri_auth")?.value

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
