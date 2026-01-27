import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	ssr: true,
	prerender: false, // Disable prerendering - we're using SSR
	// Exclude API routes from React Router - they're handled by Hono
	ignore: ['./src/app/api/**'],
} satisfies Config;

