# Account Creation Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Cannot create account" or form doesn't submit

**Possible Causes:**
1. Clerk API key not set or invalid
2. Redirect URLs not configured in Clerk
3. Email verification settings blocking sign-up
4. Browser console errors

**Solutions:**

#### Check Clerk API Key
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys**
4. Verify your **Publishable Key** is set in Vercel:
   - Vercel Dashboard → Settings → Environment Variables
   - Name: `VITE_CLERK_PUBLISHABLE_KEY`
   - Value: Your key (starts with `pk_test_` or `pk_live_`)
5. **Redeploy** after adding/updating the key

#### Configure Redirect URLs in Clerk
1. Go to Clerk Dashboard → **Paths**
2. Set these URLs:
   - **Sign-in redirect URL**: `https://yourdomain.com/dashboard` (or `http://localhost:5173/dashboard` for dev)
   - **Sign-up redirect URL**: `https://yourdomain.com/dashboard` (or `http://localhost:5173/dashboard` for dev)
   - **After sign-out URL**: `https://yourdomain.com` (or `http://localhost:5173` for dev)
3. Click **Save**

#### Check Email Verification Settings
1. Go to Clerk Dashboard → **Email, Phone, Username**
2. Under **Email address**, check:
   - **Verification**: If set to "Required", users must verify email before account is created
   - **Verification link**: Should be enabled
3. For testing, you can temporarily set verification to "Optional"

#### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors when trying to sign up
4. Common errors:
   - `Clerk: Missing publishableKey` → API key not set
   - `Clerk: Invalid redirect URL` → Redirect URLs not configured
   - Network errors → Check Clerk dashboard status

### Issue 2: Form submits but nothing happens

**Check:**
1. Browser console for JavaScript errors
2. Network tab for failed API requests
3. Clerk Dashboard → Users to see if account was created
4. Email inbox for verification email (if verification is required)

### Issue 3: OAuth (Google/Apple) not working

**Solutions:**
1. Go to Clerk Dashboard → **OAuth**
2. Verify OAuth providers are enabled
3. Check that redirect URIs are configured correctly
4. For Google: Verify OAuth credentials in Google Cloud Console
5. For Apple: Verify Service ID configuration

### Issue 4: Email already exists error

**Solution:**
- The email is already registered
- Try signing in instead of signing up
- Or use a different email address

## Quick Checklist

- [ ] `VITE_CLERK_PUBLISHABLE_KEY` is set in Vercel environment variables
- [ ] Application has been redeployed after setting the key
- [ ] Redirect URLs are configured in Clerk Dashboard
- [ ] Email verification settings allow sign-up
- [ ] Browser console shows no errors
- [ ] Clerk application is active (not suspended)

## Test Account Creation

1. Go to `/sign-up` page
2. Try signing up with:
   - Email/Password
   - Google (if enabled)
   - Apple (if enabled)
3. Check browser console for any errors
4. Check Clerk Dashboard → Users to see if account appears

## Still Not Working?

1. Check Clerk Dashboard → **Logs** for sign-up attempts
2. Verify your Clerk application is not suspended
3. Check Vercel function logs for any API errors
4. Try in an incognito/private browser window
5. Clear browser cache and cookies

