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
// server.ts is in src/, so API is at src/app/api
const API_DIR = join(__dirname, 'app/api');

const app = new Hono();
const api = new Hono(); // Separate Hono instance for API routes

// Initialize auth middleware
app.use('*', initAuthConfig((c) => ({
  ...getAuthConfig(),
  secret: process.env.AUTH_SECRET || 'fallback-secret-change-in-production',
  basePath: '/api/auth',
  trustHost: true,
})));

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
    const signinRoutePath = join(__dirname, 'app/api/auth/signin/route.js');
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
    const signupRoutePath = join(__dirname, 'app/api/auth/signup/route.js');
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
  const routeFiles = await findRouteFiles(API_DIR).catch(() => []);

  // Sort routes by length (longest first) to handle nested routes correctly
  routeFiles.sort((a, b) => b.length - a.length);

  for (const routeFile of routeFiles) {
    try {
      // Skip signin/signup routes - they're registered directly on main app
      const honoPath = getHonoPath(routeFile, API_DIR);
      if (honoPath === '/auth/signin' || honoPath === '/auth/signup') {
        console.log(`⏭️  Skipping ${honoPath} - registered directly on main app`);
        continue;
      }

      // Use file:// URL for dynamic imports in SSR (standard Node.js approach)
      // This works reliably in Vite's SSR context
      const fileUrl = pathToFileURL(routeFile).href;
      const importPath = `${fileUrl}?update=${Date.now()}`;
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
          
          console.log(`Registered ${method} /api${honoPath}`);
        }
      }
    } catch (error) {
      console.error(`Error registering route ${routeFile}:`, error);
    }
  }
}

// Register routes before creating server
console.log('🔍 Starting route registration...');
console.log('📁 API_DIR:', API_DIR);
await registerRoutes();
console.log(`✅ Registered ${api.routes.length} total Hono routes`);

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
