# Clerk Authentication Setup Guide

## Overview

This app uses [Clerk](https://clerk.com) for authentication, which provides:
- ✅ Google Sign-In
- ✅ Apple Sign-In
- ✅ Email/Password authentication
- ✅ Social OAuth (GitHub, Microsoft, etc.)
- ✅ User management dashboard
- ✅ Secure session management

## Step 1: Create a Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Click "Sign Up" (free tier available)
3. Create your account

## Step 2: Create a New Application

1. In the Clerk Dashboard, click "Create Application"
2. Choose:
   - **Name**: ATURE Studio (or your preferred name)
   - **Authentication providers**: Select the ones you want:
     - ✅ Email (Password)
     - ✅ Google
     - ✅ Apple
     - ✅ GitHub (optional)
     - ✅ Microsoft (optional)
3. Click "Create Application"

## Step 3: Get Your API Keys

1. In your Clerk Dashboard, go to **API Keys**
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

## Step 4: Configure Environment Variables

### For Local Development

Create a `.env.local` file in the root of your project:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Important**: 
- Never commit `.env.local` to Git (it's already in `.gitignore`)
- Use `pk_test_` for development
- Use `pk_live_` for production

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - **Name**: `VITE_CLERK_PUBLISHABLE_KEY`
   - **Value**: Your Clerk publishable key
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

## Step 5: Configure OAuth Providers (Optional)

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Add authorized redirect URIs:
   - `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
   - (Get this from Clerk Dashboard → OAuth → Google)
6. Copy Client ID and Client Secret
7. In Clerk Dashboard → OAuth → Google, paste the credentials

### Apple OAuth Setup

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create an App ID and Service ID
3. Configure Sign in with Apple
4. Get your Team ID, Key ID, and Private Key
5. In Clerk Dashboard → OAuth → Apple, enter the credentials

## Step 6: Configure Redirect URLs

In Clerk Dashboard → **Paths**:
- **Sign-in redirect URL**: `http://localhost:5173` (dev) or `https://yourdomain.com` (prod)
- **Sign-up redirect URL**: `http://localhost:5173` (dev) or `https://yourdomain.com` (prod)
- **After sign-out URL**: `http://localhost:5173` (dev) or `https://yourdomain.com` (prod)

## Step 7: Test Authentication

1. Start your dev server: `npm run dev`
2. Navigate to `http://localhost:5173/sign-up`
3. Try signing up with:
   - Email/Password
   - Google (if configured)
   - Apple (if configured)

## Available Routes

- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/account` - Protected account page (requires authentication)

## Features

### User Management
- Users can sign up with email, Google, or Apple
- User profiles are managed in Clerk Dashboard
- Profile pictures, names, and emails are automatically synced

### Protected Routes
- `/account` is protected and requires authentication
- Unauthenticated users are redirected to `/sign-in`

### Navigation
- Shows "Sign In" / "Sign Up" buttons when logged out
- Shows user avatar and "Account" link when logged in
- UserButton component provides dropdown menu for account management

## Troubleshooting

### "VITE_CLERK_PUBLISHABLE_KEY is not set"
- Make sure you created `.env.local` file
- Restart your dev server after adding the key
- Check that the key starts with `pk_test_` or `pk_live_`

### OAuth not working
- Verify redirect URLs are correctly configured
- Check that OAuth providers are enabled in Clerk Dashboard
- Ensure credentials are correctly entered

### Build errors
- Make sure environment variable is set in Vercel
- Check that variable name is exactly `VITE_CLERK_PUBLISHABLE_KEY`

## Next Steps

1. **Customize User Profile**: Use Clerk's user management API to add custom fields
2. **Subscription Integration**: Connect Clerk user IDs to your billing system
3. **Role-Based Access**: Use Clerk's organization features for team accounts
4. **Webhooks**: Set up webhooks for user events (sign-up, sign-in, etc.)

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk React SDK](https://clerk.com/docs/references/react/overview)
- [Clerk Dashboard](https://dashboard.clerk.com)

