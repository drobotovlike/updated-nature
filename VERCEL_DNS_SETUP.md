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
3. **Name**: `clerk`
4. **Value**: `frontend-api.clerk.services`
5. Click **Save**

#### Record 2: Account Portal
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `accounts`
4. **Value**: `accounts.clerk.services`
5. Click **Save**

#### Record 3: Email (Optional - for custom email domain)
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `clkmail`
4. **Value**: `mail.vyw2qdogt5cd.clerk.services`
5. Click **Save**

#### Record 4: Email DKIM 1 (Optional)
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `clk._domainkey`
4. **Value**: `dkim1.vyw2qdogt5cd.clerk.services`
5. Click **Save**

#### Record 5: Email DKIM 2 (Optional)
1. Click **Add Record**
2. **Type**: Select **CNAME**
3. **Name**: `clk2._domainkey`
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

### Domain Not Showing in Vercel
- Make sure the domain is added to your Vercel project
- Go to **Settings** → **Domains** → **Add Domain**
- Enter `ature.ru` and follow the verification steps

### Records Not Saving
- Check that you have proper permissions on the Vercel project
- Try refreshing the page
- Check browser console for errors

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

