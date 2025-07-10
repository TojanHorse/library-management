# Vidhyadham Seat Management System

## Overview

This is a comprehensive seat management system built for educational institutions. The application allows administrators to manage user registrations, track seat availability, monitor fee payments, and handle system settings. It's built with a modern React frontend and Express backend using TypeScript.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Context API with useReducer for global state
- **Data Fetching**: TanStack Query for server state management

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: PostgreSQL sessions with connect-pg-simple
- **Build System**: ESBuild for server bundling

### Development Setup
- **Hot Reload**: Vite dev server with middleware mode
- **Type Checking**: TypeScript with strict mode enabled
- **Path Aliases**: Configured for clean imports (@, @shared, @assets)

## Key Components

### Database Schema
- **Users Table**: Stores user information including personal details, seat assignments, and fee status
- **Session Management**: PostgreSQL-backed sessions for authentication
- **Drizzle ORM**: Type-safe database operations with schema validation

### Authentication System
- **Admin Authentication**: Simple username/password system
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Protected Routes**: Context-based authentication state management

### Seat Management
- **Dynamic Seat Grid**: Visual representation of seat availability
- **Status Tracking**: Available, paid, due, expired seat states
- **Real-time Updates**: Live seat status updates across the application

### User Management
- **Registration System**: Multi-step user registration with document upload
- **Fee Tracking**: Payment status monitoring with due date management
- **Activity Logs**: Comprehensive audit trail for all user actions

### Settings Management
- **Slot Pricing**: Configurable pricing for different time slots
- **Email Configuration**: Gmail integration for notifications
- **Telegram Integration**: Multi-chat notification system

## Data Flow

### User Registration Flow
1. User fills registration form with personal details
2. System validates seat availability
3. User selects time slot and uploads ID documents
4. Registration is saved with initial "due" fee status
5. Seat is marked as occupied
6. Activity log is created

### Payment Processing Flow
1. Admin reviews user payment status
2. Fee status is updated (paid/due/expired)
3. Seat status is synchronized
4. Activity log is updated with admin action
5. Notifications are sent (email/telegram)

### Seat Management Flow
1. Admin can add/remove seats dynamically
2. Seat status is calculated based on user fee status
3. Visual grid updates in real-time
4. Seat availability affects registration options

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Built-in connection management

### UI Components
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: ESBuild bundles server code to `dist/index.js`
3. **Database Migration**: Drizzle handles schema migrations
4. **Environment Variables**: DATABASE_URL required for PostgreSQL connection

### Production Setup
- **Server**: Node.js with ESM modules
- **Database**: Neon PostgreSQL with environment-based connection
- **Static Assets**: Served from `dist/public` directory
- **API Routes**: Express server handles `/api/*` routes

### Development Workflow
- **Local Development**: `npm run dev` starts both frontend and backend
- **Database**: `npm run db:push` applies schema changes
- **Type Checking**: `npm run check` validates TypeScript

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment mode (development/production)
- **Session Configuration**: Automatic setup with connect-pg-simple

The application uses a monorepo structure with shared TypeScript types and schemas, enabling type safety across the full stack while maintaining clear separation of concerns between frontend and backend code.