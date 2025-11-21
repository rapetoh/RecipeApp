# Troubleshooting "Network Request Failed" Error

## Quick Checklist

### 1. Is the Web Server Running?
```bash
cd recipe-app-standalone/apps/web
npm run dev
```
You should see: `Local: http://localhost:5173/`

**If not running → Start it!**

---

### 2. Check Your .env File

Open `recipe-app-standalone/apps/mobile/.env` and verify:

**For iPhone testing, it MUST be your computer's IP, NOT localhost:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:5173
```

**NOT:**
```env
EXPO_PUBLIC_API_URL=http://localhost:5173  ❌ This won't work on iPhone!
```

**To find your computer's IP:**
- Windows: Open Command Prompt → `ipconfig` → Look for "IPv4 Address"
- Mac/Linux: Open Terminal → `ifconfig` or `ip addr`

---

### 3. Restart Expo After Changing .env

After updating `.env`:
1. Stop Expo (Ctrl+C)
2. Restart: `npx expo start`
3. Press `r` to reload, or scan QR code again

**Important:** Expo doesn't automatically reload `.env` changes!

---

### 4. Test the API from Your Phone's Browser

On your iPhone, open Safari and go to:
```
http://YOUR_COMPUTER_IP:5173/api/recipes
```

**Expected:** You should see JSON data or an error message
**If you see nothing or "Safari can't connect":**
- Web server isn't running, OR
- Wrong IP address, OR
- Firewall is blocking port 5173

---

### 5. Check Windows Firewall

Windows might be blocking port 5173:

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Make sure Node.js is allowed (or add port 5173)

**Quick test:** Temporarily disable firewall, try again. If it works, firewall is the issue.

---

### 6. Verify Both Servers Are Running

You need **TWO terminals**:

**Terminal 1 - Web API:**
```bash
cd recipe-app-standalone/apps/web
npm run dev
# Should show: Local: http://localhost:5173/
```

**Terminal 2 - Expo:**
```bash
cd recipe-app-standalone/apps/mobile
npx expo start
# Should show QR code
```

---

### 7. Check the Exact Error

Look at the Expo terminal for the full error message. It might show:
- "Network request failed" → Connection issue
- "Failed to fetch" → CORS or connection issue
- "ECONNREFUSED" → Server not running or wrong IP
- "Timeout" → Firewall or network issue

---

### 8. Test from Computer Browser

On your computer, open browser and go to:
```
http://localhost:5173/api/recipes
```

**If this works:** Server is fine, issue is with phone connection
**If this doesn't work:** Server has a problem

---

## Common Issues & Fixes

### Issue: "localhost" in .env
**Fix:** Change to your computer's IP address

### Issue: Wrong IP address
**Fix:** 
1. Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Find your WiFi adapter's IPv4 address
3. Update `.env` with that IP
4. Restart Expo

### Issue: Firewall blocking
**Fix:**
- Allow Node.js through Windows Firewall
- Or add port 5173 exception

### Issue: Phone and computer on different networks
**Fix:** Make sure both are on the same WiFi network

### Issue: Server not accessible
**Fix:** Check `vite.config.ts` - make sure `host: '0.0.0.0'` is set (allows external connections)

---

## Still Not Working?

1. **Check web server logs** - Look for errors in Terminal 1
2. **Check Expo logs** - Look for detailed error in Terminal 2
3. **Try from computer browser first** - Verify server works locally
4. **Check network** - Make sure phone and computer are on same WiFi

---

## Quick Test Command

On your computer, test if the API is accessible:
```bash
curl http://localhost:5173/api/recipes
```

If this works, the server is fine. The issue is the phone connection.

