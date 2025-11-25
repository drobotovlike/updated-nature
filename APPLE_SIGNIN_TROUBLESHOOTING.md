# Apple Sign-In Troubleshooting Guide

## Issue: "Sign up with Apple" button keeps loading but nothing happens

### Common Causes and Solutions

#### 1. Apple OAuth Not Configured in Clerk

**Check:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **User & Authentication** → **Social Connections**
4. Find **Apple** in the list
5. Check if it's **Enabled**

**Fix:**
- If disabled, click **Enable**
- You'll need to configure Apple Developer credentials (see below)

#### 2. Apple Developer Credentials Missing

Apple Sign-In requires proper configuration in Apple Developer Portal:

**Required Setup:**
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. You need:
   - **App ID** (with Sign in with Apple capability)
   - **Service ID** (for web authentication)
   - **Key** (for JWT signing)
   - **Team ID**

**Steps:**
1. Create/Configure App ID:
   - Go to **Certificates, Identifiers & Profiles**
   - **Identifiers** → **App IDs**
   - Create or edit your App ID
   - Enable **Sign in with Apple**

2. Create Service ID:
   - **Identifiers** → **Services IDs**
   - Create new Service ID
   - Enable **Sign in with Apple**
   - Configure domains and redirect URLs:
     - **Domains**: `ature.ru` (or your domain)
     - **Return URLs**: Get from Clerk Dashboard → OAuth → Apple

3. Create Key:
   - **Keys** → Create new key
   - Enable **Sign in with Apple**
   - Download the key file (you can only download once!)
   - Note the **Key ID**

4. Configure in Clerk:
   - Go to Clerk Dashboard → **OAuth** → **Apple**
   - Enter:
     - **Team ID** (from Apple Developer account)
     - **Key ID** (from the key you created)
     - **Private Key** (content of the .p8 file you downloaded)
     - **Service ID** (the Service ID you created)
   - Click **Save**

#### 3. Redirect URLs Not Configured

**Check:**
1. Clerk Dashboard → **OAuth** → **Apple**
2. Verify **Return URLs** are set correctly
3. Should include your domain: `https://ature.ru` or your Vercel domain

**Fix:**
- Add your production domain to Return URLs
- Format: `https://yourdomain.com`
- Or: `https://your-app.vercel.app`

#### 4. Browser Blocking Popup/Redirect

**Check:**
- Browser console (F12) for errors
- Popup blockers might be blocking the OAuth flow

**Fix:**
- Disable popup blockers for your site
- Try in incognito/private window
- Check browser console for specific errors

#### 5. Network/CORS Issues

**Check:**
- Browser console → Network tab
- Look for failed requests when clicking Apple button

**Fix:**
- Check Clerk Dashboard → **Logs** for OAuth errors
- Verify your domain is properly configured
- Check that CNAME records are verified

### Quick Diagnostic Steps

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Click "Sign up with Apple"
   - Look for error messages

2. **Check Network Tab:**
   - Open DevTools → Network tab
   - Click "Sign up with Apple"
   - Look for failed requests
   - Check response codes and error messages

3. **Check Clerk Dashboard:**
   - Go to **Logs** in Clerk Dashboard
   - Look for OAuth attempts
   - Check for error messages

4. **Test Email/Password:**
   - Try signing up with email/password first
   - If that works, the issue is specific to Apple OAuth
   - If that doesn't work, it's a general Clerk configuration issue

### Temporary Workaround

If Apple Sign-In isn't working, users can:
1. Sign up with **Email/Password** instead
2. Or use **Google Sign-In** (if configured)
3. Apple Sign-In can be fixed later without blocking users

### Complete Apple OAuth Setup Checklist

- [ ] Apple Developer account active
- [ ] App ID created with "Sign in with Apple" enabled
- [ ] Service ID created and configured
- [ ] Key created and downloaded (.p8 file)
- [ ] Team ID, Key ID, and Private Key entered in Clerk
- [ ] Service ID entered in Clerk
- [ ] Return URLs configured in Apple Developer Portal
- [ ] Return URLs match your domain in Clerk
- [ ] Apple OAuth enabled in Clerk Dashboard
- [ ] Domain verified in Clerk (ature.ru)

### Still Not Working?

1. **Disable and Re-enable Apple OAuth:**
   - Clerk Dashboard → OAuth → Apple
   - Disable, save
   - Re-enable, save
   - Test again

2. **Check Clerk Status:**
   - Visit [Clerk Status Page](https://status.clerk.com)
   - Check if there are any service issues

3. **Contact Support:**
   - Clerk has excellent support
   - Check their docs: https://clerk.com/docs
   - Or contact Clerk support with error details

