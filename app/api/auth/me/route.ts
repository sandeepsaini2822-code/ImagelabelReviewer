// app/api/auth/me/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyCognitoIdToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // ✅ In your setup, cookies() is Promise<ReadonlyRequestCookies>
    const store = await cookies()

    const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
    const token = store.get(cookieName)?.value

    if (!token) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    await verifyCognitoIdToken(token)

    const payloadJson = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"))
    console.log("JWT iss:", payloadJson.iss)
    console.log("JWT aud:", payloadJson.aud)
    console.log("Expected issuer:", `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`)
    console.log("Expected audience:", process.env.COGNITO_CLIENT_ID)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("ME verify failed:", e)
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}