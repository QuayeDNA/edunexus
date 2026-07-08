import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { UserRole } from '@edunexus/shared';

declare module 'next-auth' {
  interface User {
    role: UserRole;
    schoolId: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: UserRole;
      schoolId: string | null;
      email: string;
      name: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: UserRole;
    schoolId: string | null;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            },
          );

          if (!res.ok) {
            return null;
          }

          const user = await res.json();

          if (user && user.id) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role as UserRole,
              schoolId: user.schoolId ?? null,
            };
          }

          return null;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
