# Vercel DNS Setup for Clerk Domain Verification

## Step-by-Step Guide: Adding CNAME Records in Vercel

### Prerequisites
- Your domain `ature.ru` must be added to your Vercel project
- You must have access to the Vercel project settings

### Step 1: Access Domain Settings in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (ature-app or your project name)
3. Click on **Settings** in the top navigation
4. Click on **Domains** in the left sidebar

### Step 2: Find Your Domain

1. Look for `ature.ru` in the domains list
2. Click on the domain name `ature.ru`
3. This will open the domain management page

### Step 3: Add CNAME Records

You'll see a section for DNS records. Click **Add Record** and add each CNAME record:

#### Record 1: Frontend API
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `clerk.ature.ru` (or just `clerk` - try both if one doesn't work)
4. **Value**: `frontend-api.clerk.services`
5. Click **Save**

**Note**: If you get "Invalid name parameter", try:
- Just `clerk` (without the domain)
- Or `clerk.ature.ru` (full subdomain)
- Vercel may auto-append the domain, so try the shorter version first

#### Record 2: Account Portal
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `accounts` (or `accounts.ature.ru` if the short version doesn't work)
4. **Value**: `accounts.clerk.services`
5. Click **Save**

#### Record 3: Email (Optional - for custom email domain)
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `clkmail` (or `clkmail.ature.ru`)
4. **Value**: `mail.vyw2qdogt5cd.clerk.services`
5. Click **Save**

#### Record 4: Email DKIM 1 (Optional)
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `clk._domainkey` (or `clk._domainkey.ature.ru`)
4. **Value**: `dkim1.vyw2qdogt5cd.clerk.services`
5. Click **Save**

#### Record 5: Email DKIM 2 (Optional)
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `clk2._domainkey` (or `clk2._domainkey.ature.ru`)
4. **Value**: `dkim2.vyw2qdogt5cd.clerk.services`
5. Click **Save**

### Step 4: Verify Records

After adding all records, you should see:
- `clerk` → `frontend-api.clerk.services` (CNAME)
- `accounts` → `accounts.clerk.services` (CNAME)
- `clkmail` → `mail.vyw2qdogt5cd.clerk.services` (CNAME) - if added
- `clk._domainkey` → `dkim1.vyw2qdogt5cd.clerk.services` (CNAME) - if added
- `clk2._domainkey` → `dkim2.vyw2qdogt5cd.clerk.services` (CNAME) - if added

### Step 5: Wait for DNS Propagation

1. DNS changes typically take **15-30 minutes** to propagate
2. Can take up to 48 hours in rare cases
3. You can check propagation status using online tools like:
   - [whatsmydns.net](https://www.whatsmydns.net)
   - Enter `clerk.ature.ru` and check if it resolves to `frontend-api.clerk.services`

### Step 6: Verify in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Domains**
4. The status should change from **"Unverified"** to **"Verified"**
5. If still unverified:
   - Wait a bit longer (DNS propagation)
   - Double-check the CNAME records in Vercel
   - Make sure there are no typos

## Important Notes

- **Minimum Required**: Only the first 2 records (Frontend API and Account Portal) are required for authentication to work
- **Email Records**: The 3 email records are optional - only needed if you want custom email domain
- **TTL**: Vercel will set TTL automatically (usually 3600 seconds)
- **No Subdomain Conflicts**: Make sure you don't have conflicting A or AAAA records for `clerk` or `accounts`

## Troubleshooting

### "Invalid name parameter" Error

**This is the most common issue!** Vercel's DNS format can be tricky:

**Solution 1: Use just the subdomain (recommended)**
- For `clerk.ature.ru`, enter just: `clerk`
- For `accounts.ature.ru`, enter just: `accounts`
- Vercel will automatically append your domain

**Solution 2: If that doesn't work, try full subdomain**
- Enter: `clerk.ature.ru` (full subdomain)
- Enter: `accounts.ature.ru` (full subdomain)

**Solution 3: Check Vercel's format**
- Some Vercel setups require: `@` for root domain
- Or they might auto-detect - try leaving it blank if there's an option
- Check existing records in Vercel to see the format they use

**Solution 4: Use a different DNS provider**
- If Vercel DNS is causing issues, you can:
  - Point your domain's nameservers to another DNS provider (Cloudflare, etc.)
  - Add CNAME records there instead
  - Then point the domain back to Vercel for hosting

### Domain Not Showing in Vercel
- Make sure the domain is added to your Vercel project
- Go to **Settings** → **Domains** → **Add Domain**
- Enter `ature.ru` and follow the verification steps

### Records Not Saving
- Check that you have proper permissions on the Vercel project
- Try refreshing the page
- Check browser console for errors
- Make sure you're using the correct format (see "Invalid name parameter" above)

### Still Showing Unverified in Clerk
- Wait 30-60 minutes for DNS propagation
- Verify records are correct in Vercel DNS settings
- Check that records are actually saved (refresh the page)
- Try removing and re-adding the domain in Clerk Dashboard

## Quick Checklist

- [ ] Domain `ature.ru` is added to Vercel project
- [ ] CNAME record `clerk` → `frontend-api.clerk.services` added
- [ ] CNAME record `accounts` → `accounts.clerk.services` added
- [ ] Waited 15-30 minutes for DNS propagation
- [ ] Checked Clerk Dashboard - domains should show "Verified"
- [ ] Tested account creation - should work now

## Alternative: Use Clerk Default Domains

If you want to skip DNS configuration entirely:
1. Remove custom domain from Clerk Dashboard
2. Use Clerk's default `clerk.accounts.dev` domains
3. Account creation will work immediately
4. You can add custom domain later when ready

