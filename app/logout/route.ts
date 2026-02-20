// import { NextResponse } from "next/server"
// import { cookies } from "next/headers"

// export async function POST() {
//   const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
//   const store = await cookies()

//   const isProd = process.env.NODE_ENV === "production"

//   // 1️⃣ Clear app session cookie
//   store.set(cookieName, "", {
//     httpOnly: true,
//     secure: isProd,     // ✅ true on Vercel, false locally
//     sameSite: "lax",
//     path: "/",
//     maxAge: 0,
//   })

//   // 2️⃣ Also logout from Cognito Hosted UI
//   const domain = process.env.COGNITO_DOMAIN!
//   const clientId = process.env.COGNITO_CLIENT_ID!
//   const baseUrl = process.env.APP_BASE_URL!

//   const logoutUrl =
//     `${domain}/logout` +
//     `?client_id=${encodeURIComponent(clientId)}` +
//     `&logout_uri=${encodeURIComponent(`${baseUrl}/login`)}`

//   return NextResponse.json({ ok: true, logoutUrl })
// }
import { NextResponse } from "next/server"

export async function POST() {
  const baseUrl = process.env.APP_BASE_URL!
  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!

  const logoutRedirect = `${baseUrl}/login?loggedOut=true`

  const idCookie = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
  const refreshCookie = process.env.REFRESH_COOKIE_NAME ?? "agri_refresh"

  const res = NextResponse.json({
    ok: true,
    logoutUrl:
      `${domain}/logout` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&logout_uri=${encodeURIComponent(logoutRedirect)}`,
  })

  res.cookies.set(idCookie, "", { path: "/", maxAge: 0 })
  res.cookies.set(refreshCookie, "", { path: "/", maxAge: 0 })

  return res
}