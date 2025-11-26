# ATURE Studio - Complete Project Overview

## 🎯 What We're Building

**ATURE Studio** is an AI-powered interior design visualization platform that allows professional designers, architects, and furniture manufacturers to blend furniture into room photos using artificial intelligence. Think of it as a professional-grade tool that combines AI image generation with project management, cloud storage, and a beautiful user interface.

---

## 🏗️ Core Functionality

### 1. **AI-Powered Furniture Blending**
The heart of the application uses **Google Gemini AI** to intelligently blend furniture images into room photos. Users can:
- Upload a room photo (floor plan, empty space, or existing interior)
- Upload a furniture piece (chair, table, sofa, etc.)
- Enter a text prompt describing the desired design
- Generate a photorealistic visualization showing the furniture seamlessly integrated into the room

**How it works:**
- Images are converted to base64 format
- Sent to Google Gemini API via Vercel serverless function (`api/nano-banana/visualize.js`)
- AI processes the images and prompt to create a blended result
- Result is displayed in the workspace for further editing

### 2. **Project Management System**
Users can organize their work into a hierarchical structure:

**Spaces** → **Projects** → **Creations**
- **Spaces**: Top-level containers (e.g., "Client A", "Residential Projects", "Commercial")
- **Projects**: Individual design projects within a space (e.g., "Living Room Design", "Kitchen Remodel")
- **Creations**: Individual AI-generated visualizations within a project

**Features:**
- Create, edit, and delete spaces and projects
- Trash system with 1-week auto-deletion
- Recent projects sidebar (last 10 opened)
- Home dashboard showing last 4 projects
- "My Projects" page showing all projects
- Cloud sync across all devices

### 3. **Private Asset Library**
Each user has their own private asset library stored in the cloud:
- Upload furniture images, textures, or design elements
- Assets are automatically saved to Supabase Storage (cloud)
- Accessible from any device
- Can be reused across multiple projects
- Assets are private per user (not shared between users)

### 4. **Workspace Editor**
The main editing interface where users:
- Upload room photos and furniture images
- Enter design prompts
- Generate AI visualizations
- View results in real-time
- Save creations to projects
- Uploaded files are automatically added to the asset library

### 5. **Project View**
When opening a project, users see:
- **Overview Tab**: Project details, recent creations, and quick access to assets
- **Assets Tab**: All private assets from the user's library
- **Creations Tab**: All AI-generated visualizations within that project
- Direct asset upload functionality
- Ability to start new creations from existing assets

---

## 🎨 User Interface & Design

### Design Philosophy
- **Modern & Minimalist**: Clean, stone-based color palette
- **Professional**: Tailored for designers and architects
- **Responsive**: Works on desktop, tablet, and mobile
- **Polished**: Smooth animations, hover effects, and transitions

### Key Pages

1. **Homepage** (`/`)
   - Hero section with value proposition
   - Social proof section
   - Features/benefits showcase
   - Call-to-action buttons

2. **Sign In/Sign Up** (`/sign-in`, `/sign-up`)
   - Custom-designed forms (not using Clerk's default components)
   - Social login: Google, Apple, Facebook
   - Email/password authentication
   - Email verification flow
   - Fully styled to match website design

3. **Dashboard** (`/dashboard`)
   - Main hub after login
   - Multiple views:
     - **Projects View**: Home dashboard with last 4 projects
     - **My Projects**: All projects in a grid
     - **Workspace**: AI editing interface
     - **Project View**: Individual project details
     - **Account**: User profile and settings

4. **Sidebar Navigation**
   - Home button
   - My Projects (with last 10 projects listed)
   - Account
   - Sign out

---

## 🗄️ Database Architecture (Supabase)

### Tables

1. **`spaces`**
   - User's top-level project containers
   - Fields: `id`, `user_id`, `name`, `deleted`, `deleted_at`, `created_at`, `updated_at`

2. **`projects`**
   - Individual design projects
   - Fields: `id`, `user_id`, `name`, `space_id`, `workflow` (JSONB), `deleted`, `deleted_at`, `created_at`, `updated_at`
   - `workflow` stores: room file, asset file, prompt, result URL

3. **`project_files`**
   - File metadata for projects
   - Fields: `id`, `project_id`, `user_id`, `name`, `url`, `type`, `created_at`

4. **`assets`**
   - User's private asset library
   - Fields: `id`, `user_id`, `name`, `url`, `type`, `description`, `created_at`

### Storage
- **Supabase Storage Bucket**: `ature-files`
- Stores all uploaded images (rooms, furniture, results)
- Files are organized by user ID
- Automatic cleanup of orphaned files

---

## 🔐 Authentication & Security

### Clerk Integration
- **Provider**: Clerk (handles all authentication)
- **Methods**: Email/password, Google OAuth, Apple OAuth, Facebook OAuth
- **Features**:
  - Email verification
  - Session management
  - User profile management
  - Secure token handling

### Security Measures
- Row Level Security (RLS) in Supabase
- API-level user validation (all operations check `user_id`)
- Private asset libraries (users only see their own assets)
- Secure file uploads with validation

---

## ☁️ Cloud Infrastructure

### Vercel (Hosting & Serverless)
- **Frontend**: React app deployed on Vercel
- **API Functions**: Serverless functions for:
  - Gemini AI integration
  - File uploads
  - Database operations
- **Environment Variables**: Secure key management

### Supabase (Database & Storage)
- **PostgreSQL Database**: Stores all project data
- **Storage**: Cloud file storage for images
- **API**: RESTful API for database operations
- **Real-time**: Potential for real-time updates (not currently used)

---

## 🛠️ Technology Stack

### Frontend
- **React 19**: Latest React with hooks
- **Vite 7**: Fast build tool and dev server
- **React Router DOM 7**: Client-side routing
- **Tailwind CSS 3**: Utility-first CSS framework
- **Custom Fonts**: Manrope (sans-serif), Cormorant Garamond (serif)

### Backend/API
- **Vercel Serverless Functions**: API endpoints
- **Google Gemini API**: AI image generation
- **Supabase**: Database and storage

### Authentication
- **Clerk**: Complete authentication solution

### Analytics
- **Vercel Analytics**: Track page views and performance

### 3D/AR (Future)
- **Model-viewer**: For 3D model viewing and AR (currently in codebase but not fully implemented)

---

## 📁 Project Structure

```
ature-app/
├── api/                          # Vercel serverless functions
│   ├── assets/                   # Asset management API
│   │   └── index.js
│   ├── files/                    # File upload API
│   │   └── upload.js
│   ├── nano-banana/             # Gemini AI integration
│   │   └── visualize.js
│   ├── projects/                 # Project CRUD operations
│   │   └── index.js
│   └── spaces/                   # Space CRUD operations
│       └── index.js
│
├── src/
│   ├── components/               # Reusable React components
│   │   ├── AccountView.jsx      # User account management
│   │   ├── Folder.jsx           # Project folder display
│   │   ├── Layout.jsx           # Page layout wrapper
│   │   ├── Navigation.jsx       # Top navigation bar
│   │   ├── ProjectView.jsx      # Individual project view
│   │   ├── ProtectedRoute.jsx   # Auth-protected routes
│   │   └── WorkspaceView.jsx    # AI editing workspace
│   │
│   ├── pages/                    # Page components
│   │   ├── AboutPage.jsx
│   │   ├── AccountPage.jsx
│   │   ├── BlogPage.jsx
│   │   ├── DashboardPage.jsx    # Main dashboard (most complex)
│   │   ├── HelpPage.jsx
│   │   ├── PricingPage.jsx
│   │   ├── SignInPage.jsx       # Custom sign-in form
│   │   └── SignUpPage.jsx       # Custom sign-up form
│   │
│   ├── utils/                    # Utility functions
│   │   ├── cloudProjectManager.js  # Supabase operations
│   │   └── projectManager.js       # Project management logic
│   │
│   ├── App.jsx                   # Main app component & routing
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
│
├── database-schema.sql           # Supabase database schema
├── storage-policies.sql          # Supabase storage policies
└── vercel.json                   # Vercel configuration
```

---

## 🔄 User Flow

### New User Journey
1. **Landing Page** → User sees homepage with value proposition
2. **Sign Up** → User creates account (email or social login)
3. **Email Verification** → User verifies email (if required)
4. **Dashboard** → User lands on dashboard with empty state
5. **Create Project** → User creates first project
6. **Workspace** → User uploads room + furniture, enters prompt
7. **AI Generation** → System generates visualization
8. **Save Creation** → User saves result to project
9. **Project View** → User can view all creations in project

### Returning User Journey
1. **Sign In** → User logs in
2. **Dashboard** → Sees last 4 projects on home
3. **Open Project** → Clicks on project to view details
4. **View Creations** → Sees all previous AI generations
5. **New Creation** → Starts new visualization from project view
6. **Asset Library** → Can use previously uploaded assets

---

## 🎯 Key Features

### 1. **Hybrid Storage System**
- **Local Storage**: Fast access, offline capability
- **Cloud Storage**: Sync across devices, backup
- **Automatic Sync**: Changes sync to cloud automatically

### 2. **Trash System**
- Deleted items go to trash
- 1-week auto-deletion
- Can restore items from trash
- Permanent deletion option

### 3. **Recent Projects**
- Sidebar shows last 10 opened projects
- Home shows last 4 projects
- "See all projects" link to full list

### 4. **Asset Management**
- Private asset library per user
- Cloud storage for all assets
- Auto-add uploaded files to library
- Direct upload from project view

### 5. **Project Organization**
- Spaces for grouping projects
- Projects contain multiple creations
- Easy navigation between levels

---

## 🚀 Deployment

### Production Environment
- **Hosting**: Vercel
- **Domain**: Custom domain configured
- **SSL**: Automatic via Vercel
- **CDN**: Global CDN for fast loading

### Environment Variables Required
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk authentication
- `VITE_SUPABASE_URL`: Supabase database URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: For server-side operations
- `GEMINI_API_KEY`: Google Gemini API key

---

## 🔮 Future Enhancements (Not Yet Implemented)

1. **3D Model Support**: Full 3D model viewing and AR
2. **Export Formats**: USDZ, GLB, OBJ, FBX export
3. **Collaboration**: Share projects with team members
4. **Templates**: Pre-made room templates
5. **AI Variations**: Generate multiple design variations
6. **Real-time Collaboration**: Multiple users editing simultaneously
7. **Version History**: Track changes to projects
8. **Advanced Filters**: Filter assets and creations
9. **Bulk Operations**: Select and manage multiple items
10. **Mobile App**: Native iOS/Android apps

---

## 📊 Current Status

### ✅ Completed
- User authentication (Clerk)
- Project management system
- AI furniture blending (Gemini)
- Cloud storage integration
- Private asset library
- Custom sign-in/sign-up forms
- Dashboard with multiple views
- Trash system with auto-cleanup
- Responsive design
- Error handling and loading states

### 🚧 In Progress / Needs Work
- Email verification flow (users not showing in dashboard until verified)
- Button styling issues (resolved with custom forms)
- Some edge cases in project deletion

### 📝 Documentation
- Multiple troubleshooting guides
- Setup instructions
- Database schema documentation
- API documentation (in code comments)

---

## 💡 Business Value

**For Interior Designers:**
- Quickly visualize furniture in client spaces
- Present multiple design options
- Organize projects by client or space
- Build a library of reusable assets

**For Architects:**
- Test furniture placement in floor plans
- Generate presentation materials
- Organize projects by building or phase

**For Furniture Manufacturers:**
- Showcase products in real environments
- Create marketing materials
- Demonstrate product versatility

---

## 🎓 Technical Highlights

1. **Custom Authentication UI**: Built from scratch using Clerk hooks (not pre-built components)
2. **Hybrid Storage**: Smart local + cloud sync system
3. **Serverless Architecture**: Scalable API functions on Vercel
4. **AI Integration**: Seamless Google Gemini API integration
5. **Modern React**: Using latest React 19 features
6. **Type Safety**: TypeScript-ready structure
7. **Performance**: Optimized with lazy loading and code splitting
8. **Security**: Multi-layer security (RLS, API validation, Clerk)

---

This is a **production-ready, professional-grade application** designed for real-world use by interior designers, architects, and furniture professionals. The codebase is well-organized, documented, and follows modern best practices.

