import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)

  // Keep origin for where to send the browser back (same host user is on)
  const origin = url.origin

  const err = url.searchParams.get("error")
  if (err) return NextResponse.redirect(new URL("/login", origin))

  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/login", origin))

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!
  const clientSecret = process.env.COGNITO_CLIENT_SECRET // optional

  // ✅ Use your configured base URL for Cognito redirectUri
  // Must match Cognito Allowed callback URLs EXACTLY
  const baseUrl = process.env.APP_BASE_URL ?? origin
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
  const tokens: any = await tokenRes.json().catch(() => null)

  if (!tokenRes.ok || !tokens?.id_token) {
    return NextResponse.redirect(new URL("/login", origin))
  }

  const idToken = tokens.id_token as string
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"

  const res = NextResponse.redirect(new URL("/", origin))

  const isHttps = origin.startsWith("https://")

  res.cookies.set(cookieName, idToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  return res
}