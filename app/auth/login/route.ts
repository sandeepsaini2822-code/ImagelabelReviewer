import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.APP_BASE_URL!
  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!

  const redirectUri = `${baseUrl}/auth/callback`
  const scope = "openid email profile"

  const url =
    `${domain}/oauth2/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`

  const res = NextResponse.redirect(url)
  res.headers.set("Cache-Control", "no-store")
  return res
}
