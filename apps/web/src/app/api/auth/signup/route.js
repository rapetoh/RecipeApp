import { adapter } from '../../../../auth.js';
import { hash } from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');
    const callbackUrl = formData.get('callbackUrl') || '/';

    // Validate input
    if (!email || !password) {
      return Response.json(
        { success: false, error: 'MISSING_FIELDS', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await adapter.getUserByEmail(email);
    if (existingUser) {
      return Response.json(
        { success: false, error: 'USER_EXISTS', message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = await adapter.createUser({
      id: randomUUID(),
      emailVerified: null,
      email,
      name: typeof name === 'string' && name.trim().length > 0 ? name : undefined,
      image: undefined,
    });

    // Link credentials account
    await adapter.linkAccount({
      extraData: {
        password: await hash(password),
      },
      type: 'credentials',
      userId: newUser.id,
      providerAccountId: newUser.id,
      provider: 'credentials',
    });

    // Create session
    const sessionToken = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await adapter.createSession({
      sessionToken,
      userId: newUser.id,
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
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          image: newUser.image,
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
    console.error('Signup error:', error);
    return Response.json(
      { success: false, error: 'SERVER_ERROR', message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
