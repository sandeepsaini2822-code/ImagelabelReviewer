import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin

  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!

  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"

  // After Cognito logout, user comes back here
  const logoutUri = `${origin}/login?loggedOut=true`

  const logoutUrl =
    `${domain}/logout` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&logout_uri=${encodeURIComponent(logoutUri)}`

  // ✅ IMPORTANT: clear your app session cookie first
  const res = NextResponse.redirect(logoutUrl)

  res.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return res
}