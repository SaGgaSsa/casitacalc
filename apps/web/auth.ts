import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAdminEmail } from "@/lib/admin-config";

/**
 * Auth.js v5 con Google. Sesión JWT sin adapter: no hay tabla User todavía.
 * Solo pueden iniciar sesión los emails de ADMIN_EMAILS.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    signIn: ({ user }) => isAdminEmail(user?.email),
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
