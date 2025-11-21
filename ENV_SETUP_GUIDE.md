# Environment Variables Setup Guide

This guide will walk you through getting all the values needed for your `.env` files.

## 📁 Where to Create the Files

You need to create **two** `.env` files:

1. `recipe-app-standalone/apps/web/.env` - For the backend API server
2. `recipe-app-standalone/apps/mobile/.env` - For the mobile app

---

## 🔧 Web App Environment Variables (`apps/web/.env`)

### 1. DATABASE_URL

**Already configured!** Just copy this exactly:

```env
DATABASE_URL=postgresql://recipeapp:recipeapp123@localhost:5432/recipeapp
```

This matches the Docker setup. **No changes needed** unless you modify the database credentials in `database/docker-compose.yml`.

### 2. OPENAI_API_KEY

**You need to get this from OpenAI:**

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Click your profile → **"API keys"** (or go to https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Give it a name (e.g., "Recipe App")
6. **Copy the key immediately** (it starts with `sk-` and you can't see it again!)
7. Paste it in your `.env` file:

```env
OPENAI_API_KEY=sk-proj-abc123xyz...your-actual-key-here
```

**Note:** OpenAI charges per API call. The free tier gives you $5 credit to start.

### 3. NODE_ENV

**Just use this:**

```env
NODE_ENV=development
```

---

## 📱 Mobile App Environment Variables (`apps/mobile/.env`)

### 1. EXPO_PUBLIC_API_URL

**For local development, use:**

```env
EXPO_PUBLIC_API_URL=http://localhost:5173
```

**If testing on a real device (iPhone), you need your computer's IP address:**

1. Find your computer's local IP:
   - **Windows:** Open Command Prompt, type `ipconfig`, look for "IPv4 Address" (usually starts with 192.168.x.x)
   - **Mac/Linux:** Open Terminal, type `ifconfig` or `ip addr`, look for "inet" under your network interface
2. Replace `localhost` with your IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5173
```

**Important:** Make sure your phone and computer are on the same WiFi network!

### 2. EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME

**Get this from Cloudinary:**

1. Sign up at https://cloudinary.com (free tier is fine)
2. After signing up, you'll see your **Dashboard**
3. At the top, you'll see your **Cloud Name** (e.g., "dxyz123abc")
4. Copy it:

```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dui3u9g4j
```

### 3. EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET

**Create this in Cloudinary:**

1. In Cloudinary Dashboard, go to **Settings** (gear icon) → **Upload**
2. Scroll down to **"Upload presets"**
3. Click **"Add upload preset"**
4. Configure:
   - **Preset name:** `recipe-app-uploads` (or any name you want)
   - **Signing mode:** Select **"Unsigned"** (important!)
   - **Folder:** `recipe-app` (optional, for organization)
5. Click **"Save"**
6. Copy the preset name:

```env
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=recipe-app-uploads
```

---

## 📝 Complete Example Files

### `apps/web/.env` (Complete Example)

```env
DATABASE_URL=postgresql://recipeapp:recipeapp123@localhost:5432/recipeapp
OPENAI_API_KEY=sk-proj-abc123xyz789your-actual-openai-key-here
NODE_ENV=development
```

### `apps/mobile/.env` (Complete Example)

```env
EXPO_PUBLIC_API_URL=http://localhost:5173
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dxyz123abc
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=recipe-app-uploads
```

**For iPhone testing, change the first line to:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5173
```
(Replace `192.168.1.100` with your actual computer IP)

---

## ✅ Quick Checklist

- [ ] Created `apps/web/.env` file
- [ ] Added `DATABASE_URL` (copy from template)
- [ ] Got OpenAI API key and added `OPENAI_API_KEY`
- [ ] Created `apps/mobile/.env` file
- [ ] Added `EXPO_PUBLIC_API_URL` (use localhost or your IP)
- [ ] Signed up for Cloudinary
- [ ] Got Cloudinary cloud name
- [ ] Created unsigned upload preset
- [ ] Added Cloudinary credentials to mobile `.env`

---

## 🆘 Troubleshooting

**"Invalid API key" error:**
- Make sure your OpenAI key starts with `sk-`
- Check for extra spaces or quotes in the `.env` file
- Verify the key is active in OpenAI dashboard

**"Cloudinary upload failed":**
- Make sure upload preset is set to **"Unsigned"**
- Check cloud name is correct (no extra spaces)
- Verify preset name matches exactly

**"Cannot connect to API" on iPhone:**
- Make sure `EXPO_PUBLIC_API_URL` uses your computer's IP, not `localhost`
- Verify phone and computer are on same WiFi
- Check Windows Firewall isn't blocking port 5173
- Make sure web server is running (`npm run dev` in `apps/web`)

**Database connection errors:**
- Make sure Docker is running
- Verify database container is up: `docker ps`
- Check `DATABASE_URL` matches `docker-compose.yml` credentials

---

## 💡 Pro Tips

1. **Never commit `.env` files to git!** They're already in `.gitignore`
2. **For production:** Use environment variables from your hosting provider (Vercel, Railway, etc.)
3. **OpenAI costs:** Monitor usage at https://platform.openai.com/usage
4. **Cloudinary free tier:** 25GB storage, 25GB bandwidth/month - plenty for testing!

---

## 🎯 Next Steps

Once your `.env` files are set up:

1. Start the database: `cd database && docker-compose up -d`
2. Install dependencies: `cd apps/web && npm install`
3. Start the web server: `npm run dev`
4. In another terminal: `cd apps/mobile && npm install && npx expo start`
5. Scan QR code with Expo Go on your iPhone!

