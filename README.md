<p align="center">
  <img src="apps/web/public/assets/images/icon.png" alt="PocketChef Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">PocketChef - Meal Planner</h1>

<p align="center">
  <strong>Your AI-powered kitchen companion.</strong><br/>
  Discover recipes by photo, voice, or ingredients. Plan meals, generate grocery lists, and cook step-by-step.
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/pocketchef-meal-planner/id6757957197">
    <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="50" />
  </a>
</p>

<p align="center">
  <a href="https://pocketchef.space">Website</a> &bull;
  <a href="https://pocketchef.space/privacy">Privacy Policy</a> &bull;
  <a href="https://pocketchef.space/terms">Terms of Service</a> &bull;
  <a href="https://pocketchef.space/support">Support</a>
</p>

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/image1.jpg" alt="Cook With Confidence" width="160" />
  <img src="docs/screenshots/image2.jpg" alt="Discover Recipes" width="160" />
  <img src="docs/screenshots/image3.jpg" alt="Voice Suggestions" width="160" />
  <img src="docs/screenshots/image4.jpg" alt="Step-by-Step Cooking" width="160" />
  <img src="docs/screenshots/image5.jpg" alt="Nutrition Snapshot" width="160" />
</p>
<p align="center">
  <img src="docs/screenshots/image6.jpg" alt="Meal Planning" width="160" />
  <img src="docs/screenshots/image7.jpg" alt="Grocery Lists" width="160" />
  <img src="docs/screenshots/image8.jpg" alt="Feature Highlights" width="160" />
</p>

---

## About

PocketChef is a full-stack AI-powered recipe and meal planning application built with React Native (Expo) for mobile and Hono + React Router for the web backend. It leverages OpenAI's vision and language models to help users discover, plan, and cook meals effortlessly.

## Features

### Recipe Discovery
- **Photo Scan (Dish)** — Snap a photo of any dish and AI identifies it with the full recipe
- **Photo Scan (Ingredients)** — Photograph your fridge or pantry and get recipe suggestions based on what you have
- **Search by Name** — Search for any recipe by dish name
- **Voice / Text Input** — Describe your cravings or mood and get personalized suggestions
- **Daily Recommendations** — AI-curated daily recipe picks tailored to your preferences

### Meal Planning
- Plan breakfast, lunch, and dinner for up to **14 days**
- Calendar view for visual meal organization
- Meal plan history and AI-powered suggestions

### Smart Grocery Lists
- Auto-generate organized grocery lists from meal plans
- View by week, 2 weeks, or month
- Check off items as you shop
- Access past grocery lists

### Step-by-Step Cooking Mode
- Ingredient checklist before cooking
- One step at a time with progress tracking
- Built-in timers with haptic feedback

### Save & Organize
- Favorite recipes for quick access
- Create custom collections
- Save AI-generated recipes to any collection
- Create your own recipes manually

### Personalization
- Dietary preferences, allergies, and cuisine interests
- Skill level and preferred cooking time
- Metric or imperial measurement system
- Daily suggestion scheduling

### Subscription
- **Free tier** with monthly limits on AI features
- **Premium** ($4.99/month or $49.99/year) for unlimited AI access
- Managed through RevenueCat + App Store

## Tech Stack

### Mobile App
| Technology | Purpose |
|---|---|
| React Native + Expo | Cross-platform mobile framework |
| Expo Router | File-based navigation |
| RevenueCat | Subscription management |
| Expo Camera | Photo capture for food recognition |

### Web Backend & Landing Page
| Technology | Purpose |
|---|---|
| Hono | Lightweight API server |
| React Router v7 | SSR web framework |
| Neon (PostgreSQL) | Serverless database |
| OpenAI API | Vision AI, recipe generation, recommendations |
| Tailwind CSS | Styling |
| Vite | Build tooling |

### Infrastructure
| Service | Purpose |
|---|---|
| Render | Web app hosting |
| EAS (Expo) | iOS builds & submissions |
| Cloudinary | Image uploads & CDN |
| Porkbun | Custom domain (pocketchef.space) |

## Project Structure

```
recipe-app-standalone/
├── apps/
│   ├── mobile/                # React Native (Expo) mobile app
│   │   ├── src/
│   │   │   ├── app/           # Screens (Expo Router file-based routing)
│   │   │   │   ├── (tabs)/    # Tab navigation (home, favorites, my-recipes, profile)
│   │   │   │   ├── account/   # Sign in / Sign up
│   │   │   │   ├── subscription/ # Premium plans & management
│   │   │   │   └── ...        # Meal planning, grocery lists, cooking mode, etc.
│   │   │   ├── components/    # Reusable UI components
│   │   │   └── utils/         # Helpers and utilities
│   │   ├── assets/            # Images, fonts
│   │   ├── app.json           # Expo configuration
│   │   └── eas.json           # EAS Build configuration
│   │
│   └── web/                   # Hono + React Router web app
│       ├── src/
│       │   ├── app/           # React Router pages & API routes
│       │   │   ├── api/       # Backend API endpoints
│       │   │   ├── page.jsx   # Landing page
│       │   │   ├── privacy/   # Privacy policy page
│       │   │   ├── terms/     # Terms of service page
│       │   │   └── support/   # Support page
│       │   ├── server.ts      # Hono server entry point
│       │   └── root.tsx       # HTML layout
│       └── public/            # Static assets
│
└── database/                  # PostgreSQL schema & Docker setup
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)
- OpenAI API key
- Cloudinary account (free tier works)
- Apple Developer account (for iOS builds)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd recipe-app-standalone

# Install web dependencies
cd apps/web
npm install

# Install mobile dependencies
cd ../mobile
npm install
```

### 2. Database Setup

```bash
cd database
docker-compose up -d

# Wait ~10 seconds, then create schema
docker exec -i recipe-app-db psql -U recipeapp -d recipeapp < schema.sql
```

### 3. Environment Variables

**`apps/web/.env`**
```env
DATABASE_URL=postgresql://recipeapp:recipeapp123@localhost:5432/recipeapp
OPENAI_API_KEY=sk-your-key
NODE_ENV=development
AUTH_SECRET=your-auth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
```

**`apps/mobile/.env`**
```env
EXPO_PUBLIC_API_URL=http://localhost:5173
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

### 4. Run Locally

**Terminal 1 — Web Backend:**
```bash
cd apps/web
npm run dev
```

**Terminal 2 — Mobile App:**
```bash
cd apps/mobile
npx expo start
```

Scan the QR code with Expo Go on your device.

### 5. Production Build (iOS)

```bash
cd apps/mobile
eas build --platform ios --profile production --auto-submit
```

## Deployment

| Component | Platform | URL |
|---|---|---|
| Web App + API | Render | [pocketchef.space](https://pocketchef.space) |
| Mobile App | App Store | [Download](https://apps.apple.com/us/app/pocketchef-meal-planner/id6757957197) |
| Database | Neon | Serverless PostgreSQL |

## License

Copyright 2026 Roch Senyo Apetoh Dzulamedji. All rights reserved.
