# Fix: Redirect to Dashboard After Login/Sign-Up

## Problem
Users are being redirected to `https://www.ature.ru` (home page) instead of `https://www.ature.ru/dashboard` after logging in or signing up.

## Solution: Update Clerk Dashboard Redirect URLs

The redirect is controlled by Clerk Dashboard settings. You need to update them:

### Step 1: Go to Clerk Dashboard Paths

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Paths** (or **User & Authentication** → **Paths**)

### Step 2: Update Redirect URLs

Find the **Redirect URLs** section and update:

**After Sign-In:**
- Change from: `/` or `https://www.ature.ru`
- Change to: `/dashboard` or `https://www.ature.ru/dashboard`

**After Sign-Up:**
- Change from: `/` or `https://www.ature.ru`
- Change to: `/dashboard` or `https://www.ature.ru/dashboard`

**After Sign-Out:**
- Can stay as `/` or `https://www.ature.ru` (home page is fine for sign-out)

### Step 3: Save Changes

1. Click **Save** or **Apply**
2. Changes take effect immediately (no deployment needed)

## Alternative: Check "Redirect URLs" Section

In Clerk Dashboard → **Paths**, there might be a separate **"Redirect URLs"** section where you can add:

- `https://www.ature.ru/dashboard`
- `https://ature.ru/dashboard` (without www)

Make sure both are added if you use both domains.

## Code-Level Fixes (Already Applied)

The code has been updated to:
1. ✅ Use `afterSignUpUrl="/dashboard"` in SignUp component
2. ✅ Use `afterSignInUrl="/dashboard"` in SignIn component
3. ✅ Added `useEffect` hooks to redirect when authentication state changes
4. ✅ Added redirect URLs to `ClerkProvider` in `main.jsx`

However, **Clerk Dashboard settings override code settings**, so you must update the Dashboard.

## Verify the Fix

1. Sign out (if logged in)
2. Sign in or sign up
3. You should be redirected to `/dashboard` instead of `/`

## Still Not Working?

If redirects still go to home page:

1. **Check Clerk Dashboard → Logs:**
   - Look for recent sign-in/sign-up events
   - Check what redirect URL was used

2. **Clear Browser Cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear cookies for `ature.ru`

3. **Check Multiple Redirect URL Settings:**
   - Clerk Dashboard might have redirect URLs in multiple places:
     - **Paths** → Redirect URLs
     - **Paths** → Component paths
     - **User & Authentication** → Redirect URLs
   - Update all of them to `/dashboard`

4. **Test in Incognito:**
   - Open incognito/private window
   - Try signing in
   - This rules out browser cache issues

## Quick Checklist

- [ ] Clerk Dashboard → Paths → Redirect URLs → After Sign-In = `/dashboard`
- [ ] Clerk Dashboard → Paths → Redirect URLs → After Sign-Up = `/dashboard`
- [ ] Code has `afterSignUpUrl="/dashboard"` ✅
- [ ] Code has `afterSignInUrl="/dashboard"` ✅
- [ ] Code has `ClerkProvider` with redirect URLs ✅
- [ ] Tested sign-in redirect
- [ ] Tested sign-up redirect

