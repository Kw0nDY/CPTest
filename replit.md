# Collaboration Portal

## Overview

This is a data integration and AI-powered workflow platform built with React, Express, and PostgreSQL. The application provides a comprehensive data management system with features for connecting various data sources (SAP, Salesforce, Oracle, etc.), mapping data fields, automating workflows, integrating AI models, and configuring BOI (Business Operations Intelligence) settings. The platform follows a step-by-step workflow design to guide users through the complete data integration process.

The platform has been fully localized to English while maintaining Korean communication capabilities. All user interface elements, form labels, error messages, toast notifications, and component text are now displayed in English for a consistent enterprise experience.

**Final Navigation Structure (January 2025):**

**Settings Section:**
- Data Integration (with sub-items: Data Integration, View Setting, Automation)
- AI Fac (with sub-items: Upload Models, Model Configuration)  
- BOI (with sub-items: Overview, Input Setting, AI Insights, Reports)

**AI Model Management Features (Updated January 2025):**
- Complete YAML/JSON config file lifecycle management system
- Automatic config file generation during model upload (both automatic and manual modes)
- Config file download functionality with proper YAML formatting
- Config file upload and parsing with validation
- Model-specific config file storage and retrieval
- Integration with model analysis workflow for streamlined configuration
- Support for updating existing config files and creating new ones

**View Setting Features:**
- Dynamic UI creation system for building custom dashboard views
- Data source integration from connected systems (AVEVA PI, SAP ERP, Oracle, Salesforce)
- Drag-and-drop component editor with charts, tables, metrics, and visualization elements
- Assignment management system for users and departments
- Full-screen editor interface with three main tabs:
  * Design Tab: Visual component layout editor with drag-and-drop canvas
  * Data Tab: Data source selection and field mapping interface
  * Preview Tab: Live preview of the configured dashboard

**View Editor Capabilities:**
- Grid-based layout system with 12-column responsive design
- Advanced component configuration with styling options (colors, fonts, spacing)
- Real-time data field preview with sample values from connected sources
- Component visibility controls and duplication features
- Chart type selection (bar, line, pie, area, doughnut, scatter)
- Refresh rate configuration and animation settings
- Comprehensive properties panel for detailed customization

**Management Section:**
- Member (Member Management)
- APIs (API Management)

**Main Menu Section:**
- All Views
- Dynamic view names from assignments (e.g., "Drilling Operations Monitor", "Production Performance Dashboard", "Equipment Maintenance Events")

**Enhanced Design Features:**
- Beautiful blue gradient header with "CP" logo and "Collaboration Portal" branding
- Elegant sidebar with gradient background and improved hover effects
- Three-tier navigation structure with clear section separations
- User dropdown with role switching functionality for testing different perspectives

## User Preferences

Preferred communication style: Korean language communication requested. Always respond in Korean while maintaining English for all service content and UI elements.

**Google API Integration Requirements:**
- 4-step Google Sheets connection process implemented (API Selection → Authentication → Sheet Selection → Review)
- User-configurable Google API management system with database storage
- Comprehensive setup guide and help system for API configuration
- Step-by-step instructions for Google Cloud Console setup
- Support for both Drive API and Sheets API with separate configurations
- API validation and testing functionality

**Excel Integration Requirements:**
- Direct file upload approach preferred over OAuth 2.0 authentication
- System must read actual Excel file content, not generate mock data based on filenames
- Worksheet names, column names, data types, and sample data must match real file content exactly
- Critical requirement: View Data functionality must display authentic Excel data, not simulated content

**AI Model Config File Management Requirements:**
- Complete YAML/JSON config file system with js-yaml dependency integration
- Automatic config file generation post-upload with structured format matching provided specifications
- Model-specific config file storage with proper file path management
- Config file validation system to ensure structural integrity
- Download functionality providing properly formatted YAML files
- Upload and parsing system supporting both YAML and JSON formats
- Config file lifecycle management including updates and modifications

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