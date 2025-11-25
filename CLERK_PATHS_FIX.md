# Fix Clerk Component Paths - Stop Redirects to Account Portal

## Problem
Clerk is redirecting to `accounts.ature.ru` (Account Portal) instead of keeping users on your application domain, causing page reloads and redirects.

**IMPORTANT:** The Account Portal (`accounts.ature.ru`) is a separate hosted solution. If you're using custom sign-in/sign-up pages (which you are), you should disable the Account Portal or configure it to use your application domain.

## Solution: Change to Application Domain

### Step 1: Update Sign-In Path

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Paths** (or **User & Authentication** → **Paths**)
4. Find **<SignIn />** section
5. **Change from:**
   - ❌ "Sign-in page on Account Portal" → `https://accounts.ature.ru/sign-in`
6. **Change to:**
   - ✅ "Sign-in page on application domain" → `/sign-in`

### Step 2: Update Sign-Up Path

1. In the same **Paths** section
2. Find **<SignUp />** section
3. **Change from:**
   - ❌ "Sign-up page on Account Portal" → `https://accounts.ature.ru/sign-up`
4. **Change to:**
   - ✅ "Sign-up page on application domain" → `/sign-up`

### Step 3: Update Sign-Out Path

1. In the same **Paths** section
2. Find **Signing Out** section
3. **Change from:**
   - ❌ "Sign-in page on Account Portal" → `https://accounts.ature.ru/sign-in`
4. **Change to:**
   - ✅ "Path on application domain" → `/sign-in` (or `/` for home page)

### Step 4: Save Changes

1. Click **Save** or **Apply** at the bottom of the page
2. Changes should take effect immediately (no deployment needed)

## What This Fixes

- ✅ No more redirects to `accounts.ature.ru`
- ✅ All authentication happens on your app domain (`ature.ru`)
- ✅ Single-page flow without reloads
- ✅ Hash routing works properly
- ✅ Better user experience

## Alternative: Keep Account Portal but Fix Redirects

If you want to keep using the Account Portal, you need to:

1. **Update redirect URLs in Clerk Dashboard:**
   - Go to **Paths** → **Redirect URLs**
   - Add your application domain URLs:
     - `https://ature.ru/dashboard` (after sign-in)
     - `https://ature.ru/dashboard` (after sign-up)
     - `https://ature.ru` (after sign-out)

2. **But this still causes redirects** - users will be sent to `accounts.ature.ru` and then redirected back.

## Recommended: Use Application Domain

**Best approach:** Use "application domain" paths so everything happens on your site:
- `/sign-in` → Your app's sign-in page
- `/sign-up` → Your app's sign-up page
- No redirects to external domains
- Better user experience
- Works with hash routing

## After Making Changes

1. Clear browser cache
2. Try signing up again
3. You should stay on `ature.ru` (or your domain) throughout the flow
4. No redirects to `accounts.ature.ru`

## Note

The Clerk Dashboard shows a deprecation notice: "Setting component paths via the Dashboard will be deprecated in a future version of Clerk."

This means you should eventually configure these in code (which we've already done with `routing="hash"`), but for now, updating the Dashboard settings will fix the redirect issue.

