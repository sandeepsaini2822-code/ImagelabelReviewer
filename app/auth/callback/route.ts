import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)

  const baseUrl = process.env.APP_BASE_URL!
  const domain = process.env.COGNITO_DOMAIN!
  const clientId = process.env.COGNITO_CLIENT_ID!
  const clientSecret = process.env.COGNITO_CLIENT_SECRET! // you said you have it

  const err = url.searchParams.get("error")
  if (err) {
    console.error("Cognito returned error:", err, url.searchParams.toString())
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(err)}`)
  }

  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(`${baseUrl}/login?error=no_code`)

  // MUST match Cognito Allowed callback URLs EXACTLY
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

  const raw = await tokenRes.text()

  if (!tokenRes.ok) {
    console.error("TOKEN EXCHANGE FAILED", {
      status: tokenRes.status,
      redirectUri,
      tokenUrl,
      body: body.toString(),
      response: raw,
    })
    return NextResponse.redirect(`${baseUrl}/login?error=token_${tokenRes.status}`)
  }

  let tokens: any = null
  try {
    tokens = JSON.parse(raw)
  } catch {
    console.error("Token response not JSON:", raw)
    return NextResponse.redirect(`${baseUrl}/login?error=token_parse`)
  }

  if (!tokens?.id_token) {
    console.error("No id_token in response:", tokens)
    return NextResponse.redirect(`${baseUrl}/login?error=no_id_token`)
  }

  const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"

  const res = NextResponse.redirect(`${baseUrl}/`)

  res.cookies.set(cookieName, tokens.id_token, {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"), // ✅ correct
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  return res
}