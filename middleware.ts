import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  // This function only runs if the user is logged in (authorized returns true)
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Strict Rule 1: Only Principals can access the /dashboard/principal routes
    if (path.startsWith("/dashboard/principal") && token?.role !== "PRINCIPAL") {
      // Kick unauthorized users back to the standard dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Strict Rule 2: Only Disbursing Officers can access the data entry forms
    if (path.startsWith("/dashboard/expenses") && token?.role !== "DISBURSING_OFFICER" && token?.role !== "PRINCIPAL") {
      // Kick Principals back to their approval dashboard
      return NextResponse.redirect(new URL("/dashboard/principal", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // This enforces that a user must have a valid token to even trigger the middleware logic
      authorized: ({ token }) => !!token,
    },
  }
)

// Apply this middleware to protect the entire dashboard directory
export const config = {
  matcher: ["/dashboard/:path*"],
}