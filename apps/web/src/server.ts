import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createHonoServer } from 'react-router-hono-server/node';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Handler } from 'hono/types';
import { authHandler, initAuthConfig, verifyAuth } from '@hono/auth-js';
import { getAuthConfig } from './auth';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Fix: API routes need to be found correctly in both dev and production
// In production build, __dirname is build/server/, routes are at build/server/app/api
// In development, __dirname is src/, routes are at src/app/api
const isProduction = process.env.NODE_ENV === 'production';
const initialApiDir = join(__dirname, 'app', 'api');

console.log('🔍 __dirname:', __dirname);
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 Initial API_DIR:', initialApiDir);

// Helper function to resolve API directory path (reused by handlers and registerRoutes)
async function resolveApiDir(): Promise<string> {
  try {
    const dirStat = await stat(initialApiDir);
    if (dirStat.isDirectory()) {
      console.log('✅ API_DIR exists and is a directory:', initialApiDir);
      return initialApiDir;
    }
  } catch (error) {
    // Try alternative paths (same order as registerRoutes logic)
    const altPaths = [
      join(process.cwd(), 'src', 'app', 'api'),
      join(process.cwd(), 'build', 'server', 'app', 'api'),
      join(__dirname, '..', '..', 'src', 'app', 'api'),
      join(__dirname, '..', 'app', 'api'),
    ];
    
    for (const altPath of altPaths) {
      try {
        console.log(`🔍 Trying alternative path: ${altPath}`);
        const altStat = await stat(altPath);
        if (altStat.isDirectory()) {
          console.log(`✅ Found alternative path, using: ${altPath}`);
          return altPath;
        }
      } catch (e) {
        // Continue to next alternative
      }
    }
  }
  
  // Fallback to initial path
  console.log('⚠️  Using fallback API_DIR:', initialApiDir);
  return initialApiDir;
}

// Resolve API directory ONCE at startup (before handlers are defined)
const RESOLVED_API_DIR = await resolveApiDir();
console.log('✅ Resolved API directory:', RESOLVED_API_DIR);

const app = new Hono();
const api = new Hono(); // Separate Hono instance for API routes

// Cache the base auth config (providers don't change per-request)
// This ensures providers are loaded once and reused, preventing potential issues
const baseAuthConfig = getAuthConfig();
console.log('✅ Base auth config loaded with', baseAuthConfig.providers?.length || 0, 'providers');

// Initialize auth middleware
app.use('*', initAuthConfig((c) => {
  const authConfig = {
    ...baseAuthConfig, // Use cached config instead of calling getAuthConfig() every time
    secret: process.env.AUTH_SECRET || 'fallback-secret-change-in-production',
    basePath: '/api/auth',
    trustHost: true,
    debug: true, // Enable debug logging for Auth.js
  };
  
  // Always use HTTPS in production (Render always uses HTTPS)
  const protocol = 'https';
  const host = c.req.header('host') || c.req.header('x-forwarded-host') || 'recipe-app-web-xtnu.onrender.com';
  authConfig.url = `${protocol}://${host}`;
  
  return authConfig;
}));

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// TEST: Simple endpoint to verify POST requests work
app.post('/api/test-post', async (c) => {
  console.log('✅ TEST POST RECEIVED!');
  return c.json({ success: true, message: 'POST request reached server' });
});

// Register signin/signup endpoints DIRECTLY on main app BEFORE Auth middleware
// This ensures they're handled before Auth.js intercepts them
app.post('/api/auth/signin', async (c) => {
  console.log('✅ POST /api/auth/signin received');
  try {
    const { pathToFileURL } = await import('node:url');
    const signinRoutePath = join(RESOLVED_API_DIR, 'auth', 'signin', 'route.js');
    const routeUrl = pathToFileURL(signinRoutePath).href;
    const route = await import(/* @vite-ignore */ `${routeUrl}?update=${Date.now()}`);
    const request = c.req.raw;
    const response = await route.POST(request);
    console.log('✅ Signin route handler executed successfully');
    return response;
  } catch (error) {
    console.error('❌ Error in signin route:', error);
    return c.text('Internal server error', 500);
  }
});

app.post('/api/auth/signup', async (c) => {
  console.log('✅ POST /api/auth/signup received');
  try {
    const { pathToFileURL } = await import('node:url');
    const signupRoutePath = join(RESOLVED_API_DIR, 'auth', 'signup', 'route.js');
    const routeUrl = pathToFileURL(signupRoutePath).href;
    const route = await import(/* @vite-ignore */ `${routeUrl}?update=${Date.now()}`);
    const request = c.req.raw;
    const response = await route.POST(request);
    console.log('✅ Signup route handler executed successfully');
    return response;
  } catch (error) {
    console.error('❌ Error in signup route:', error);
    return c.text('Internal server error', 500);
  }
});

