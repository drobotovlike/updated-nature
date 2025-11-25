# Clerk Domain Verification Setup

## Current Status
Your custom domain `ature.ru` needs to be verified with Clerk. This is required for:
- Frontend API access
- Account portal (sign-in/sign-up pages)
- Email delivery

## Option 1: Use Clerk's Default Domains (Easiest - Recommended for Testing)

You can use Clerk's default domains without custom domain verification:

1. **No custom domain needed** - Clerk provides default domains like:
   - `your-app.clerk.accounts.dev` for authentication
   - Default email sending

2. **This works immediately** - No DNS configuration required

3. **To use default domains:**
   - Don't add custom domains in Clerk Dashboard
   - Your app will work with Clerk's default authentication URLs
   - Users will see `clerk.accounts.dev` in the authentication flow

## Option 2: Verify Custom Domain (For Production)

If you want to use `ature.ru` for authentication, you need to add CNAME records:

### Step 1: Add CNAME Records in Your DNS Provider

Go to your DNS provider (where you manage `ature.ru`) and add these CNAME records:

#### Frontend API
- **Host/Name**: `clerk`
- **Target/Value**: `frontend-api.clerk.services`
- **TTL**: 3600 (or default)

#### Account Portal
- **Host/Name**: `accounts`
- **Target/Value**: `accounts.clerk.services`
- **TTL**: 3600 (or default)

#### Email (Optional - for custom email domain)
- **Host/Name**: `clkmail`
- **Target/Value**: `mail.vyw2qdogt5cd.clerk.services`
- **TTL**: 3600 (or default)

- **Host/Name**: `clk._domainkey`
- **Target/Value**: `dkim1.vyw2qdogt5cd.clerk.services`
- **TTL**: 3600 (or default)

- **Host/Name**: `clk2._domainkey`
- **Target/Value**: `dkim2.vyw2qdogt5cd.clerk.services`
- **TTL**: 3600 (or default)

### Step 2: Wait for DNS Propagation
- DNS changes can take 5 minutes to 48 hours
- Usually takes 15-30 minutes

### Step 3: Verify in Clerk Dashboard
- Go back to Clerk Dashboard → Domains
- Click "Verify" or wait for automatic verification
- Status should change from "Unverified" to "Verified"

## Quick Fix for Account Creation

**If you need account creation to work immediately:**

1. **Remove custom domain temporarily:**
   - Go to Clerk Dashboard → Domains
   - Remove or disable the custom domain `ature.ru`
   - Use Clerk's default domains

2. **Update redirect URLs:**
   - Go to Clerk Dashboard → Paths
   - Set redirect URLs to use default Clerk domains
   - Or use your Vercel domain: `https://your-vercel-app.vercel.app`

3. **Test account creation:**
   - Go to `/sign-up` page
   - Try creating an account
   - Should work with default domains

## Important Notes

- **Custom domains are optional** - Your app works fine with Clerk's default domains
- **Custom domains are for branding** - Makes auth URLs use your domain instead of `clerk.accounts.dev`
- **Email domain is optional** - Only needed if you want emails from `@ature.ru` instead of Clerk's default

## Troubleshooting

**If account creation still doesn't work after removing custom domain:**
1. Check `VITE_CLERK_PUBLISHABLE_KEY` is set in Vercel
2. Verify redirect URLs in Clerk Dashboard → Paths
3. Check browser console for errors
4. See `ACCOUNT_CREATION_TROUBLESHOOTING.md` for more help

