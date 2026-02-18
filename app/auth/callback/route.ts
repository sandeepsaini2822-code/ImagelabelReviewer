import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const baseUrl = process.env.APP_BASE_URL!

  const err = url.searchParams.get("error")
  if (err) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(`${baseUrl}/login`)

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!
  const clientSecret = process.env.COGNITO_CLIENT_SECRET // optional
  const redirectUri = `${baseUrl}/auth/callback`

  const tokenUrl = `${domain}/oauth2/token`
  const body = new URLSearchParams()
  body.set("grant_type", "authorization_code")
  body.set("client_id", clientId)
  body.set("code", code)
  body.set("redirect_uri", redirectUri)

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }

  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    headers["Authorization"] = `Basic ${basic}`
  }

  const tokenRes = await fetch(tokenUrl, { method: "POST", headers, body })
  const tokens: any = await tokenRes.json()

  if (!tokenRes.ok || !tokens?.id_token) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  // ✅ FIX: define idToken
  const idToken = tokens.id_token as string

  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
  const res = NextResponse.redirect(`${baseUrl}/`)

  const isProd = process.env.NODE_ENV === "production"

  res.cookies.set(cookieName, idToken, {
    httpOnly: true,
    secure: isProd, // ✅ true on Vercel, false locally
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  return res
}