// Reject GET requests to signin/signup (should only be POST)
app.get('/api/auth/signin', (c) => {
  return c.html('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Method Not Allowed</title></head><body><p>This endpoint only accepts POST requests. Please use the signin form.</p><script>setTimeout(() => window.location.href = "/account/signin", 2000);</script></body></html>', 405);
});

app.get('/api/auth/signup', (c) => {
  return c.html('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Method Not Allowed</title></head><body><p>This endpoint only accepts POST requests. Please use the signup form.</p><script>setTimeout(() => window.location.href = "/account/signup", 2000);</script></body></html>', 405);
});

// CRITICAL FIX: Handle OAuth GET requests for mobile apps
// Auth.js requires POST to /api/auth/signin/:provider with CSRF token
// This endpoint handles GET requests by auto-submitting a form
app.get('/api/auth/oauth/:provider', async (c) => {
  const provider = c.req.param('provider');
  const callbackUrl = c.req.query('callbackUrl') || '/';
  const protocol = 'https';
  const host = c.req.header('host') || c.req.header('x-forwarded-host') || 'recipe-app-web-xtnu.onrender.com';
  const baseUrl = `${protocol}://${host}`;
  
  console.log(`🔐 OAuth redirect for provider: ${provider}, callbackUrl: ${callbackUrl}`);
  
  // Fetch CSRF token from Auth.js
  try {
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
      headers: {
        'Cookie': c.req.header('Cookie') || '',
      },
    });
    
    if (!csrfResponse.ok) {
      console.error('❌ Failed to get CSRF token');
      return c.html('<!DOCTYPE html><html><body><p>Error: Could not initialize OAuth flow</p></body></html>', 500);
    }
    
    const csrfData = await csrfResponse.json() as { csrfToken: string };
    const csrfToken = csrfData.csrfToken;
    
    // Set the CSRF cookie from the response
    const setCookieHeader = csrfResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      c.header('Set-Cookie', setCookieHeader);
    }
    
    // Return an HTML page that auto-submits a form to the OAuth provider
    // This bridges the GET request to Auth.js's required POST
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to ${provider}...</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0;
      background: #f5f5f5;
    }
    .loader { 
      text-align: center; 
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #ddd;
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting to ${provider}...</p>
  </div>
  <form id="oauth-form" action="${baseUrl}/api/auth/signin/${provider}" method="POST" style="display:none;">
    <input type="hidden" name="csrfToken" value="${csrfToken}" />
    <input type="hidden" name="callbackUrl" value="${callbackUrl}" />
  </form>
  <script>
    document.getElementById('oauth-form').submit();
  </script>
</body>
</html>`;
    
    return c.html(html);
  } catch (error) {
    console.error('❌ OAuth redirect error:', error);
    return c.html('<!DOCTYPE html><html><body><p>Error: Could not initialize OAuth flow</p></body></html>', 500);
  }
});

// Also handle the pattern /api/auth/signin/:provider for backwards compatibility
// This intercepts before Auth.js and redirects to our oauth endpoint
app.get('/api/auth/signin/:provider', (c) => {
  const provider = c.req.param('provider');
  const callbackUrl = c.req.query('callbackUrl') || '/';
  // Redirect to our oauth endpoint which handles the POST flow
  return c.redirect(`/api/auth/oauth/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
});

// Register auth routes AFTER custom endpoints
// This must be registered on the main app, not the api sub-app
const authMiddleware = authHandler();
app.use('/api/auth/*', async (c, next) => {
  // Skip Auth.js middleware for our custom signin/signup endpoints (already handled above)
  const path = c.req.path;
  if (path === '/api/auth/signin' || path === '/api/auth/signup') {
    return next(); // Should not reach here, but just in case
  }
  console.log('🔐 Auth route accessed:', c.req.method, c.req.path, 'URL:', c.req.url);
  return authMiddleware(c, next);
});

