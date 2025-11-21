# 🚀 Next Steps - Getting Your App Running

Your environment variables are set up! Now let's get everything running.

## Step 1: Start the Database

Open a terminal and run:

```bash
cd recipe-app-standalone/database
docker-compose up -d
```

Wait about 10 seconds for the database to start, then create the schema:

```bash
docker exec -i recipe-app-db psql -U recipeapp -d recipeapp < schema.sql
```

**Verify it worked:**
```bash
docker ps
```
You should see `recipe-app-db` running.

---

## Step 2: Install Web App Dependencies

In a new terminal:

```bash
cd recipe-app-standalone/apps/web
npm install
```

This will take a few minutes. Wait for it to complete.

---

## Step 3: Start the Web Server (Backend API)

Still in `apps/web`:

```bash
npm run dev
```

You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

**Keep this terminal open!** The server needs to keep running.

---

## Step 4: Install Mobile App Dependencies

Open a **new terminal** (keep the web server running):

```bash
cd recipe-app-standalone/apps/mobile
npm install
```

---

## Step 5: Start the Mobile App

Still in `apps/mobile`:

```bash
npx expo start
```

You'll see a QR code in the terminal!

---

## Step 6: Test on Your iPhone 15

1. Open **Expo Go** app on your iPhone
2. Scan the QR code from the terminal
3. The app should load!

**⚠️ Important for iPhone Testing:**

If the app can't connect to the API, you need to update `apps/mobile/.env`:

1. Find your computer's IP address:
   - Open Command Prompt
   - Type: `ipconfig`
   - Look for "IPv4 Address" (e.g., `192.168.1.100`)

2. Update `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:5173
   ```
   (Replace `192.168.1.100` with your actual IP)

3. Restart Expo: Press `r` in the Expo terminal to reload

---

## ✅ Quick Checklist

- [ ] Database is running (`docker ps` shows container)
- [ ] Database schema created (no errors from `docker exec` command)
- [ ] Web app dependencies installed (`apps/web/node_modules` exists)
- [ ] Web server running (`http://localhost:5173` works)
- [ ] Mobile app dependencies installed (`apps/mobile/node_modules` exists)
- [ ] Expo started (QR code visible)
- [ ] App loaded on iPhone (or updated IP if needed)

---

## 🐛 Troubleshooting

**Database won't start:**
- Make sure Docker Desktop is running
- Check: `docker ps -a` to see if container exists
- Try: `docker-compose down` then `docker-compose up -d` again

**"Cannot find module" errors:**
- Make sure you ran `npm install` in both `apps/web` and `apps/mobile`
- Delete `node_modules` and `package-lock.json`, then `npm install` again

**Web server won't start:**
- Check if port 5173 is already in use
- Verify `.env` file exists in `apps/web/`
- Check for syntax errors in `.env` (no quotes around values!)

**Mobile app can't connect:**
- Make sure web server is running first
- For iPhone: Update `EXPO_PUBLIC_API_URL` with your computer's IP
- Make sure phone and computer are on same WiFi
- Check Windows Firewall isn't blocking port 5173

**Expo Go version mismatch:**
- This app uses Expo SDK 54
- Update Expo Go app on your iPhone if needed

---

## 🎯 What to Test

Once everything is running:

1. **Food Recognition:** Take a photo of food → Should analyze and create recipe
2. **Saved Recipes:** Save a recipe → Check "Saved" tab
3. **Meal Planning:** Add recipes to meal plan
4. **Grocery List:** Generate grocery list from meal plan
5. **Search:** Search for recipes

---

## 📝 Notes

- **Keep both terminals open:** Web server and Expo need to keep running
- **Database persists:** Data stays even after stopping Docker (until you delete the volume)
- **Hot reload:** Changes to code will automatically refresh in Expo Go

Good luck! 🎉

