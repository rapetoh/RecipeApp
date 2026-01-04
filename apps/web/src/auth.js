import { initAuthConfig } from '@hono/auth-js';
import Credentials from '@auth/core/providers/credentials';
import { hash, verify } from 'argon2';
import sql from './app/api/utils/sql.js';

function Adapter(client) {
  return {
    async createVerificationToken(verificationToken) {
      const { identifier, expires, token } = verificationToken;
      await sql`
        INSERT INTO auth_verification_token (identifier, expires, token)
        VALUES (${identifier}, ${expires}, ${token})
      `;
      return verificationToken;
    },
    async useVerificationToken({ identifier, token }) {
      const result = await sql`
        DELETE FROM auth_verification_token
        WHERE identifier = ${identifier} AND token = ${token}
        RETURNING identifier, expires, token
      `;
      return result.length > 0 ? result[0] : null;
    },
    async createUser(user) {
      const { name, email, emailVerified, image } = user;
      const result = await sql`
        INSERT INTO auth_users (name, email, "emailVerified", image)
        VALUES (${name}, ${email}, ${emailVerified}, ${image})
        RETURNING id, name, email, "emailVerified", image
      `;
      return result[0];
    },
    async getUser(id) {
      try {
        const result = await sql`
          SELECT * FROM auth_users WHERE id = ${id}
        `;
        return result.length === 0 ? null : result[0];
      } catch {
        return null;
      }
    },
    async getUserByEmail(email) {
      const result = await sql`
        SELECT * FROM auth_users WHERE email = ${email}
      `;
      if (result.length === 0) {
        return null;
      }
      const userData = result[0];
      const accountsData = await sql`
        SELECT * FROM auth_accounts WHERE "providerAccountId" = ${userData.id}
      `;
      return {
        ...userData,
        accounts: accountsData,
      };
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const result = await sql`
        SELECT u.* FROM auth_users u
        JOIN auth_accounts a ON u.id = a."userId"
        WHERE a.provider = ${provider} AND a."providerAccountId" = ${providerAccountId}
      `;
      return result.length !== 0 ? result[0] : null;
    },
    async updateUser(user) {
      const oldUserResult = await sql`
        SELECT * FROM auth_users WHERE id = ${user.id}
      `;
      const oldUser = oldUserResult[0];
      const newUser = { ...oldUser, ...user };
      const { id, name, email, emailVerified, image } = newUser;
      const result = await sql`
        UPDATE auth_users
        SET name = ${name}, email = ${email}, "emailVerified" = ${emailVerified}, image = ${image}
        WHERE id = ${id}
        RETURNING name, id, email, "emailVerified", image
      `;
      return result[0];
    },
    async linkAccount(account) {
      const result = await sql`
        INSERT INTO auth_accounts (
          "userId", provider, type, "providerAccountId",
          access_token, expires_at, refresh_token, id_token,
          scope, session_state, token_type, password
        )
        VALUES (
          ${account.userId}, ${account.provider}, ${account.type}, ${account.providerAccountId},
          ${account.access_token || null}, ${account.expires_at || null},
          ${account.refresh_token || null}, ${account.id_token || null},
          ${account.scope || null}, ${account.session_state || null},
          ${account.token_type || null}, ${account.extraData?.password || null}
        )
        RETURNING id, "userId", provider, type, "providerAccountId",
          access_token, expires_at, refresh_token, id_token,
          scope, session_state, token_type, password
      `;
      return result[0];
    },
    async createSession({ sessionToken, userId, expires }) {
      if (userId === undefined) {
        throw Error('userId is undefined in createSession');
      }
      const result = await sql`
        INSERT INTO auth_sessions ("userId", expires, "sessionToken")
        VALUES (${userId}, ${expires}, ${sessionToken})
        RETURNING id, "sessionToken", "userId", expires
      `;
      return result[0];
    },
    async getSessionAndUser(sessionToken) {
      if (sessionToken === undefined) {
        return null;
      }
      const sessionResult = await sql`
        SELECT * FROM auth_sessions WHERE "sessionToken" = ${sessionToken}
      `;
      if (sessionResult.length === 0) {
        return null;
      }
      const session = sessionResult[0];
      const userResult = await sql`
        SELECT * FROM auth_users WHERE id = ${session.userId}
      `;
      if (userResult.length === 0) {
        return null;
      }
      const user = userResult[0];
      return { session, user };
    },
    async updateSession(session) {
      const { sessionToken } = session;
      const existingResult = await sql`
        SELECT * FROM auth_sessions WHERE "sessionToken" = ${sessionToken}
      `;
      if (existingResult.length === 0) {
        return null;
      }
      const originalSession = existingResult[0];
      const newSession = { ...originalSession, ...session };
      const result = await sql`
        UPDATE auth_sessions
        SET expires = ${newSession.expires}
        WHERE "sessionToken" = ${newSession.sessionToken}
        RETURNING *
      `;
      return result[0];
    },
    async deleteSession(sessionToken) {
      await sql`
        DELETE FROM auth_sessions WHERE "sessionToken" = ${sessionToken}
      `;
    },
    async unlinkAccount(partialAccount) {
      const { provider, providerAccountId } = partialAccount;
      await sql`
        DELETE FROM auth_accounts
        WHERE "providerAccountId" = ${providerAccountId} AND provider = ${provider}
      `;
    },
    async deleteUser(userId) {
      await sql`DELETE FROM auth_users WHERE id = ${userId}`;
      await sql`DELETE FROM auth_sessions WHERE "userId" = ${userId}`;
      await sql`DELETE FROM auth_accounts WHERE "userId" = ${userId}`;
    },
  };
}

const adapter = Adapter();

// Export the config function (not the middleware handler)
export const getAuthConfig = () => ({
  adapter,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text', required: false },
        credentials: { label: 'Action', type: 'text', required: false },
      },
      authorize: async (credentials) => {
        const { email, password, name, credentials: action } = credentials;
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        const user = await adapter.getUserByEmail(email);
        const isSignup = action === 'signup';

        if (isSignup) {
          // Signup: create user if doesn't exist
          if (!user) {
            const newUser = await adapter.createUser({
              id: crypto.randomUUID(),
              emailVerified: null,
              email,
              name:
                typeof name === 'string' && name.trim().length > 0
                  ? name
                  : undefined,
              image: undefined,
            });
            await adapter.linkAccount({
              extraData: {
                password: await hash(password),
              },
              type: 'credentials',
              userId: newUser.id,
              providerAccountId: newUser.id,
              provider: 'credentials',
            });
            return newUser;
          }
          return null; // User already exists
        } else {
          // Signin: verify password for existing user
          if (!user) {
            return null;
          }
          const matchingAccount = user.accounts.find(
            (account) => account.provider === 'credentials'
          );
          const accountPassword = matchingAccount?.password;
          if (!accountPassword) {
            return null;
          }

          const isValid = await verify(accountPassword, password);
          if (!isValid) {
            return null;
          }

          return user;
        }
      },
    }),
  ],
  pages: {
    signIn: '/account/signin',
    signOut: '/account/logout',
  },
});

// Also export adapter for direct use if needed
export { adapter };

