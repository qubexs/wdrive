import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { env } from "@/env.mjs";
import { db } from "@/server/db";
import { USER_STORAGE_LIMIT_BYTES } from "@/constants/storage";

/** Absolute login lifetime: 24h from last successful sign-in. */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

/** Fail-open helper: never let a slow DB block /api/auth/session. */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([
    promise.then((v) => v as T | null),
    new Promise<T | null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    error?: string;
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      canDownload: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canUpload: boolean;
      canRename: boolean;
      canMove: boolean;
      canCopy: boolean;
      canShare: boolean;
      isActive: boolean;
      storageLimitBytes: number | null;
    };
  }
  interface User {
    role?: string;
    canDownload?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canUpload?: boolean;
    canRename?: boolean;
    canMove?: boolean;
    canCopy?: boolean;
    canShare?: boolean;
    isActive?: boolean;
    storageLimitBytes?: number | null;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    error?: string;
    role?: string;
    canDownload?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canUpload?: boolean;
    canRename?: boolean;
    canMove?: boolean;
    canCopy?: boolean;
    canShare?: boolean;
    isActive?: boolean;
    storageLimitBytes?: number | null;
    /** Unix seconds of the successful sign-in this token was issued for. */
    loginAt?: number;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, user, token }) => {
      // Propagate JWT errors (e.g. absolute 24h expiry) so the client
      // AuthGate can sign out instead of hanging on "loading".
      const tokenError = (token as any)?.error as string | undefined;
      // JWT (credentials) flow uses token, DB flow uses user
      const userId = user?.id ?? (token?.sub as string | undefined);
      if (userId) {
        return {
          ...session,
          ...(tokenError ? { error: tokenError } : {}),
          user: {
            ...session.user,
            id: userId,
            role: (user as any)?.role ?? (token as any)?.role ?? "USER",
            canDownload: (user as any)?.canDownload ?? (token as any)?.canDownload ?? true,
            canEdit: (user as any)?.canEdit ?? (token as any)?.canEdit ?? true,
            canDelete: (user as any)?.canDelete ?? (token as any)?.canDelete ?? false,
            canUpload: (user as any)?.canUpload ?? (token as any)?.canUpload ?? true,
            canRename: (user as any)?.canRename ?? (token as any)?.canRename ?? true,
            canMove: (user as any)?.canMove ?? (token as any)?.canMove ?? true,
            canCopy: (user as any)?.canCopy ?? (token as any)?.canCopy ?? true,
            canShare: (user as any)?.canShare ?? (token as any)?.canShare ?? true,
            isActive: (user as any)?.isActive ?? (token as any)?.isActive ?? true,
            image: (user as any)?.image ?? (token as any)?.image ?? null,
            // null = unlimited (only undefined falls back to default)
            storageLimitBytes: (user as any)?.storageLimitBytes !== undefined ? (user as any)?.storageLimitBytes : ((token as any)?.storageLimitBytes !== undefined ? (token as any)?.storageLimitBytes : USER_STORAGE_LIMIT_BYTES),
          },
        };
      }
      if (tokenError) return { ...session, error: tokenError };
      return session;
    },
    jwt: async ({ token, user }) => {
      const nowSec = Math.floor(Date.now() / 1000);
      if (user) {
        token.sub = user.id;
        (token as any).error = undefined;
        (token as any).role = (user as any).role;
        (token as any).canDownload = (user as any).canDownload;
        (token as any).canEdit = (user as any).canEdit;
        (token as any).canDelete = (user as any).canDelete;
        (token as any).canUpload = (user as any).canUpload;
        (token as any).canRename = (user as any).canRename;
        (token as any).canMove = (user as any).canMove;
        (token as any).canCopy = (user as any).canCopy;
        (token as any).canShare = (user as any).canShare;
        (token as any).isActive = (user as any).isActive;
        (token as any).image = (user as any).image ?? null;
        (token as any).storageLimitBytes = (user as any).storageLimitBytes !== undefined ? (user as any).storageLimitBytes : USER_STORAGE_LIMIT_BYTES;
        // fresh sign-in starts a new 24h window
        (token as any).loginAt = nowSec;
        return token;
      }
      if (token?.sub) {
        // Short-circuit already-expired tokens: never return null here.
        // Returning null crashes next-auth/jose with
        // "JWT Claims Set MUST be an object", which makes
        // /api/auth/session fail and leaves useSession() stuck on
        // "loading" forever. Instead flag the error and let AuthGate sign out.
        if ((token as any).error === "SessionExpired") return token;
        // Absolute 24h lifetime from last sign-in (covers idle + active).
        // Old tokens issued before loginAt existed fall back to iat.
        const loginAt =
          (token as any).loginAt ??
          (token as any).iat ??
          nowSec;
        // backfill so subsequent checks have an explicit value
        (token as any).loginAt = loginAt;
        if (nowSec - loginAt > SESSION_MAX_AGE_SECONDS) {
          return { ...token, error: "SessionExpired" };
        }
        // refresh perms from DB so admin changes apply without re-login.
        // Fail-open with 4s timeout: a slow DB must not hang
        // /api/auth/session (the old "Redirecting to login..." hang).
        try {
          const dbUser = await withTimeout(
            db.user.findUnique({
              where: { id: token.sub as string },
              select: { role: true, canDownload: true, canEdit: true, canDelete: true, canUpload: true, canRename: true, canMove: true, canCopy: true, canShare: true, isActive: true, email: true, storageLimitBytes: true, image: true },
            }),
            4000,
          );
          if (dbUser) {
            const adminEmails = (env.ADMIN_EMAILS ?? "")
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            const isHardAdmin = dbUser.email?.toLowerCase() === "demo@local.dev" || adminEmails.includes(dbUser.email?.toLowerCase() ?? "");
            (token as any).role = isHardAdmin ? "ADMIN" : dbUser.role;
            (token as any).canDownload = dbUser.canDownload;
            (token as any).canEdit = dbUser.canEdit;
            (token as any).canDelete = dbUser.canDelete;
            (token as any).canUpload = (dbUser as any).canUpload;
            (token as any).canRename = (dbUser as any).canRename;
            (token as any).canMove = (dbUser as any).canMove;
            (token as any).canCopy = (dbUser as any).canCopy;
            (token as any).canShare = (dbUser as any).canShare;
            (token as any).isActive = dbUser.isActive;
            (token as any).image = (dbUser as any).image ?? null;
            (token as any).storageLimitBytes = (dbUser as any).storageLimitBytes !== undefined ? (dbUser as any).storageLimitBytes : USER_STORAGE_LIMIT_BYTES;
          }
        } catch {}
      }
      return token;
    },
  },
  // Use JWT for credentials so DB sessions are not required.
  // 24h absolute lifetime: cookie/JWT exp + explicit loginAt check above.
  // updateAge = maxAge so an active user does NOT silently extend past 24h.
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS, updateAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/wdrive/auth/signin" },
  adapter: PrismaAdapter(db),
  providers: [
    // Keep Google if env vars are set, add Credentials always
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@local.dev" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const existing = await db.user.findUnique({ where: { email } });

        const adminEmails = (env.ADMIN_EMAILS ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const isHardAdmin = (e: string) => e === "demo@local.dev" || adminEmails.includes(e);

        const mapUser = (u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image ?? null,
          role: isHardAdmin((u.email ?? "").toLowerCase()) ? "ADMIN" : u.role,
          canDownload: u.canDownload,
          canEdit: u.canEdit,
          canDelete: isHardAdmin((u.email ?? "").toLowerCase()) ? true : u.canDelete,
          canUpload: u.canUpload,
          canRename: u.canRename,
          canMove: u.canMove,
          canCopy: u.canCopy,
          canShare: u.canShare,
          isActive: u.isActive,
          storageLimitBytes: (u as any).storageLimitBytes !== undefined ? (u as any).storageLimitBytes : USER_STORAGE_LIMIT_BYTES,
        });

        // No auto-register: accounts are created via /api/auth/register
        // (pending admin approval) or by an admin. Unknown emails fail here.
        if (!existing) return null;

        // Pending approval vs admin-disabled get distinct errors so the
        // sign-in page can show the right message (thrown Errors surface
        // as res.error with redirect:false).
        if (!existing.isActive) {
          if (!(existing as any).isApproved) throw new Error("PendingApproval");
          throw new Error("AccountDisabled");
        }

        // If user has no password (e.g. Google account), set one on first credentials login
        if (!existing.password) {
          const hashed = await bcrypt.hash(credentials.password, 10);
          const updated = await db.user.update({ where: { id: existing.id }, data: { password: hashed } });
          return mapUser(updated);
        }

        const valid = await bcrypt.compare(credentials.password, existing.password);
        if (!valid) return null;
        return mapUser(existing);
      },
    }),
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
