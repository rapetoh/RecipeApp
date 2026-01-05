# OAuth Setup Complete Guide - Explained Simply 🎓

This guide will walk you through setting up Google and Apple login for your app. Don't worry if you're new to this - we'll explain everything step by step, just like explaining to a friend!

---

## 📚 What is OAuth? (The Simple Explanation)

**OAuth** is like having a "Sign in with Google" or "Sign in with Apple" button on your app. Instead of creating a new password just for your app, users can use their existing Google or Apple account to log in.

### Why Use OAuth?

1. **Easier for Users**: They don't need to remember another password
2. **More Secure**: Google and Apple handle security (they're really good at it!)
3. **Faster Sign-Up**: Users can sign up in one click instead of filling out forms
4. **More Trust**: Users trust Google/Apple, so they're more likely to try your app

### How Does It Work? (The Simple Version)

Imagine you want to get into a party:
- **Old Way (Email/Password)**: You create a special password just for this party
- **OAuth Way**: You show your ID (Google/Apple account) and they let you in

Here's what happens when someone clicks "Sign in with Google":
1. User clicks the button in your app
2. Your app asks Google: "Is this person really who they say they are?"
3. Google shows a login page (the user types their Google password)
4. Google says: "Yes, this person is real!" and gives your app permission
5. Your app lets them in! ✨

---

## 🔧 Part 1: Google OAuth Setup

### Step 1: Go to Google Cloud Console

**Where to go**: https://console.cloud.google.com

**Why**: This is Google's control room where you tell them "Hey, I want to let people sign in with Google on my app!"

**What to do**:
1. Sign in with your Google account (the one you want to use)
2. You'll see a dashboard - this is Google's control panel

---

### Step 2: Create a Project (If You Don't Have One)

**Why**: A "project" is like a folder where Google keeps all the settings for your app. You need one folder per app.

**What to do**:
1. Look at the top of the page - you'll see a dropdown that might say "Select a project" or show a project name
2. If you don't have a project yet:
   - Click the dropdown
   - Click "New Project"
   - Give it a name: "ChefVibe" (or whatever you want)
   - Click "Create"
3. If you already have a project, select it from the dropdown

**Why this step matters**: Google needs to organize your app's settings. Think of it like organizing files on your computer - you need a folder first!

---

### Step 3: Enable Google+ API

**Why**: An "API" is like a tool. Google has many tools (APIs) for different things. The Google+ API is the specific tool that lets people sign in with their Google account. We need to tell Google "Yes, I want to use this tool!"

**What to do**:
1. In the left sidebar, look for "APIs & Services"
2. Click on it
3. Click "Library" (it's under "APIs & Services")
4. You'll see a search box at the top
5. Type: "Google+ API"
6. Click on the result that says "Google+ API"
7. Click the big blue button that says "Enable"
8. Wait a few seconds - Google will say "API enabled" when done

**Why this step matters**: It's like unlocking a feature. Google has the sign-in feature, but you need to "enable" it first before you can use it!

---

### Step 4: Create OAuth Credentials

**Why**: Credentials are like a secret password between your app and Google. When your app wants to check if someone is really signed in with Google, it needs to show Google these credentials to prove it's your app (and not a fake app trying to hack).

Think of it like this:
- Your app says: "Hey Google, someone wants to sign in"
- Google says: "Prove you're the real ChefVibe app!"
- Your app shows the credentials (like showing an ID card)
- Google says: "OK, you're real! Here's the user's info"

**What to do**:

1. **Go to Credentials**:
   - Still in "APIs & Services" (left sidebar)
   - Click "Credentials" (under "APIs & Services")

2. **Configure OAuth Consent Screen (First Time Only)**:
   - If you see a warning banner, click "Configure Consent Screen"
   - Choose "External" (unless you have a Google Workspace account)
   - Click "Create"
   - Fill in:
     - **App name**: "ChefVibe" (what users will see)
     - **User support email**: Your email address
     - **Developer contact**: Your email address
   - Click "Save and Continue"
   - Click "Save and Continue" again (for Scopes - default is fine)
   - Click "Save and Continue" again (for Test users - skip for now)
   - Click "Back to Dashboard"

3. **Create OAuth Client ID**:
   - Click the "+ CREATE CREDENTIALS" button at the top
   - Select "OAuth client ID"
   - If asked about consent screen again, click "Configure Consent Screen" and follow step 2 above, then come back
   - You'll see a form:
     - **Application type**: Select "Web application"
     - **Name**: "ChefVibe Web" (just a name to remember this)
     - **Authorized JavaScript origins**: Click "ADD URI" and add:
       - `https://recipe-app-web-xtnu.onrender.com`
       - `http://localhost:5173` (for testing on your computer)
     - **Authorized redirect URIs**: Click "ADD URI" and add:
       - `https://recipe-app-web-xtnu.onrender.com/api/auth/callback/google`
       - `http://localhost:5173/api/auth/callback/google` (for testing)
   - Click "Create"

4. **Copy Your Credentials**:
   - You'll see a popup with your credentials
   - **IMPORTANT**: Copy these RIGHT NOW - you can only see the secret once!
   - Copy the **Client ID** (looks like: `123456789-xxxxx.apps.googleusercontent.com`)
   - Copy the **Client Secret** (click "Show" if it's hidden, then copy it)
   - Save these somewhere safe (like a text file)

**Why redirect URIs matter**: When Google finishes checking if someone is real, it needs to send them back to your app. The redirect URI is like giving Google your app's address - "Send them back here when you're done!"

---

## 🍎 Part 2: Apple Sign In Setup

### Step 1: Go to Apple Developer Portal

**Where to go**: https://developer.apple.com/account

**Why**: This is Apple's control room (like Google's, but for Apple). You need an Apple Developer account ($99/year) - but you already paid for this! ✅

**What to do**:
1. Sign in with your Apple ID (the one connected to your developer account)
2. You'll see the Apple Developer dashboard

---

### Step 2: Enable "Sign In with Apple" on Your Existing App

**Why**: You already registered your app when you set up EAS (to test on your iPhone). Now we just need to tell Apple "Hey, this app should also allow Sign In with Apple!"

**What to do**:
1. Click "Certificates, Identifiers & Profiles" (in the left sidebar or main menu)
2. Click "Identifiers" (in the left sidebar)
3. Find your app: `com.rapetoh.recipeapp` (you should see it in the list)
4. Click on it
5. Scroll down and look for "Sign In with Apple"
6. Check the box next to "Sign In with Apple" (if not already checked)
7. Click "Save" (top right)
8. If it asks you to continue, click "Continue" and then "Save" again

**Why this step matters**: It's like adding a feature to your app. Apple needs to know "This app is allowed to use Sign In with Apple" before it will work!

---

### Step 3: Create a Service ID (For Web Authentication)

**Why**: Your app has two parts:
- **Mobile app** (the iPhone app) - uses `com.rapetoh.recipeapp`
- **Web server** (the backend that runs on Render) - needs its own ID: `com.rapetoh.recipeapp.web`

Think of it like this: Your mobile app is the front door of your house, and your web server is the back door. Apple needs to know about both doors!

**What to do**:
1. Still in "Identifiers", click the "+" button at the top (to create a new identifier)
2. Select "Services IDs"
3. Click "Continue"
4. Fill in:
   - **Description**: "ChefVibe Web" (just a name to remember this)
   - **Identifier**: `com.rapetoh.recipeapp.web` (must be unique - we add `.web` to make it different)
5. Click "Continue"
6. Click "Register"
7. Click on the Service ID you just created (`com.rapetoh.recipeapp.web`)
8. Check the box next to "Sign In with Apple"
9. Click "Configure" (next to "Sign In with Apple")
10. Fill in the configuration:
    - **Primary App ID**: Select `com.rapetoh.recipeapp` (your mobile app)
    - **Website URLs**:
      - **Domains and Subdomains**: `recipe-app-web-xtnu.onrender.com`
      - **Return URLs**: `https://recipe-app-web-xtnu.onrender.com/api/auth/callback/apple`
    - Click "Save"
    - Click "Continue"
    - Click "Save" again

**Why Service IDs matter**: Apple needs a separate ID for your web server because it's a different "thing" than your mobile app. It's like having a driver's license (mobile app) and a passport (web server) - both are yours, but they're used in different situations!

---

### Step 4: Create a Key (For Authentication)

**Why**: When your web server talks to Apple, it needs to prove it's really your app. The key is like a special signature that only your app knows how to make. Apple can check the signature and say "Yes, this is really ChefVibe!"

**What to do**:
1. Click "Keys" in the left sidebar (under "Certificates, Identifiers & Profiles")
2. Click the "+" button at the top
3. Fill in:
   - **Key Name**: "ChefVibe Apple Auth Key" (just a name)
   - Check the box next to "Sign In with Apple"
4. Click "Configure" (next to "Sign In with Apple")
   - **Primary App ID**: Select `com.rapetoh.recipeapp`
   - Click "Save"
5. Click "Continue"
6. Click "Register"
7. **IMPORTANT**: Download the key file!
   - You'll see a button to download the `.p8` file
   - **Download it NOW** - you can only download it once!
   - Save it somewhere safe (like your Downloads folder)
8. Copy these values from the screen:
   - **Key ID**: Something like `ABC123XYZ` (shown on the page)
   - **Team ID**: Found at the top-right of the page (something like `ABCD1234EF`)
9. **Copy the Private Key**:
   - Open the `.p8` file you downloaded (use a text editor like Notepad, TextEdit, or VS Code)
   - Copy the ENTIRE contents, including the lines that say:
     ```
     -----BEGIN PRIVATE KEY-----
     (lots of letters and numbers)
     -----END PRIVATE KEY-----
     ```

**Why the key matters**: It's like a secret password that only your app knows. When your app says "Hey Apple, verify this user," Apple checks the signature using this key. If it matches, Apple knows it's really your app talking!

---

## 🔐 Part 3: Adding Credentials to Render

**Why**: Your app runs on Render (your web server). Render needs to know your Google and Apple credentials so it can talk to Google/Apple on your app's behalf. It's like giving your friend the keys to your house - they need the keys to get in!

**What to do**:

1. **Go to Render Dashboard**:
   - Go to https://dashboard.render.com
   - Sign in
   - Click on your web service (the one named something like "recipe-app-web")

2. **Go to Environment Tab**:
   - Click on "Environment" in the left sidebar
   - You'll see a list of environment variables (like `DATABASE_URL`, `AUTH_SECRET`, etc.)

3. **Add Google Credentials**:
   - Click "Add Environment Variable"
   - **Key**: `GOOGLE_CLIENT_ID`
   - **Value**: Paste your Google Client ID (from Part 1, Step 4)
   - Click "Save"
   - Click "Add Environment Variable" again
   - **Key**: `GOOGLE_CLIENT_SECRET`
   - **Value**: Paste your Google Client Secret (from Part 1, Step 4)
   - Click "Save"

4. **Add Apple Credentials**:
   - Click "Add Environment Variable"
   - **Key**: `APPLE_CLIENT_ID`
   - **Value**: `com.rapetoh.recipeapp.web` (the Service ID you created)
   - Click "Save"
   - Click "Add Environment Variable"
   - **Key**: `APPLE_TEAM_ID`
   - **Value**: Your Team ID (from Part 2, Step 4)
   - Click "Save"
   - Click "Add Environment Variable"
   - **Key**: `APPLE_KEY_ID`
   - **Value**: Your Key ID (from Part 2, Step 4)
   - Click "Save"
   - Click "Add Environment Variable"
   - **Key**: `APPLE_PRIVATE_KEY`
   - **Value**: Paste the ENTIRE private key (from the .p8 file - all the lines including BEGIN and END)
   - Click "Save"

5. **Add AUTH_URL (Required for OAuth)**:
   - Click "Add Environment Variable"
   - **Key**: `AUTH_URL`
   - **Value**: `https://recipe-app-web-xtnu.onrender.com` (your Render app URL)
   - Click "Save"
   - **Why**: Auth.js needs to know your app's full URL to generate OAuth callback URLs correctly. Without this, OAuth won't work!

6. **IMPORTANT: Redeploy!**:
   - After adding all the environment variables, you MUST redeploy your service
   - Click "Manual Deploy" → "Deploy latest commit" (or it might auto-deploy)
   - Wait for the deployment to finish (this can take a few minutes)

**Why redeploy matters**: Render needs to restart your app with the new environment variables. It's like restarting your computer after installing new software - the new settings only work after restart!

---

## 🎯 Part 4: What Happens Behind the Scenes

Now that everything is set up, here's what happens when someone clicks "Sign in with Google":

### The Flow (Step by Step):

1. **User clicks "Sign in with Google"** in your mobile app
   - Your app opens a browser window

2. **Your app sends the user to Google**
   - The browser goes to: `https://your-app.onrender.com/api/auth/signin/google`
   - Your app tells Google: "I want to verify this user"

3. **Google shows a login page**
   - User types their Google email and password
   - Google checks: "Is this person real?" ✅

4. **Google sends user back to your app**
   - Google redirects to: `https://your-app.onrender.com/api/auth/callback/google`
   - Google says: "Yes, this user is real! Here's proof!"

5. **Your app verifies with Google**
   - Your app shows Google the credentials (Client ID & Secret)
   - Google says: "Yes, you're the real ChefVibe app! Here's the user's info"

6. **Your app creates a session**
   - Your app says: "OK, this user is verified!"
   - Your app creates a "session" (like a temporary ID card)
   - The user is now logged in! 🎉

### Why This is Secure:

- Users never give your app their Google/Apple password
- Google/Apple handles all the password checking
- Your app only gets confirmation: "Yes, this person is real"
- Your app gets basic info: name, email, profile picture
- Everything uses secure, encrypted connections (HTTPS)

---

## ✅ Part 5: Testing Your Setup

### How to Test:

1. **Make sure you redeployed** after adding environment variables to Render
2. **Open your mobile app**
3. **Go to the Sign In screen**
4. **Tap "Continue with Google"** (or "Continue with Apple" on iPhone)
5. **You should see**:
   - A browser opens
   - Google/Apple login page appears
   - You sign in with your Google/Apple account
   - You get redirected back to the app
   - You're logged in! ✨

### Troubleshooting:

**Problem**: "OAuth buttons don't appear"
- **Why**: Environment variables might not be set
- **Fix**: Check Render environment variables, make sure they're all there

**Problem**: "Error when clicking OAuth button"
- **Why**: Credentials might be wrong, or redirect URIs don't match
- **Fix**: 
  - Double-check your credentials are correct in Render
  - Make sure redirect URIs in Google/Apple settings match exactly: `https://recipe-app-web-xtnu.onrender.com/api/auth/callback/google`

**Problem**: "Works on web but not mobile"
- **Why**: Mobile uses a different authentication flow
- **Fix**: Check that your mobile app has the latest code with OAuth buttons

**Problem**: "Apple Sign In doesn't work"
- **Why**: Apple has stricter requirements
- **Fix**: 
  - Make sure you're testing on an actual iPhone (Apple Sign In doesn't work in simulators)
  - Check that your Service ID is correctly configured
  - Verify the Private Key is copied correctly (all lines, including BEGIN/END)

---

## 📝 Summary: What You Did

1. ✅ Created a Google Cloud project
2. ✅ Enabled Google+ API
3. ✅ Created Google OAuth credentials (Client ID & Secret)
4. ✅ Enabled Sign In with Apple on your app
5. ✅ Created an Apple Service ID for web
6. ✅ Created an Apple authentication key
7. ✅ Added all credentials to Render
8. ✅ Redeployed your app

**Congratulations!** 🎉 Your app now supports Google and Apple login!

---

## 🆘 Need Help?

If something doesn't work:
1. Check the error message carefully
2. Look at Render logs (they show what's happening)
3. Double-check all credentials are correct
4. Make sure you redeployed after adding environment variables
5. Check that redirect URIs match exactly (no extra spaces, correct URLs)

Remember: Setting up OAuth is like learning to ride a bike - it seems complicated at first, but once you understand it, it makes sense! 🚲

