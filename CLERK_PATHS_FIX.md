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

## Alternative: Disable Account Portal (Recommended)

Since you have custom sign-in/sign-up pages, you should **disable the Account Portal**:

1. Go to Clerk Dashboard → **Paths** → **Account Portal** (or look for Account Portal settings)
2. Look for a toggle/switch to disable it
3. Or change the domain from `accounts.ature.ru` to your application domain
4. See `CLERK_ACCOUNT_PORTAL_FIX.md` for detailed instructions

**Why disable it?** The Account Portal is Clerk's hosted solution. If you're using your own pages, the Account Portal will cause unwanted redirects to `accounts.ature.ru`.

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

