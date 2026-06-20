import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/forgot-password') ||
        nextUrl.pathname.startsWith('/reset-password');
      const isPublic =
        nextUrl.pathname === '/welcome' ||
        nextUrl.pathname.startsWith('/welcome') ||
        nextUrl.pathname.startsWith('/book') ||
        nextUrl.pathname.startsWith('/track') ||
        nextUrl.pathname === '/manifest.webmanifest' ||
        nextUrl.pathname.startsWith('/api/v1/orders/track') ||
        nextUrl.pathname.startsWith('/api/v1/health') ||
        nextUrl.pathname.startsWith('/api/v1/cron') ||
        nextUrl.pathname.startsWith('/api/auth');

      if (isPublic) return true;
      if (!isLoggedIn && !isAuthPage) return false;
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL('/', nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.organizationId = (user as { organizationId: string }).organizationId;
        token.branchId = (user as { branchId: string }).branchId;
        token.role = (user as { role: string }).role;
        token.branchName = (user as { branchName: string }).branchName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.branchId = token.branchId as string;
        session.user.role = token.role as never;
        session.user.branchName = token.branchName as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
