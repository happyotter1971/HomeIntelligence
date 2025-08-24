# BuilderIntelligence

A modern web application for comparing new home inventory across builders in Indian Trail, NC.

## Features

- **Home Listings**: Browse available homes from Dream Finders Homes, KB Home, and Ryan Homes
- **Comparison Tool**: Side-by-side comparison of up to 3 homes
- **Advanced Filtering**: Filter by builder, community, price range, bedrooms, and more
- **Admin Panel**: Manage home inventory data (admin access required)
- **Authentication**: Secure login and registration with Firebase Auth
- **Responsive Design**: Modern, mobile-first interface

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **UI Components**: Custom components with shadcn/ui styling
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Database Setup

1. Register for a new account or sign in
2. Visit `/seed` to populate the database with sample data
3. Create an admin account by manually updating a user's role in Firestore to "admin"

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Main dashboard
│   ├── comparison/     # Home comparison
│   ├── admin/         # Admin panel
│   └── seed/          # Database seeding
├── components/         # Reusable components
│   └── ui/            # UI components
├── lib/               # Utilities and Firebase config
└── types/             # TypeScript type definitions
```

## Firebase Configuration

Your Firebase configuration is already set up in `src/lib/firebase.ts`. The app connects to:

- **Project ID**: homeintelligence-e2202
- **Authentication**: Email/password
- **Firestore**: Real-time database for homes, builders, communities, and users

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Data Models

### Builders
- Dream Finders Homes
- KB Home  
- Ryan Homes

### Communities
- Moore Farms (Dream Finders)
- Sheffield (KB Home)
- Moore Farm (Ryan Homes)

### Home Features
- Price and estimated monthly payment
- Bedrooms, bathrooms, square footage
- Status (available, quick-move-in, pending, sold)
- Features and amenities
- Homesite numbers and addresses

## Deployment

The app is configured for Vercel deployment with automatic builds from your Git repository.

## License

Private project - All rights reserved.