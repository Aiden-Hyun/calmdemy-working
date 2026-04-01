# CalmNest - Meditation & Mindfulness App

A React Native app built with Expo for meditation, breathing exercises, and sleep stories.

## Tech Stack

- **Expo SDK 55** with React Native 0.74
- **Expo Router v3** for navigation
- **TypeScript** (strict mode)
- **Supabase** for authentication and database
- **React Native StyleSheet** for styling

## Development Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase project URL and anon key.

3. Start the development server:
   ```bash
   pnpm expo start
   ```

4. Run tests:
   ```bash
   pnpm test
   ```

### Firestore indexes

All composite indexes live in [`firestore.indexes.json`](./firestore.indexes.json). After editing that file, deploy the indexes to Firebase:

```bash
firebase login          # first time only
firebase deploy --only firestore:indexes
```

Alternatively, copy the field definitions into the Firestore Console → Database → Indexes UI.

### Firebase Storage Setup (Audio Files)

The app uses Firebase Storage for meditation audio files. To upload the audio:

1. **Authenticate Firebase CLI:**
   ```bash
   firebase login --reauth
   ```

2. **Generate a service account key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in the project root (this file is git-ignored)

3. **Upload audio files:**
   ```bash
   node scripts/uploadAudioToStorage.js
   ```

4. **Or use Google Cloud Console:**
   - Go to [Google Cloud Storage](https://console.cloud.google.com/storage)
   - Navigate to bucket: `calmnest-e910e.firebasestorage.app`
   - Create folder: `audio/`
   - Upload files from `assets/audio/` maintaining the folder structure

Audio files are organized as:
```
audio/
  meditation/   # Guided meditation content
  sleep/        # Sleep story ambient sounds
  breathing/    # Breathing exercise backgrounds
```

## Features

- **Authentication**: Email/password signup and login
- **Meditation Sessions**: Track your meditation practice
- **Breathing Exercises**: Guided breathing techniques
- **Sleep Stories**: Relaxing audio content for better sleep
- **Progress Tracking**: Monitor your meditation streak and total minutes

## Project Structure

```
/app
  - _layout.tsx      # Root layout with auth provider
  - index.tsx        # Entry point with auth routing
  - home.tsx         # Main dashboard
  - login.tsx        # Authentication screen
  - settings.tsx     # User settings

/src
  - components/      # Reusable UI components
  - contexts/        # React contexts (AuthContext)
  - hooks/          # Custom React hooks
  - utils/          # Utility functions
  - supabase.ts     # Supabase client configuration

/supabase
  - schema.sql      # Database schema
```

## Database Schema

- **users**: User profiles and meditation stats
- **meditation_sessions**: Individual meditation session records
- **meditation_programs**: Structured meditation programs
- **user_program_progress**: User progress through programs
