import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const ALLOWED_DOMAIN = 'antro.ag';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    // Bloqueia qualquer email que não seja @antro.ag
    async signIn({ user }) {
      const email = user.email ?? '';
      return email.endsWith(`@${ALLOWED_DOMAIN}`);
    },

    // Passa email e nome para o token JWT
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name  = user.name;
        token.image = user.image;
      }
      return token;
    },

    // Expõe dados da session para o cliente
    async session({ session, token }) {
      session.user.email = token.email as string;
      session.user.name  = token.name  as string;
      session.user.image = token.image as string;
      return session;
    },
  },

  pages: {
    signIn:  '/login',
    error:   '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60, // 30 dias
  },
});
