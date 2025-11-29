# ATURE Studio

AI-powered interior design visualization platform for professional designers and architects.

## Features

- **AI Furniture Blending** - Blend furniture into room photos using Google Gemini AI
- **AR Visualization** - View 3D models in AR using model-viewer
- **User Authentication** - Sign up with Google, Apple, or Email via Clerk
- **Project Management** - Save and manage your design projects
- **Export Options** - Export to USDZ, GLB, OBJ, FBX formats

## Tech Stack

- **Frontend**: React 19 + Vite 7
- **Styling**: Tailwind CSS 3
- **Routing**: React Router DOM 7
- **Authentication**: Clerk
- **AI**: Google Gemini API (Nano Banana)
- **3D/AR**: Model-viewer
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Get your Clerk key from [Clerk Dashboard](https://dashboard.clerk.com)

### Development

```bash
# Start dev server
npm run dev

# Start with API server (for local Gemini testing)
npm run dev:full
```

### Build

```bash
npm run build
```

## Project Structure

```
ature-app/
├── api/                    # Vercel serverless functions
│   └── nano-banana/
│       └── visualize.js    # Gemini API integration
├── src/
│   ├── components/         # Reusable components
│   │   ├── Footer.jsx
│   │   ├── Layout.jsx
│   │   ├── Navigation.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/              # Page components
│   │   ├── AboutPage.jsx
│   │   ├── AccountPage.jsx
│   │   ├── BlogPage.jsx
│   │   ├── HelpPage.jsx
│   │   ├── PricingPage.jsx
│   │   ├── SignInPage.jsx
│   │   └── SignUpPage.jsx
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── test-api-server.js      # Local API server for testing
└── vercel.json             # Vercel configuration
```

## Documentation

- **Authentication**: See `CLERK_SETUP.md` and `QUICK_START_AUTH.md`
- **Gemini API**: See `GEMINI_SETUP.md`

## Deployment

The project is configured for Vercel deployment with Supabase cloud storage for cross-device sync.

### Required Environment Variables in Vercel

**IMPORTANT**: You must set these environment variables in Vercel for the app to work:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

#### Clerk Authentication
- **Name**: `VITE_CLERK_PUBLISHABLE_KEY`
- **Value**: Your Clerk publishable key (starts with `pk_test_` or `pk_live_`)
- **Environment**: Select all (Production, Preview, Development)
- Get from [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)

- **Name**: `CLERK_SECRET_KEY`
- **Value**: Your Clerk secret key (starts with `sk_test_` or `sk_live_`)
- **Environment**: Select all (Production, Preview, Development)

- **Name**: `CLERK_JWT_KEY`
- **Value**: Your Clerk JWT key (optional, for performance optimization)
- **Environment**: Select all (Production, Preview, Development)

#### Supabase (Cloud Storage)
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://ifvqkmpyknfezpxscnef.supabase.co`
- **Environment**: Select all

- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg`
- **Environment**: Select all

- **Name**: `SUPABASE_URL`
- **Value**: `https://ifvqkmpyknfezpxscnef.supabase.co`
- **Environment**: Select all

- **Name**: `SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg`
- **Environment**: Select all

#### Gemini AI (Required for AI features)
- **Name**: `GEMINI_API_KEY`
- **Value**: Your Google Gemini API key
- **Environment**: Select all (Production, Preview, Development)
- Get from [Google AI Studio](https://aistudio.google.com/apikey)

4. Click **Save** and **Redeploy** your application

### Database Setup

**Before deploying, you must set up the database:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ifvqkmpyknfezpxscnef)
2. Run the SQL in `database-schema.sql` (see `SUPABASE_SETUP.md` for details)
3. Create a storage bucket named `ature-files` (see `QUICK_SETUP.md`)

See `QUICK_SETUP.md` for detailed setup instructions.

### Troubleshooting Deployment

**Error: "useAuth can only be used within <ClerkProvider />"**
- `VITE_CLERK_PUBLISHABLE_KEY` is not set in Vercel
- Add the environment variable and redeploy

**Projects not syncing across devices?**
- Verify Supabase environment variables are set
- Check that database schema was run
- Verify storage bucket `ature-files` exists

## License

© 2024 Ature Inc. All rights reserved.

