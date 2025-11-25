# Fix Clerk Account Portal Configuration

## Problem
The Clerk Account Portal is configured to use `accounts.ature.ru` for all authentication flows, causing redirects away from your main application domain.

## Solution: Disable Account Portal or Configure Application Domain

You have two options:

### Option 1: Disable Account Portal (Recommended)

If you want users to stay on your application domain (`ature.ru`) and use your custom sign-in/sign-up pages:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Paths** (or **User & Authentication** → **Paths**)
4. Find the **Account Portal** section
5. **Disable the Account Portal** or set it to use your application domain

**OR** in the Account Portal settings:
- Look for a toggle to disable it
- Or change the domain from `accounts.ature.ru` to your application domain

### Option 2: Keep Account Portal but Use Application Domain

If you want to keep the Account Portal but have it work on your domain:

1. In Clerk Dashboard → **Paths** → **Account Portal**
2. Change the domain from `accounts.ature.ru` to `ature.ru`
3. Update all URLs to use your application domain:
   - Sign in: `https://ature.ru/sign-in` (or use your app's sign-in page)
   - Sign up: `https://ature.ru/sign-up` (or use your app's sign-up page)
   - User profile: `https://ature.ru/account` (or use your app's account page)

### Option 3: Use Application Domain Paths (Best for Custom UI)

Since you've built custom sign-in/sign-up pages, you should:

1. **Disable Account Portal** completely
2. Use **Application Domain** paths instead:
   - Go to **Paths** → **Component paths**
   - Set:
     - Sign-in: "Sign-in page on application domain" → `/sign-in`
     - Sign-up: "Sign-up page on application domain" → `/sign-up`
     - User profile: "Path on application domain" → `/account`

## Step-by-Step: Disable Account Portal

1. Go to Clerk Dashboard → Your App
2. Navigate to **Paths** or **User & Authentication** → **Paths**
3. Find **Account Portal** section
4. Look for:
   - A toggle/switch to disable it
   - Or settings to change the domain
5. Either:
   - **Disable** the Account Portal
   - **OR** change domain from `accounts.ature.ru` to `ature.ru`

## Verify the Fix

After making changes:

1. **Test Sign-In:**
   - Go to `/sign-in` on your site
   - Should stay on `ature.ru`, not redirect to `accounts.ature.ru`

2. **Test Sign-Up:**
   - Go to `/sign-up` on your site
   - Should stay on `ature.ru`, not redirect to `accounts.ature.ru`

3. **Test Account Page:**
   - After signing in, go to `/account`
   - Should use your custom account page, not `accounts.ature.ru/user`

## Current Configuration Issues

Based on the Account Portal overview:
- ❌ Sign in: `https://accounts.ature.ru/sign-in` (redirects away)
- ❌ Sign up: `https://accounts.ature.ru/sign-up` (redirects away)
- ❌ User profile: `https://accounts.ature.ru/user` (redirects away)

**Should be:**
- ✅ Sign in: `https://ature.ru/sign-in` (your app)
- ✅ Sign up: `https://ature.ru/sign-up` (your app)
- ✅ User profile: `https://ature.ru/account` (your app)

## Why This Matters

The Account Portal is Clerk's hosted solution. If you've built custom pages (which you have), you should:
1. Disable the Account Portal
2. Use your own pages on your domain
3. This prevents redirects and keeps users on your site

## Still Having Issues?

If you can't find the disable option:
1. Check **Paths** → **Redirect URLs** - make sure they point to your domain
2. Check **Paths** → **Component paths** - should use "application domain"
3. Contact Clerk support if the Account Portal can't be disabled

