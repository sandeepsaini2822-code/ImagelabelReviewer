// app/auth/callback/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin

  const err = url.searchParams.get("error")
  if (err) {
    console.error("Cognito returned error:", err, url.searchParams.toString())
    return NextResponse.redirect(new URL("/login?error=oauth_error", origin))
  }

  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/login?error=no_code", origin))

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!
  const clientSecret = process.env.COGNITO_CLIENT_SECRET // optional
  const baseUrl = process.env.APP_BASE_URL ?? origin

  // MUST match Cognito Allowed callback URLs exactly
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

  // Use Basic auth only if you truly have a client secret enabled for this app client
  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    headers["Authorization"] = `Basic ${basic}`
  }

  const tokenRes = await fetch(tokenUrl, { method: "POST", headers, body })
  const raw = await tokenRes.text()

  // 🔥 LOG the real error from Cognito
  if (!tokenRes.ok) {
    console.error("TOKEN EXCHANGE FAILED", {
      status: tokenRes.status,
      redirectUri,
      tokenUrl,
      body: body.toString(),
      response: raw,
    })
    return NextResponse.redirect(new URL(`/login?error=token_${tokenRes.status}`, origin))
  }

  let tokens: any = null
  try {
    tokens = JSON.parse(raw)
  } catch {
    console.error("Token response not JSON:", raw)
    return NextResponse.redirect(new URL(`/login?error=token_parse`, origin))
  }

  if (!tokens?.id_token) {
    console.error("No id_token in response:", tokens)
    return NextResponse.redirect(new URL(`/login?error=no_id_token`, origin))
  }

  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
  const res = NextResponse.redirect(new URL("/", origin))
  const isHttps = origin.startsWith("https://")

  res.cookies.set(cookieName, tokens.id_token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  return res
}