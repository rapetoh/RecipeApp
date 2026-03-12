import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import './global.css';

export const links = () => [
  {
    rel: 'icon',
    type: 'image/png',
    href: '/assets/images/icon.png',
  },
  {
    rel: 'apple-touch-icon',
    href: '/assets/images/icon.png',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PocketChef - AI Recipe & Meal Planner</title>
        <meta name="description" content="Discover recipes by photo, voice, or ingredients. Plan meals, generate grocery lists, and cook step-by-step with AI-powered guidance." />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

