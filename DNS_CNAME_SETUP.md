# How to Add CNAME Records for Clerk Domain Verification

## Important: CNAME Records are NOT Added in Vercel

CNAME records must be added in your **DNS provider** (where you manage the domain `ature.ru`), not in Vercel.

## Where to Add CNAME Records

### Step 1: Find Your DNS Provider

Your DNS provider is where you:
- Bought the domain `ature.ru`
- Manage DNS settings for the domain
- Can add/edit DNS records

Common DNS providers:
- **Namecheap**
- **GoDaddy**
- **Google Domains**
- **Cloudflare**
- **Route 53 (AWS)**
- **Vercel DNS** (only if you transferred the domain to Vercel)

### Step 2: Access DNS Management

1. Log in to your domain registrar/DNS provider
2. Find your domain `ature.ru`
3. Look for:
   - **DNS Management**
   - **DNS Settings**
   - **DNS Records**
   - **Advanced DNS**
   - **Name Servers**

### Step 3: Add CNAME Records

Add these CNAME records one by one:

#### Record 1: Frontend API
- **Type**: CNAME
- **Host/Name**: `clerk`
- **Target/Value**: `frontend-api.clerk.services`
- **TTL**: 3600 (or Auto/Default)

#### Record 2: Account Portal
- **Type**: CNAME
- **Host/Name**: `accounts`
- **Target/Value**: `accounts.clerk.services`
- **TTL**: 3600 (or Auto/Default)

#### Record 3: Email (Optional)
- **Type**: CNAME
- **Host/Name**: `clkmail`
- **Target/Value**: `mail.vyw2qdogt5cd.clerk.services`
- **TTL**: 3600

#### Record 4: Email DKIM 1 (Optional)
- **Type**: CNAME
- **Host/Name**: `clk._domainkey`
- **Target/Value**: `dkim1.vyw2qdogt5cd.clerk.services`
- **TTL**: 3600

#### Record 5: Email DKIM 2 (Optional)
- **Type**: CNAME
- **Host/Name**: `clk2._domainkey`
- **Target/Value**: `dkim2.vyw2qdogt5cd.clerk.services`
- **TTL**: 3600

### Step 4: Save and Wait

1. Click **Save** or **Add Record**
2. Wait 15-30 minutes for DNS propagation
3. Go back to Clerk Dashboard → Domains
4. Click **Verify** or wait for automatic verification

## If Your Domain is in Vercel

If you transferred `ature.ru` to Vercel DNS:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Find `ature.ru`
5. Click on it to manage DNS records
6. Click **Add Record**
7. Select **CNAME** type
8. Add the records as shown above

## Common DNS Providers - Step by Step

### Namecheap
1. Log in → **Domain List** → Click **Manage** next to `ature.ru`
2. Go to **Advanced DNS** tab
3. Click **Add New Record**
4. Select **CNAME Record**
5. Enter Host and Target
6. Click **Save**

### GoDaddy
1. Log in → **My Products** → **DNS** next to `ature.ru`
2. Scroll to **Records** section
3. Click **Add**
4. Select **CNAME**
5. Enter Name and Value
6. Click **Save**

### Cloudflare
1. Log in → Select `ature.ru`
2. Go to **DNS** → **Records**
3. Click **Add record**
4. Type: **CNAME**
5. Enter Name and Target
6. Click **Save**

### Google Domains
1. Log in → Click on `ature.ru`
2. Go to **DNS** tab
3. Scroll to **Custom resource records**
4. Click **Manage custom records**
5. Add CNAME records
6. Click **Save**

## Verification

After adding records:
1. Wait 15-30 minutes
2. Go to Clerk Dashboard → **Domains**
3. Status should change from "Unverified" to "Verified"
4. If still unverified, check:
   - Records are saved correctly
   - No typos in host or target
   - DNS propagation may take up to 48 hours

## Quick Alternative

**Don't want to configure DNS?** You can use Clerk's default domains instead:
- Remove custom domain from Clerk Dashboard
- Use default `clerk.accounts.dev` URLs
- No DNS configuration needed
- Works immediately

