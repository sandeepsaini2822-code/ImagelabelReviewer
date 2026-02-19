import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!

  const redirectUri = `${origin}/auth/callback`
  const scope = "openid email profile"

  const authUrl =
    `${domain}/oauth2/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`

  const res = NextResponse.redirect(authUrl)
  res.headers.set("Cache-Control", "no-store")
  return res
}
