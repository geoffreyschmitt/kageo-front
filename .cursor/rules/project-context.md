# Project Context

## 📋 Overview

Kageo is a wishlist management platform that allows users to create, manage, and share personalized wishlists. The application supports collaboration features (suggestions, reservations, purchase tracking) and user authentication.

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.4.7** with App Router and Turbopack
- **React 19.0.0**
- **TypeScript 5** in strict mode
- **CSS Modules** exclusively for styling

### Authentication & Backend
- **NextAuth 4.24.11** for authentication
- **Vercel KV** for data storage
- **bcryptjs** for password hashing

### UI & Utilities
- **uuid** for ID generation

## 📝 Important Notes

- The project uses **strict TypeScript** but with `noImplicitAny: false` temporarily (TODO to remove)
- Next.js components in `app/` are Server Components by default
- Add `'use client'` only if necessary (hooks, events, etc.)
- Mocks are used for development - provide a `useMock` flag
- Authentication uses NextAuth with Google OAuth and credentials support

