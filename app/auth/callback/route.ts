import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)

  // Always use the current host (vercel domain / preview domain / localhost)
  const origin = url.origin

  const err = url.searchParams.get("error")
  if (err) return NextResponse.redirect(new URL("/login", origin))

  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/login", origin))

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!
  const clientSecret = process.env.COGNITO_CLIENT_SECRET // optional

  // IMPORTANT: redirectUri must match what you configured in Cognito
  const redirectUri = `${origin}/auth/callback`

  const tokenUrl = `${domain}/oauth2/token`
  const body = new URLSearchParams()
  body.set("grant_type", "authorization_code")
  body.set("client_id", clientId)
  body.set("code", code)
  body.set("redirect_uri", redirectUri)

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }

  // If your Cognito app client has a secret, keep this.
  // If it does NOT have a secret, leave COGNITO_CLIENT_SECRET empty in Vercel.
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

  // secure should be true whenever site is https (Vercel + previews)
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
