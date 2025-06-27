# Overview

This is a full-stack client portal application for an IT services company called TechPro Solutions. It's built with a modern React frontend using Vite, an Express.js backend, and PostgreSQL database with Drizzle ORM. The application provides a landing page for marketing and a secured client portal for managing appointments, billing, and service requests.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state and caching
- **UI Framework**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized error middleware with proper HTTP status codes

## Database Architecture
- **Database**: PostgreSQL with multi-node clustering support
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Connection**: Connection pooling with primary/replica separation
- **Clustering**: Support for Patroni, pgEdge, and CloudNativePG deployments
- **Read/Write Separation**: Queries optimized for primary (writes) and replica (reads) nodes

# Key Components

## Authentication System
- Replit Auth integration for secure user authentication
- OpenID Connect protocol implementation
- Session-based authentication with PostgreSQL session store
- Automatic user profile creation and management

## Client Portal Features
- **Appointments**: Schedule, view, and manage service appointments
- **Billing**: Access invoices and payment history
- **Service Requests**: Submit and track IT service requests
- **Contact Forms**: Public contact form for lead generation

## Database Schema
- **Users**: Store user profiles from Replit Auth
- **Sessions**: Required for Replit Auth session management
- **Appointments**: Track scheduled services with status management
- **Service Requests**: Handle client IT service requests
- **Invoices**: Manage billing and payment tracking
- **Contact Submissions**: Store marketing inquiries

## UI/UX Design
- Responsive design optimized for mobile and desktop
- Modern gradient-based design with purple accent colors
- Comprehensive component library using Shadcn/UI
- Accessible form handling with proper validation feedback

# Data Flow

## Authentication Flow
1. User clicks login → redirected to Replit Auth
2. Successful auth → user profile stored/updated in database
3. Session created and stored in PostgreSQL
4. Frontend receives user data via `/api/auth/user`

## Client Portal Flow
1. Authenticated users access protected routes
2. TanStack Query manages API calls and caching
3. Form submissions validated with Zod schemas
4. Database operations performed through Drizzle ORM
5. Real-time UI updates through query invalidation

## Public Landing Page
1. Static marketing content with smooth scrolling
2. Contact form submissions stored in database
3. Service showcase and company information
4. Call-to-action buttons directing to client portal

# External Dependencies

## Core Framework Dependencies
- React ecosystem (React, React DOM, React Hook Form)
- Vite build system with TypeScript support
- Express.js with middleware for sessions and authentication

## UI and Styling
- Tailwind CSS for utility-first styling
- Radix UI primitives for accessible components
- Lucide React for consistent iconography
- Class Variance Authority for component variants

## Database and Authentication
- PostgreSQL with Neon serverless driver
- Drizzle ORM and Drizzle Kit
- Replit Auth with OpenID Connect
- Connect-pg-simple for session storage

## Development Tools
- TypeScript for type safety
- ESBuild for production bundling
- TSX for development server
- PostCSS with Autoprefixer

# Deployment Strategy

## Development Environment
- Replit development server on port 5000
- Hot module reloading with Vite
- Automatic database provisioning
- Real-time error overlays

## Production Build Process
1. Vite builds optimized frontend bundle
2. ESBuild bundles backend with external packages
3. Static assets served from Express
4. Environment variables for database and auth

## Replit-Specific Configuration
- PostgreSQL-16 module for database
- Node.js-20 runtime environment
- Autoscale deployment target
- Custom workflows for development

# Changelog

- June 26, 2025. Initial setup
- June 27, 2025. Added PostgreSQL multi-node clustering support with read/write separation

# User Preferences

Preferred communication style: Simple, everyday language.