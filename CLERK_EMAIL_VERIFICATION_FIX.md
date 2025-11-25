# Clerk Email Verification Not Working - Fix Guide

## Problem
Verification code is not being sent to email when signing up.

## Common Causes and Solutions

### 1. Email Provider Not Configured in Clerk

**Check:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **User & Authentication** → **Email, Phone, Username**
4. Find **Email** settings
5. Check if an email provider is configured

**Fix:**
- Clerk uses **Resend** by default (free tier: 3,000 emails/month)
- If Resend is not set up, you need to configure it:
  1. In Clerk Dashboard → **Email, Phone, Username** → **Email**
  2. Click **Configure email provider**
  3. Select **Resend** (default, free tier)
  4. Or configure your own SMTP provider

### 2. Email Domain Not Verified

**Check:**
1. Clerk Dashboard → **Email, Phone, Username** → **Email**
2. Look for domain verification status
3. Check if your custom domain (if using one) is verified

**Fix:**
- If using a custom domain, verify it in Clerk Dashboard
- Or use Clerk's default domain (works immediately)

### 3. Email Rate Limiting

**Check:**
- Clerk Dashboard → **Logs**
- Look for rate limit errors
- Check if you've exceeded free tier limits

**Fix:**
- Wait a few minutes and try again
- Upgrade to a paid plan if needed
- Check Resend dashboard for delivery issues

### 4. Email in Spam Folder

**Check:**
- Check your spam/junk folder
- Check email filters

**Fix:**
- Mark Clerk emails as "Not Spam"
- Add Clerk's email domain to your contacts
- Check email client filters

### 5. Email Address Format Issues

**Check:**
- Make sure email format is correct (e.g., `user@example.com`)
- No typos in the email address

**Fix:**
- Double-check the email address you entered
- Try a different email address to test

### 6. Clerk Email Settings Disabled

**Check:**
1. Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Find **Email** section
3. Check if email is **enabled**

**Fix:**
- Enable email authentication if it's disabled
- Check email verification settings

### 7. Development vs Production Environment

**Check:**
- Are you testing in development or production?
- Check if you're using the correct Clerk environment (test vs live)

**Fix:**
- Make sure you're using the correct Clerk publishable key
- Test keys (`pk_test_`) work in development
- Live keys (`pk_live_`) work in production

## Quick Diagnostic Steps

1. **Check Clerk Dashboard Logs:**
   - Go to Clerk Dashboard → **Logs**
   - Look for recent sign-up attempts
   - Check for error messages related to email sending

2. **Check Browser Console:**
   - Open DevTools (F12) → Console tab
   - Try signing up again
   - Look for error messages

3. **Test with Different Email:**
   - Try a different email provider (Gmail, Outlook, etc.)
   - Some email providers block automated emails

4. **Check Resend Dashboard:**
   - If using Resend, check their dashboard
   - Look for delivery status and errors

5. **Verify Email Provider Status:**
   - Clerk Dashboard → **Email, Phone, Username** → **Email**
   - Check provider status and configuration

## Step-by-Step Fix

### Step 1: Verify Email Provider is Configured

1. Go to Clerk Dashboard
2. **User & Authentication** → **Email, Phone, Username** → **Email**
3. If no provider is configured:
   - Click **Configure email provider**
   - Select **Resend** (default, free)
   - Or configure your own SMTP

### Step 2: Check Email Verification Settings

1. In the same **Email** section
2. Verify **Email verification** is enabled
3. Check verification method (Email link or Email code)

### Step 3: Test Email Delivery

1. Try signing up with a test email
2. Check Clerk Dashboard → **Logs** for delivery status
3. Check your email (including spam folder)

### Step 4: Check Domain Configuration (If Using Custom Domain)

1. Clerk Dashboard → **Domains**
2. Verify your custom domain is verified
3. Check DNS records are correct

## Still Not Working?

1. **Contact Clerk Support:**
   - Check [Clerk Status](https://status.clerk.com)
   - Review [Clerk Docs - Email](https://clerk.com/docs/authentication/email)
   - Contact Clerk support with:
     - Your Clerk application ID
     - Email address you're testing with
     - Screenshot of Clerk Dashboard logs
     - Browser console errors (if any)

2. **Check Resend Status:**
   - If using Resend, check [Resend Status](https://status.resend.com)
   - Verify Resend account is active

3. **Try Alternative Email Provider:**
   - Configure a different SMTP provider in Clerk
   - Test with that provider

## Quick Test

1. Go to `/sign-up`
2. Enter a valid email address
3. Check browser console for errors
4. Check Clerk Dashboard → **Logs** for email sending status
5. Check your email inbox (and spam folder)

If emails are still not arriving, the issue is likely in Clerk Dashboard email provider configuration.

