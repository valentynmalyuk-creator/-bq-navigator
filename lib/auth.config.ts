import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Prisma, no bcrypt.
// Used by middleware; extended by lib/auth.ts with the full provider + adapter.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      if (nextUrl.pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [],
};
