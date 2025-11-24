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

Make sure to set environment variables in Vercel Dashboard:
- `VITE_CLERK_PUBLISHABLE_KEY`
- `GEMINI_API_KEY` (for serverless function)

## License

© 2024 Ature Inc. All rights reserved.

