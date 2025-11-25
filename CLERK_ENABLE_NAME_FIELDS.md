# Enable First and Last Name in Clerk Dashboard

## Problem
Error: "first_name is not a valid parameter for this request" when trying to update profile.

## Solution: Enable First and Last Name Attributes

The First and Last Name fields must be enabled in Clerk Dashboard before they can be updated via the API.

### Step-by-Step Instructions:

1. **Go to Clerk Dashboard**
   - Visit [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Select your application

2. **Navigate to User Attributes**
   - Go to **User & Authentication** → **Attributes**
   - Or go to **User & Authentication** → **Email, Phone, Username** → **Attributes**

3. **Enable First and Last Name**
   - Find **"First and last name"** in the list of attributes
   - Toggle it **ON** (enable it)
   - Make sure it's marked as **Required** or **Optional** (depending on your needs)

4. **Save Changes**
   - Click **Save** or **Apply**
   - Changes take effect immediately

### Alternative: Check Required Attributes

If you can't find "First and last name" in the Attributes list:

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Look for **"Required attributes"** or **"Optional attributes"** section
3. Ensure **"First name"** and **"Last name"** are listed and enabled

### Verify It's Enabled

After enabling:

1. Go to **User & Authentication** → **Attributes**
2. You should see **"First and last name"** with a toggle that's **ON**
3. Try updating your profile again on the website

## What This Enables

Once enabled, users can:
- ✅ Update their first name directly on your website
- ✅ Update their last name directly on your website
- ✅ The `user.update({ firstName, lastName })` API will work

## If Still Not Working

1. **Check Clerk Dashboard Logs:**
   - Go to **Logs** in Clerk Dashboard
   - Look for recent update attempts
   - Check for specific error messages

2. **Verify Attribute Names:**
   - Make sure you're using `firstName` and `lastName` (camelCase) in code
   - Not `first_name` or `last_name` (snake_case)

3. **Check User Permissions:**
   - Ensure the user has permission to update their own profile
   - Some Clerk plans may have restrictions

4. **Contact Clerk Support:**
   - If the attribute is enabled but still not working
   - Provide the exact error message
   - Include your Clerk application ID

## Code Implementation

The code is already set up correctly to use:
```javascript
await user.update({
  firstName: 'John',
  lastName: 'Doe'
})
```

Once the attributes are enabled in Clerk Dashboard, this will work without any code changes.

