# Email Verification Fix - White Screen After CAPTCHA

## Problem
After entering email and completing CAPTCHA verification, a white/blank window opens and nothing happens.

## Root Cause
This is typically caused by **incorrect redirect URLs** in Clerk Dashboard. The email verification link redirects to a URL that doesn't exist or isn't configured properly.

## Solution

### Step 1: Check Clerk Dashboard Redirect URLs

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Paths** (or **User & Authentication** → **Paths**)

### Step 2: Configure These URLs

**For Production (ature.ru):**
- **Sign-in redirect URL**: `https://ature.ru/dashboard`
- **Sign-up redirect URL**: `https://ature.ru/dashboard`
- **After sign-out URL**: `https://ature.ru`
- **After email verification URL**: `https://ature.ru/dashboard`
- **After email link verification URL**: `https://ature.ru/dashboard`

**For Development (localhost):**
- **Sign-in redirect URL**: `http://localhost:5173/dashboard`
- **Sign-up redirect URL**: `http://localhost:5173/dashboard`
- **After sign-out URL**: `http://localhost:5173`
- **After email verification URL**: `http://localhost:5173/dashboard`
- **After email link verification URL**: `http://localhost:5173/dashboard`

### Step 3: Check Email Verification Settings

1. In Clerk Dashboard, go to **User & Authentication** → **Email, Phone, Username**
2. Find **Email** settings
3. Check **Email verification**:
   - Should be **enabled**
   - **Verification method**: Should be set (usually "Email link" or "Email code")
4. Check **Redirect URLs** for email verification:
   - Should match your production domain: `https://ature.ru/dashboard`

### Step 4: Update SignUp Component (Optional Fix)

If redirects are still not working, we can add explicit redirect handling in the code. The current `SignUp` component has:
- `redirectUrl="/dashboard"` ✅
- `afterSignUpUrl="/dashboard"` ✅

These should work, but we can also add `fallbackRedirectUrl` as a backup.

### Step 5: Test the Flow

1. Go to `/sign-up`
2. Enter your email
3. Complete CAPTCHA
4. Check your email for verification link
5. Click the verification link
6. Should redirect to `/dashboard` (not a white screen)

## Common Issues

### Issue 1: White Screen = Wrong Redirect URL
**Fix**: Make sure all redirect URLs in Clerk Dashboard point to your actual domain (`https://ature.ru`), not `localhost` or a placeholder.

### Issue 2: CAPTCHA Loading Slowly
**Possible causes:**
- Network issues
- Google reCAPTCHA service slow
- Ad blockers blocking reCAPTCHA

**Fix:**
- Check browser console for errors
- Try disabling ad blockers
- Check network tab for failed requests to `recaptcha.net` or `google.com`

### Issue 3: Verification Link Opens Blank Page
**Fix**: 
- Check the verification link URL in your email
- It should redirect to something like: `https://ature.ru/verify-email?token=...`
- If it redirects to `clerk.accounts.dev` or similar, the redirect URL is not configured

### Issue 4: After Verification, Nothing Happens
**Fix**:
- Check browser console (F12) for JavaScript errors
- Check Clerk Dashboard → **Logs** for authentication errors
- Verify the `afterSignUpUrl` in Clerk Dashboard matches your app's dashboard route

## Quick Diagnostic Steps

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for errors when the white screen appears

2. **Check Network Tab:**
   - Open DevTools → Network tab
   - Look for failed requests
   - Check redirect responses

3. **Check Clerk Logs:**
   - Go to Clerk Dashboard → **Logs**
   - Look for recent sign-up attempts
   - Check for error messages

4. **Test Verification Link:**
   - Copy the verification link from your email
   - Check what domain it points to
   - It should redirect to your app, not Clerk's domain

## Code Fix (If Needed)

If redirects still don't work, we can add explicit handling in the SignUp component:

```jsx
<SignUp
  routing="path"
  path="/sign-up"
  signInUrl="/sign-in"
  redirectUrl="/dashboard"
  afterSignUpUrl="/dashboard"
  fallbackRedirectUrl="/dashboard"  // Add this as backup
  // ... rest of props
/>
```

## Still Not Working?

1. **Clear Browser Cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear cookies for your domain
   - Try incognito/private window

2. **Check Domain Configuration:**
   - Verify your domain is properly configured in Clerk
   - Check that CNAME records are verified
   - Ensure SSL certificate is valid

3. **Contact Clerk Support:**
   - Check [Clerk Status](https://status.clerk.com)
   - Review [Clerk Docs](https://clerk.com/docs)
   - Contact Clerk support with:
     - Your Clerk application ID
     - Screenshot of the white screen
     - Browser console errors
     - Network tab errors

