import { NextResponse } from "next/server"

export async function GET() {
  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!
  const baseUrl = process.env.APP_BASE_URL! // MUST be https://imagelabel-reviewer.vercel.app

  const redirectUri = `${baseUrl}/auth/callback`
  const scope = "openid email profile"

  const authUrl =
    `${domain}/oauth2/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`

  return NextResponse.redirect(authUrl, { headers: { "Cache-Control": "no-store" } })
}