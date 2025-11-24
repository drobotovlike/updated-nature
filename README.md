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

The project is configured for Vercel deployment. Connect your GitHub repository to Vercel and deploy automatically.

### Required Environment Variables in Vercel

**IMPORTANT**: You must set these environment variables in Vercel for the app to work:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

#### `VITE_CLERK_PUBLISHABLE_KEY` (Required)
- **Name**: `VITE_CLERK_PUBLISHABLE_KEY`
- **Value**: Your Clerk publishable key (starts with `pk_test_` or `pk_live_`)
- **Environment**: Select all (Production, Preview, Development)
- Get your key from [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)

#### `GEMINI_API_KEY` (Required for AI features)
- **Name**: `GEMINI_API_KEY`
- **Value**: Your Google Gemini API key
- **Environment**: Select all (Production, Preview, Development)
- Get your key from [Google AI Studio](https://aistudio.google.com/apikey)

4. Click **Save** and **Redeploy** your application

### Troubleshooting Deployment

**Error: "useAuth can only be used within <ClerkProvider />"**
- This means `VITE_CLERK_PUBLISHABLE_KEY` is not set in Vercel
- Follow the steps above to add the environment variable
- Make sure to redeploy after adding the variable

## License

© 2024 Ature Inc. All rights reserved.

