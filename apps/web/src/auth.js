import { initAuthConfig } from '@hono/auth-js';
import Credentials from '@auth/core/providers/credentials';
import Google from '@auth/core/providers/google';
import Apple from '@auth/core/providers/apple';
import { hash, verify } from 'argon2';
import sql from './app/api/utils/sql.js';
import { SignJWT, importPKCS8 } from 'jose';

// Generate Apple client secret JWT
// Apple requires a JWT signed with your private key as the client secret
let appleClientSecret = null;
let appleClientSecretError = null;

async function generateAppleClientSecret() {
  try {
    if (!process.env.APPLE_PRIVATE_KEY || !process.env.APPLE_TEAM_ID || 
        !process.env.APPLE_CLIENT_ID || !process.env.APPLE_KEY_ID) {
      console.log('❌ Apple OAuth: Missing required environment variables');
      return null;
    }

    // Process the private key - handle both escaped and real newlines
    let privateKey = process.env.APPLE_PRIVATE_KEY;
    
    // If the key has literal \n, replace with actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Ensure proper PEM format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.log('❌ Apple OAuth: Private key missing BEGIN marker');
      return null;
    }
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      console.log('❌ Apple OAuth: Private key missing END marker');
      return null;
    }

    console.log('🔍 Apple OAuth: Private key format check passed');
    console.log('🔍 Apple OAuth: Key length:', privateKey.length);

    // Import the private key
    const secret = await importPKCS8(privateKey, 'ES256');
    console.log('✅ Apple OAuth: Private key imported successfully');

    // Generate the JWT client secret
    const jwt = await new SignJWT({})
      .setAudience('https://appleid.apple.com')
      .setIssuer(process.env.APPLE_TEAM_ID)
      .setIssuedAt()
      .setExpirationTime('180 days') // Max is 6 months
      .setSubject(process.env.APPLE_CLIENT_ID)
      .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID })
      .sign(secret);

    console.log('✅ Apple OAuth: Client secret JWT generated successfully');
    console.log('🔍 Apple OAuth: JWT preview:', jwt.substring(0, 50) + '...');
    
    return jwt;
  } catch (error) {
    console.error('❌ Apple OAuth: Failed to generate client secret:', error.message);
    console.error('❌ Apple OAuth: Error details:', error);
    appleClientSecretError = error;
    return null;
  }
}

// Generate the client secret at startup
generateAppleClientSecret().then(secret => {
  appleClientSecret = secret;
  if (secret) {
    console.log('✅ Apple OAuth: Client secret ready for use');
  } else {
    console.log('❌ Apple OAuth: Client secret generation failed');
  }
});

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
export const getAuthConfig = () => {
  const providers = [
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
  ];

  // Add Google OAuth provider if credentials are configured
  console.log('🔍 Checking Google OAuth credentials:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    clientIdPreview: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'missing',
  });
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('✅ Adding Google OAuth provider');
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Disable all verification checks for mobile compatibility
        // Both PKCE and state use __Secure- cookies which don't persist
        // in mobile embedded browsers (expo-web-browser)
        checks: [],
        // Allow linking OAuth account to existing email account
        allowDangerousEmailAccountLinking: true,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
          },
        },
      })
    );
  } else {
    console.log('❌ Google OAuth provider NOT added - missing credentials');
  }

  // Add Apple OAuth provider if credentials are configured
  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  ) {
    if (appleClientSecret) {
      console.log('✅ Adding Apple OAuth provider with pre-generated client secret');
      providers.push(
        Apple({
          clientId: process.env.APPLE_CLIENT_ID,
          // Use our pre-generated JWT client secret instead of private key
          clientSecret: appleClientSecret,
          // Disable all verification checks for mobile compatibility
          checks: [],
          // Allow linking OAuth account to existing email account
          allowDangerousEmailAccountLinking: true,
        })
      );
    } else {
      console.log('❌ Apple OAuth provider NOT added - client secret generation failed');
      if (appleClientSecretError) {
        console.log('❌ Error was:', appleClientSecretError.message);
      }
    }
  }

  console.log(`🔍 Total providers: ${providers.length}`);
  console.log('🔍 Provider IDs:', providers.map(p => {
    const id = p.id || (p.name && p.name.toLowerCase()) || 'unknown';
    return id;
  }).join(', '));

  return {
    adapter,
    providers,
    pages: {
      signIn: '/account/signin',
      signOut: '/account/logout',
    },
  };
};

// Also export adapter for direct use if needed
export { adapter };

