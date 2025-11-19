# Recipe App - Standalone Version

This is a standalone version of the Recipe App, free from Create Anything dependencies.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Docker installed (for local PostgreSQL)
- OpenAI API key (for food recognition and recommendations)
- Cloudinary account (for image uploads) - Free tier works

### 1. Database Setup

```bash
cd database
docker-compose up -d
```

Wait ~10 seconds for database to start, then:

```bash
# Create schema
docker exec -i recipe-app-db psql -U recipeapp -d recipeapp < schema.sql
```

### 2. Environment Variables

Create `.env` files in both `apps/web` and `apps/mobile`:

**apps/web/.env:**
```env
DATABASE_URL=postgresql://recipeapp:recipeapp123@localhost:5432/recipeapp
OPENAI_API_KEY=sk-your-openai-api-key-here
NODE_ENV=development
```

**apps/mobile/.env:**
```env
EXPO_PUBLIC_API_URL=http://localhost:5173
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

### 3. Install Dependencies

```bash
# Web app
cd apps/web
npm install

# Mobile app
cd ../mobile
npm install
```

### 4. Run the Apps

**Terminal 1 - Web Backend:**
```bash
cd apps/web
npm run dev
```

**Terminal 2 - Mobile App:**
```bash
cd apps/mobile
npx expo start
```

Then scan the QR code with Expo Go on your iPhone 15!

## 📋 What's Fixed

✅ **Expo SDK 54** - Matches your Expo Go version  
✅ **SQL Queries Fixed** - Using proper Neon tagged template literals  
✅ **OpenAI Integration** - Direct API calls, no Create Anything  
✅ **Cloudinary Upload** - Replaced Create Anything upload service  
✅ **Standalone Auth** - Works with your backend  
✅ **Database Schema** - Complete with all tables  
✅ **Docker Setup** - Easy local PostgreSQL  

## 🔧 Still Need to Complete

The following files still need to be copied/migrated from the original app:

### Mobile App
- [ ] All screen files (home.jsx, search.jsx, save.jsx, profile.jsx, etc.)
- [ ] Component files (RecipeCard.jsx, etc.)
- [ ] Remaining utility files
- [ ] Assets (images) - partially copied

### Web App
- [ ] API routes (recipes, meal-plans, grocery-lists, recommendations, saved-recipes)
- [ ] Auth system (signin/signup pages, auth.js)
- [ ] Frontend pages (if any)
- [ ] Config files (vite.config.ts, react-router.config.ts, etc.)

## 🐛 Known Issues to Fix

1. **SQL Queries in recipes route** - Need to convert to tagged template literals
2. **Recommendations route** - Replace Create Anything integration with OpenAI
3. **Notification badge** - Remove fake badge or implement real notifications
4. **"Coming Soon" messages** - Remove or implement features

## 📝 Next Steps

1. Copy remaining mobile app screens
2. Copy and fix all web API routes
3. Set up Cloudinary account and get credentials
4. Test food recognition with real images
5. Test all features end-to-end

## 🆘 Troubleshooting

**Database connection fails:**
- Make sure Docker is running
- Check `docker ps` to see if container is up
- Verify DATABASE_URL in .env

**Expo Go version mismatch:**
- This version uses SDK 54, should match your Expo Go
- If still issues, update Expo Go app

**OpenAI errors:**
- Verify OPENAI_API_KEY is set correctly
- Check API key has credits
- Review error logs in web console

**Upload fails:**
- Verify Cloudinary credentials
- Check upload preset is set to "unsigned" or has proper permissions

## 📚 Documentation

- Database setup: `database/setup.md`
- API routes: See `apps/web/src/app/api/` (once migrated)
- Mobile screens: See `apps/mobile/src/app/` (once migrated)

