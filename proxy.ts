import { NextRequest, NextResponse } from "next/server"

const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ✅ Always allow public routes + static
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/logout" ||
    pathname.startsWith("/logout/") ||
    pathname.startsWith("/auth/") || // /auth/login, /auth/callback
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // ✅ Always allow auth API routes (so login check works)
  if (pathname === "/api/auth/me" || pathname === "/api/auth/ping") {
    return NextResponse.next()
  }

  // ✅ Protect only the dashboard page
  if (pathname === "/") {
    const token = req.cookies.get(cookieName)?.value
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  }

  // ✅ For all other /api routes: return 401 JSON (no redirect)
  if (pathname.startsWith("/api/")) {
    const token = req.cookies.get(cookieName)?.value
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/api/:path*"], // keep this
}
