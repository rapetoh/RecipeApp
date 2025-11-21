import { adapter } from '@/auth';
import { verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import sql from '@/app/api/utils/sql';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');
    const callbackUrl = formData.get('callbackUrl') || '/';

    // Validate input
    if (!email || !password) {
      return Response.json(
        { success: false, error: 'MISSING_FIELDS', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await adapter.getUserByEmail(email);
    if (!user) {
      return Response.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Find credentials account
    const accountsData = await sql`
      SELECT * FROM auth_accounts WHERE "userId" = ${user.id} AND provider = 'credentials'
    `;
    const matchingAccount = accountsData[0];
    if (!matchingAccount || !matchingAccount.password) {
      return Response.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verify(matchingAccount.password, password);
    if (!isValid) {
      return Response.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await adapter.createSession({
      sessionToken,
      userId: user.id,
      expires,
    });

    // Set cookie
    const cookieHeader = `authjs.session-token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`;
    
    // Return JSON response
    return Response.json(
      {
        success: true,
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
        redirect: callbackUrl,
        isMobileCallback: callbackUrl === '/api/auth/token',
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (error) {
    console.error('Signin error:', error);
    return Response.json(
      { success: false, error: 'SERVER_ERROR', message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
