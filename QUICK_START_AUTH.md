# Quick Start: Enable Authentication

## Current Status

✅ **Code is ready** - All authentication code is implemented and working  
❌ **API Key missing** - You need to add your Clerk publishable key

## To Make It Work (2 minutes)

### Step 1: Get Your Clerk API Key

1. Go to [https://clerk.com](https://clerk.com) and sign up (free tier available)
2. Create a new application
3. Go to **API Keys** in the dashboard
4. Copy your **Publishable Key** (starts with `pk_test_`)

### Step 2: Create `.env.local` File

In your project root (`ature-app/`), create a file named `.env.local`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

Replace `pk_test_your_actual_key_here` with your actual key from Clerk.

### Step 3: Restart Dev Server

```bash
npm run dev
```

### Step 4: Test It

1. Go to `http://localhost:5173/sign-up`
2. Try signing up with email or Google/Apple
3. You should see the authentication flow working!

## What Works Right Now

- ✅ Sign In page (`/sign-in`)
- ✅ Sign Up page (`/sign-up`)
- ✅ Account page (`/account`) - protected, requires login
- ✅ Navigation shows Sign In/Sign Up when logged out
- ✅ Navigation shows user avatar when logged in
- ✅ Protected routes redirect to sign-in if not authenticated

## Troubleshooting

**If you see a warning in console:**
```
⚠️ VITE_CLERK_PUBLISHABLE_KEY is not set
```
→ You need to create `.env.local` with your key

**If authentication doesn't work:**
→ Make sure you restarted the dev server after adding `.env.local`
→ Check that your key starts with `pk_test_` or `pk_live_`
→ Verify the key in Clerk Dashboard

## For Production (Vercel)

Add the environment variable in Vercel Dashboard:
- Settings → Environment Variables
- Name: `VITE_CLERK_PUBLISHABLE_KEY`
- Value: Your publishable key
- Apply to: Production, Preview, Development

