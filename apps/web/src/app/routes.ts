import { index, route } from '@react-router/dev/routes';

// Minimal routes for API server
// The API routes are handled by the Hono server in server.ts
export default [
  index('./page.jsx'),
  route('account/signin', './account/signin/page.jsx'),
  route('account/signup', './account/signup/page.jsx'),
  route('*', './+not-found.tsx'),
];

