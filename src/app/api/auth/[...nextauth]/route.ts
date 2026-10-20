import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate presence of credentials
        if (!credentials?.email || !credentials?.password) return null;
        
        // Retrieve user record from the database
        const user = await prisma.user.findUnique({ 
          where: { email: credentials.email } 
        });
        
        // Validate user existence and password presence to resolve strict TypeScript typing
        if (!user || !user.password) return null;
        
        // Authenticate the provided password against the stored hash
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;
        
        return { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role 
        };
      }
    })
  ],
  session: { strategy: "jwt" as const },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
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