// Helper to transform file path to Hono route path
function getHonoPath(routeFile: string, apiDir: string): string {
  // Normalize paths for comparison
  const normalizedRouteFile = routeFile.replace(/\\/g, '/');
  const normalizedApiDir = apiDir.replace(/\\/g, '/');
  
  // Get relative path from API directory
  if (!normalizedRouteFile.startsWith(normalizedApiDir)) {
    console.error(`Route file ${normalizedRouteFile} is not under API dir ${normalizedApiDir}`);
    return '/';
  }
  
  const relativePath = normalizedRouteFile
    .replace(normalizedApiDir, '')
    .replace(/^\//, '')
    .replace(/\/route\.js$/, '');
  
  if (!relativePath) {
    return '/';
  }
  
  const parts = relativePath.split('/').filter(Boolean);
  const transformedParts = parts.map(segment => {
    // Handle [id] -> :id, [...rest] -> *
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramName = segment.slice(1, -1);
      if (paramName.startsWith('...')) {
        return '*';
      }
      return `:${paramName}`;
    }
    return segment;
  });
  
  return `/${transformedParts.join('/')}`;
}

// Recursively find all route.js files
async function findRouteFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  let routes: string[] = [];

  for (const file of files) {
    try {
      const filePath = join(dir, file);
      const statResult = await stat(filePath);

      if (statResult.isDirectory()) {
        routes = routes.concat(await findRouteFiles(filePath));
      } else if (file === 'route.js') {
        routes.push(filePath);
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }

  return routes;
}

// Register all API routes
async function registerRoutes() {
  console.log('🔍 Starting route registration...');
  console.log('🔍 Using resolved API directory:', RESOLVED_API_DIR);
  
  // Use the pre-resolved API directory (already resolved at startup)
  const apiDirToUse = RESOLVED_API_DIR;

  const routeFiles = await findRouteFiles(apiDirToUse).catch((err) => {
    console.error('❌ Error finding route files:', err);
    return [];
  });

  console.log(`🔍 Found ${routeFiles.length} route files`);
  if (routeFiles.length > 0) {
    console.log('Route files:');
    routeFiles.forEach(file => console.log('  -', file));
  }

  // Sort routes by length (longest first) to handle nested routes correctly
  routeFiles.sort((a, b) => b.length - a.length);

  let registeredCount = 0;
  for (const routeFile of routeFiles) {
    try {
      // Skip signin/signup routes - they're registered directly on main app
      const honoPath = getHonoPath(routeFile, apiDirToUse);
      if (honoPath === '/auth/signin' || honoPath === '/auth/signup') {
        console.log(`⏭️  Skipping ${honoPath} - registered directly on main app`);
        continue;
      }

      // Use file:// URL for dynamic imports in SSR (standard Node.js approach)
      const fileUrl = pathToFileURL(routeFile).href;
      const importPath = `${fileUrl}?update=${Date.now()}`;
      
      console.log(`🔍 Loading route: ${honoPath} from ${routeFile}`);
      const route = await import(/* @vite-ignore */ importPath);

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const fullPath = `/api${honoPath}`;

      for (const method of methods) {
        if (route[method]) {
          const handler: Handler = async (c) => {
            const params = c.req.param();
            const request = c.req.raw;
            return await route[method](request, { params });
          };

          switch (method.toLowerCase()) {
            case 'get':
              api.get(honoPath, handler);
              break;
            case 'post':
              api.post(honoPath, handler);
              break;
            case 'put':
              api.put(honoPath, handler);
              break;
            case 'delete':
              api.delete(honoPath, handler);
              break;
            case 'patch':
              api.patch(honoPath, handler);
              break;
          }
          
          console.log(`✅ Registered ${method} /api${honoPath}`);
          registeredCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error registering route ${routeFile}:`, error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }
  
  console.log(`✅ Successfully registered ${registeredCount} route handlers`);
}

// Register routes before creating server
await registerRoutes();
console.log(`✅ Total Hono routes registered: ${api.routes.length}`);
console.log(`📋 Registered routes:`, api.routes.map(r => `${r.method} ${r.path}`).join(', '));

// CRITICAL: Mount API routes FIRST, before React Router
// This ensures /api/* requests are handled by Hono, not React Router
// BUT: Don't mount /api/auth routes here - they're already on the main app
app.route('/api', api);
console.log('✅ Mounted API routes at /api (before createHonoServer mounts React Router)');
console.log('✅ Auth routes registered at /api/auth/*');

// Add /api/auth/token endpoint for mobile app callback
// This needs to be after authHandler but before React Router
// Use verifyAuth to ensure user is authenticated
app.get('/api/auth/token', verifyAuth(), async (c) => {
  // Get session from auth context
  const authUser = c.get('authUser');
  if (!authUser) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  // authUser contains { session, user }
  const { session, user } = authUser;
  if (!session || !user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  const sessionAny = session as any;
  return c.json({
    jwt: sessionAny.sessionToken || sessionAny.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  });
});

export default await createHonoServer({
  app,
  defaultLogger: true,
});
