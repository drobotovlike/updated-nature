# Fix: Users Not Showing in Clerk Dashboard

## Problem
Users are being created but not visible in the Clerk Dashboard.

## Common Causes

### 1. **Email Verification Required**
If your Clerk instance requires email verification, users are created but remain in a "pending" state until they verify their email. These users might not appear in the main users list until verified.

**Solution:**
- Check Clerk Dashboard → User & Authentication → Email, Phone, Username
- Look for "Require email verification" setting
- Unverified users may be in a separate view or filtered out

### 2. **Check Different Views in Clerk Dashboard**
- Go to Clerk Dashboard → Users
- Check if there's a filter for "Verified" vs "Unverified" users
- Check "All Users" vs "Active Users" tabs
- Look for a "Pending" or "Unverified" section

### 3. **User Creation Status**
The sign-up code now logs the status:
- `missing_requirements` = User created but needs verification
- `complete` = User created and verified

Check your browser console to see what status is returned.

### 4. **Clerk Instance/Environment**
- Make sure you're checking the correct Clerk application in the dashboard
- Verify you're using the correct API keys (development vs production)
- Check if you have multiple Clerk instances

### 5. **Email Provider Configuration**
If email verification is enabled but emails aren't being sent:
- Go to Clerk Dashboard → Email & SMS → Email
- Configure an email provider (Resend, SendGrid, etc.)
- Without a configured provider, verification emails won't send

## How to Check

1. **Open Browser Console** when signing up
   - Look for console.log messages showing sign-up status
   - Check for any errors

2. **Check Clerk Dashboard**
   - Go to Users section
   - Look for filters or tabs
   - Check "Unverified" or "Pending" sections

3. **Verify Email Provider**
   - Clerk Dashboard → Email & SMS → Email
   - Make sure an email provider is configured

## Quick Fix: Disable Email Verification (Development Only)

If you want to see users immediately without verification:

1. Go to Clerk Dashboard
2. User & Authentication → Email, Phone, Username
3. Find "Email address" settings
4. Disable "Require email verification" (for development/testing only)

**Warning:** Only disable this for development. Production should require email verification.

## Verify User Creation

The code now includes console logging. When you sign up:
- Check browser console for: `Sign-up result: [status]`
- If status is `missing_requirements`, the user is created but needs verification
- If status is `complete`, the user is fully created and verified

Users with `missing_requirements` status ARE created in Clerk, they just need to verify their email to become fully active.

