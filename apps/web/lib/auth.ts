import './load-root-env';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@aww/database';
import { Role } from '@aww/shared';
import { authConfig } from './auth.config';
import { isGoogleAuthConfigured } from './env';
import { provisionGoogleUser } from './oauth-provision';
import { loadSessionUserByEmail } from './session-user';

function applySessionToToken(
  token: Record<string, unknown>,
  sessionUser: Awaited<ReturnType<typeof loadSessionUserByEmail>>
) {
  if (!sessionUser) return token;
  token.id = sessionUser.id;
  token.organizationId = sessionUser.organizationId;
  token.branchId = sessionUser.branchId;
  token.role = sessionUser.role;
  token.branchName = sessionUser.branchName;
  token.name = sessionUser.name;
  token.picture = sessionUser.image;
  return token;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    ...(isGoogleAuthConfigured()
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            branchRoles: { include: { branch: true }, take: 1 },
          },
        });

        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        const branchRole = user.branchRoles[0];
        if (!branchRole) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          organizationId: user.organizationId,
          branchId: branchRole.branchId,
          role: branchRole.role,
          branchName: branchRole.branch.name,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          await provisionGoogleUser({
            email: user.email,
            name: user.name ?? user.email.split('@')[0],
            image: user.image,
            googleId: account.providerAccountId,
          });
        } catch (e) {
          console.error('[Google OAuth] provision failed:', e);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user && account?.provider === 'credentials') {
        return applySessionToToken(token as Record<string, unknown>, {
          id: user.id!,
          email: user.email!,
          name: user.name ?? '',
          image: user.image,
          organizationId: (user as { organizationId: string }).organizationId,
          branchId: (user as { branchId: string }).branchId,
          role: (user as { role: string }).role,
          branchName: (user as { branchName: string }).branchName,
        }) as typeof token;
      }

      const email = (user?.email ?? token.email) as string | undefined;
      if (email && (user || account || trigger === 'update')) {
        const sessionUser = await loadSessionUserByEmail(email);
        return applySessionToToken(token as Record<string, unknown>, sessionUser) as typeof token;
      }

      return token;
    },
  },
});

export function getDashboardPath(role: Role): string {
  switch (role) {
    case Role.OWNER:
    case Role.SUPER_ADMIN:
      return '/owner';
    case Role.MANAGER:
      return '/manager';
    case Role.CASHIER:
      return '/cashier';
    case Role.WORKER:
      return '/worker';
    case Role.CUSTOMER:
      return '/customer';
    default:
      return '/';
  }
}
