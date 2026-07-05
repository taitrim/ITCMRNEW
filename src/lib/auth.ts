import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.email as string;
        const password = credentials?.password as string;
        if (!username || !password) return null;

        const user = await prisma.users.findFirst({
          where: { name: username, isActive: 1, isDeleted: false },
          include: { profiles: { select: { name: true } } },
        });
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.realname || user.name || undefined,
          email: user.name || undefined,
          role: user.profiles?.name || "user",
          organizationId: user.entitiesId || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      // Luôn cho phép login page, auth API routes, và agent inventory (dùng token)
      if (
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/agent-inventory")
      ) return true;
      // Chặn nếu chưa đăng nhập
      return !!auth?.user;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id || token.sub) as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.organizationId = (token.organizationId as string) || "";
      }
      return session;
    },
  },
});
