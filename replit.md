# Collaboration Portal

## Overview

This is a data integration and AI-powered workflow platform built with React, Express, and PostgreSQL. The application provides a comprehensive data management system with features for connecting various data sources (SAP, Salesforce, Oracle, etc.), mapping data fields, automating workflows, integrating AI models, and configuring BOI (Business Operations Intelligence) settings. The platform follows a step-by-step workflow design to guide users through the complete data integration process.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables and responsive design
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration for alias resolution

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with route-based organization
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Uploads**: Uppy integration for file handling with cloud storage support
- **Development**: Hot module replacement via Vite middleware integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon Database serverless connection
- **Schema Management**: Drizzle Kit for migrations and schema changes
- **File Storage**: Google Cloud Storage integration for model files and uploads
- **Data Models**: Comprehensive schema including users, data sources, mappings, workflows, AI models, and BOI configurations

### Authentication and Authorization
- **Session Management**: Cookie-based authentication with credential inclusion
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **API Security**: Request validation using Zod schemas

### External Dependencies

#### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **@google-cloud/storage**: Cloud file storage integration
- **@tanstack/react-query**: Server state management and caching

#### UI and Styling
- **@radix-ui/***: Comprehensive UI primitive components for accessibility
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant styling
- **lucide-react**: Icon library

#### File Handling
- **@uppy/core**: Core file upload functionality
- **@uppy/react**: React integration for file uploads
- **@uppy/aws-s3**: S3-compatible storage upload support

#### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and enhanced developer experience
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **esbuild**: Production build optimization

#### Validation and Forms
- **zod**: Runtime type validation and schema definition
- **@hookform/resolvers**: Form validation integration
- **react-hook-form**: Form state management (implied by resolvers)

The application implements a modular architecture with clear separation between frontend components, backend services, and data persistence layers. The step-based workflow design guides users through data source connection, field mapping, automation setup, AI model integration, and BOI configuration in a logical sequence.