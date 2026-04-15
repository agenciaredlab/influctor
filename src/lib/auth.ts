import { NextAuthOptions, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt', // JWT works with Credentials provider
  },

  pages: {
    signIn:  '/login',
    signOut: '/login',
    error:   '/login',
  },

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // ── Email + password ──────────────────────────────────────────────
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',      type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          image: user.image ?? user.avatar ?? null,
          plan:  user.plan,
        }
      },
    }),
  ],

  callbacks: {
    // Add user id and plan to the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.plan = (user as any).plan ?? 'free'
      }
      return token
    },
    // Expose id and plan on the session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id as string
        session.user.plan = token.plan as string
      }
      return session
    },
  },
}

/** Server-side helper — throws if not authenticated */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED')
  }
  return session.user
}

/** Server-side helper — returns null if not authenticated */
export async function getAuth() {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
}
