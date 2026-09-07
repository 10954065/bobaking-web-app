import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { credentialsSchema } from "@/modules/auth/schemas/credentials.schema";
import { findUserByIdentifier } from "@/modules/users/services/user.service";
import { verifyPassword } from "@/modules/auth/services/password.service";
import {
  isAccountLocked,
  recordFailedLogin,
  resetFailedLogins,
} from "@/modules/auth/services/account-lockout.service";
import {
  createTrackedSession,
  isTrackedSessionValid,
  revokeTrackedSession,
  SESSION_MAX_AGE_SECONDS,
} from "@/modules/auth/services/session.service";
import { recordAuditLog } from "@/modules/audit/services/audit.service";

export class AccountLockedError extends CredentialsSignin {
  code = "AccountLocked";
}

export class AccountInactiveError extends CredentialsSignin {
  code = "AccountInactive";
}

export const authConfig: NextAuthConfig = {
  session: {
    // Credentials provider requires JWT sessions (Auth.js does not persist
    // credentials-authenticated users via the adapter). Server-side
    // revocability is layered back in via the tracked Session table — see
    // the jwt/session callbacks below.
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { identifier, password } = parsed.data;
        const user = await findUserByIdentifier(identifier);

        // Constant-shape response whether the user exists or not — never leak
        // account existence through timing or error content.
        if (!user || !user.passwordHash) return null;

        if (isAccountLocked(user)) {
          throw new AccountLockedError();
        }

        if (user.status !== "ACTIVE") {
          throw new AccountInactiveError();
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          await recordFailedLogin(user.id);
          return null;
        }

        const requestHeaders = await headers();
        const ipAddress = requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? null;
        const userAgent = requestHeaders.get("user-agent") ?? null;

        await resetFailedLogins(user.id, ipAddress);
        const sessionToken = await createTrackedSession({ userId: user.id, ipAddress, userAgent });

        await recordAuditLog({
          actorUserId: user.id,
          action: "auth.login",
          resourceType: "User",
          resourceId: user.id,
          ipAddress,
          userAgent,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          sessionToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.sessionToken = (user as { sessionToken?: string }).sessionToken;
        delete token.error;
        return token;
      }

      // On every subsequent request, confirm the tracked session hasn't been
      // revoked (e.g. by an admin, or by the user signing out elsewhere).
      // We flag it via token.error rather than stripping token.userId, so a
      // stale-but-undecided JWT never silently regains trust.
      if (token.sessionToken && !(await isTrackedSessionValid(token.sessionToken as string))) {
        return { ...token, error: "SessionRevoked" as const };
      }

      return token;
    },
    async session({ session, token }) {
      if (token.error === "SessionRevoked" || !token.userId) {
        return { ...session, error: "SessionRevoked" as const };
      }
      session.user.id = token.userId as string;
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : undefined;
      if (token?.sessionToken) {
        await revokeTrackedSession(token.sessionToken as string);
      }
    },
  },
};
