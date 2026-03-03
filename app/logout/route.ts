import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!

  const logoutUri = `${origin}/login?loggedOut=true`

  const logoutUrl =
    `${domain}/logout` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&logout_uri=${encodeURIComponent(logoutUri)}`

  return NextResponse.redirect(logoutUrl)
}