import { DefaultSession, DefaultJWT } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id:      string
      plan:    string
      isAdmin: boolean
    } & DefaultSession['user']
  }
  interface User {
    plan?:    string
    isAdmin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id:      string
    plan:    string
    isAdmin: boolean
  }
}
