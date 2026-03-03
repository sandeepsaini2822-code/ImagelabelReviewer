import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)

  const err = url.searchParams.get("error")
  if (err) {
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/login?error=${encodeURIComponent(err)}`)
  }

  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(`${process.env.APP_BASE_URL}/login`)

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!
  const clientSecret = process.env.COGNITO_CLIENT_SECRET! // you said you have it
  const baseUrl = process.env.APP_BASE_URL!

  const redirectUri = `${baseUrl}/auth/callback`

  const tokenUrl = `${domain}/oauth2/token`
  const body = new URLSearchParams()
  body.set("grant_type", "authorization_code")
  body.set("client_id", clientId)
  body.set("code", code)
  body.set("redirect_uri", redirectUri)

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  })

  const tokens: any = await tokenRes.json().catch(() => null)

  if (!tokenRes.ok || !tokens?.id_token) {
    return NextResponse.redirect(`${baseUrl}/login?error=token_${tokenRes.status}`)
  }

  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"

  const res = NextResponse.redirect(`${baseUrl}/`)
  res.cookies.set(cookieName, tokens.id_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  return res
}