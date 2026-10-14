import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    console.log("🔒 DUMAAN SA MIDDLEWARE ANG ROUTE:", req.nextUrl.pathname)
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: "/login",
    }
  }
)

export const config = {
  matcher: ["/dashboard/:path*"]
}