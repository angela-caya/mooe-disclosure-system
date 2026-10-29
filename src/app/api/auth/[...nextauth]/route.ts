import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

// Enforce IP-based rate limiting on the authentication route to prevent brute-force attacks
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // Extract client IP address for request tracking
        const ip = req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "unknown-ip";
        const now = Date.now();
        const userRecord = rateLimitMap.get(ip);
        
        if (!credentials?.email || !credentials?.password) return null;

        // Reject request if IP is locked out due to excessive failed attempts
        if (userRecord && userRecord.count >= MAX_FAILED_ATTEMPTS) {
          if (now - userRecord.timestamp < LOCKOUT_DURATION_MS) {
            throw new Error("Account locked due to too many failed attempts. Try again in 15 minutes.");
          } else {
            rateLimitMap.delete(ip);
          }
        }
        
        const user = await prisma.user.findUnique({ 
          where: { email: credentials.email } 
        });
        
        const isPasswordValid = user?.password ? await bcrypt.compare(credentials.password, user.password) : false;

        // Track failed authentication attempts
        if (!user || !isPasswordValid) {
          const currentAttempts = rateLimitMap.get(ip)?.count || 0;
          rateLimitMap.set(ip, { count: currentAttempts + 1, timestamp: now });
          throw new Error("Invalid credentials");
        }
        
        // Clear tracking on successful authentication
        rateLimitMap.delete(ip);
        
        // Map required fields for JWT payload
        return { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role 
        } as any;
      }
    })
  ],
  session: { 
    strategy: "jwt" as const,
    maxAge: 60 * 30, // 30 minutes expiration
    updateAge: 60 * 10,
  },
  jwt: {
    maxAge: 60 * 30,
  },
  pages: { signIn: '/login' },
  callbacks: {
    // Inject user role and ID into JWT token
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    // Expose user role and ID to client session
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }