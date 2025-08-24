# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build for production (includes TypeScript checking and linting)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking (via `npm run build`)

## Architecture Overview

This is a Next.js 14 web application for comparing new home inventory across builders in Indian Trail, NC. It uses Firebase for authentication and data storage.

### Core Data Model

The application centers around a relational data structure:

- **Builders**: Home construction companies (Dream Finders, KB Home, Ryan Homes)
- **Communities**: Geographic developments managed by builders
- **Homes**: Individual properties with detailed specifications
- **Users**: Account holders with role-based access (admin/user)

Key relationships: `Builder` → `Community` → `Home` (with proper foreign keys via `builderId` and `communityId`)

### Firebase Integration

- **Authentication**: Email/password via Firebase Auth
- **Database**: Firestore with collections for `builders`, `communities`, `homes`, `users`
- **Configuration**: Pre-configured Firebase project `homeintelligence-e2202`

All database functions in `src/lib/firestore.ts` return `undefined` for missing records (not `null`) to match TypeScript optional field types.

### Web Scraping System

The application includes an automated web scraping system that refreshes home data:

- **Manual Trigger**: POST to `/api/scrape` to manually refresh data
- **Automated**: Daily cron job at 2 AM UTC via `/api/cron/daily-scrape`
- **Implementation**: `src/lib/scrape-and-update.ts` contains the scraping logic
- **Target**: Builder websites for Dream Finders, KB Home, and Ryan Homes

### Data Population

Visit `/seed` after user registration to populate database with sample data using `src/lib/sample-data.ts`. This creates 3 builders, 3 communities, and 12 sample homes.

### Key Application Pages

- `/` - Landing page with authentication
- `/dashboard` - Main home browsing with filtering and search
- `/comparison` - Side-by-side comparison (up to 3 homes) 
- `/admin` - Inventory management (requires admin role)
- `/auth/login` and `/auth/register` - Authentication

### Admin Access Setup

1. Register a regular user account
2. In Firebase Console → Firestore → `users` collection
3. Change the user's `role` field from `"user"` to `"admin"`

### TypeScript Types

Core interfaces are defined in `src/types/index.ts`:
- Use `Timestamp` from Firebase (not `Date`) for temporal fields
- Optional fields use `undefined` (not `null`)
- `HomeWithRelations` extends `Home` with populated `builder` and `community` objects

### UI Architecture

- **Styling**: Tailwind CSS with custom design system using CSS variables
- **Components**: Custom components in `src/components/ui/` following shadcn/ui patterns
- **Icons**: Lucide React icons throughout
- **Images**: Firebase Storage integration configured for `firebasestorage.googleapis.com`
- **Responsive**: Mobile-first design approach
- **Import Aliases**: Use `@/*` for imports from `src/` (configured in tsconfig.json)

### State Management Patterns

- React hooks for local state
- Firebase real-time listeners for auth state
- useCallback for expensive filter operations to prevent unnecessary re-renders
- Suspense boundaries required for `useSearchParams()` usage

### Data Fetching Strategy

The `getHomes()` function in firestore.ts automatically joins related builder and community data, returning `HomeWithRelations[]` objects. This eliminates the need for separate API calls in components.

### Deployment Considerations

- Deployed on Vercel with automatic GitHub integration
- `vercel.json` configured for Next.js optimization with daily cron jobs
- All environment variables are embedded in the client bundle (Firebase config)
- Static generation enabled for most pages except `/comparison` which uses search params
- Automated daily scraping via Vercel cron jobs at 2 AM UTC

### API Routes

- `/api/scrape` - Manual trigger for web scraping (POST)
- `/api/cron/daily-scrape` - Automated daily scraping endpoint