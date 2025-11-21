# Migration Status

## ✅ Completed

1. **Folder Structure** - Created standalone app structure
2. **Database Setup** - Docker compose + schema SQL
3. **Mobile App Core** - Package.json (SDK 54), app.json, entry files
4. **Mobile Auth** - Standalone auth system (no Create Anything)
5. **Mobile Upload** - Cloudinary integration
6. **Web App Core** - Package.json, SQL utility
7. **OpenAI Integration** - Direct API calls utility
8. **Food Recognition** - Fixed route with OpenAI
9. **Documentation** - README, setup guides

## 🚧 In Progress / Needs Work

### Mobile App
- [ ] Copy all screen files (home, search, save, profile, food-recognition, meal-planning, recipe-detail)
- [ ] Copy component files
- [ ] Copy remaining utility files
- [ ] Copy assets (images) - partially done
- [ ] Update fetch calls to use EXPO_PUBLIC_API_URL

### Web App - API Routes
- [ ] **recipes/route.js** - Fix SQL queries (lines 92, 97 use wrong syntax)
- [ ] **recipes/[id]/route.js** - Fix SQL query (line 115)
- [ ] **saved-recipes/route.js** - Copy and verify
- [ ] **meal-plans/route.js** - Copy and verify  
- [ ] **grocery-lists/route.js** - Copy and verify
- [ ] **recommendations/route.js** - Replace Create Anything integration with OpenAI

### Web App - Other
- [ ] Auth system (auth.js, signin/signup pages)
- [ ] Config files (vite.config.ts, react-router.config.ts, tsconfig.json)
- [ ] Frontend pages (if any)
- [ ] Root layout files

## 🔧 Critical Fixes Needed

### 1. SQL Query Syntax (HIGH PRIORITY)
**File:** `apps/web/src/app/api/recipes/route.js`

**Problem:** Lines 92, 97 use `sql(query, params)` - Neon doesn't support this

**Solution:** Need to rewrite using:
- Tagged template literals: `sql`SELECT * FROM recipes WHERE id = ${id}``
- OR use `sql.unsafe()` for dynamic queries (less safe but works)
- OR restructure to build queries as template literals

**Example fix:**
```javascript
// Instead of:
const recipes = await sql(query, params);

// Use:
const recipes = await sql`
  SELECT * FROM recipes 
  WHERE category = ${category}
  LIMIT ${limit} OFFSET ${offset}
`;
```

### 2. Recommendations Route
**File:** `apps/web/src/app/api/recommendations/route.js`

**Problem:** Uses `/integrations/chat-gpt/conversationgpt4`

**Solution:** Replace with `getRecipeRecommendation()` from `utils/openai.js`

### 3. Notification Badge
**File:** `apps/mobile/src/app/(tabs)/home.jsx`

**Problem:** Always shows badge when authenticated

**Solution:** Remove or make conditional on actual notifications

## 📝 Next Steps

1. **Fix SQL queries** in recipes route (most critical)
2. **Copy remaining mobile screens** 
3. **Copy and fix web API routes**
4. **Set up Cloudinary** account
5. **Test end-to-end**

## 🎯 Quick Wins

These can be done quickly:
- Copy mobile screen files (no changes needed)
- Copy web API routes (then fix SQL)
- Set up environment variables
- Test database connection

