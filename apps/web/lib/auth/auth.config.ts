import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { scryptSync, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db/client';
import { profiles } from '@edunexus/database';
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

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = parts[1];
  const hash = parts[2];
  const inputHash = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(inputHash), Buffer.from(hash));
}

const nextAuthResult = NextAuth({
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
          const row = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, email))
            .then((rows) => rows[0] ?? null);

          if (!row || !row.passwordHash) return null;
          if (!verifyPassword(password, row.passwordHash)) return null;

          return {
            id: row.id,
            email: row.email,
            name: `${row.firstName} ${row.lastName}`,
            role: row.role as UserRole,
            schoolId: row.schoolId ?? null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).role = user.role;
        (token as any).schoolId = user.schoolId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as any).role = token.role ?? null;
        (session.user as any).schoolId = token.schoolId ?? null;
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

export const auth = nextAuthResult.auth as unknown as (...args: any[]) => any;
export const handlers = nextAuthResult.handlers as unknown as {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
};
export const signIn = nextAuthResult.signIn as unknown as (...args: any[]) => any;
export const signOut = nextAuthResult.signOut as unknown as (...args: any[]) => any;
