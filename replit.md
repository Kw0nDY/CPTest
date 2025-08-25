# DXT Enterprise AI Fabric

## Overview

This is a comprehensive enterprise AI integration platform evolved from a data integration workflow system to a full-scale 9-module professional AI fabric. Built with React, Express, and PostgreSQL, the platform provides enterprise-grade data management, AI model development, intelligent automation, and business intelligence capabilities. The platform follows JSON-DAG based workflows and maintains security-first principles with RBAC/ABAC, audit trails, and compliance features.

The platform has been fully restructured from a simple 3-section interface to a professional 9-module enterprise system while preserving all existing workflow editor functionality and AI model management capabilities.

**Enterprise Navigation Structure (January 2025 - 9 Core Modules):**

**1. Data Pipeline** - JSON-DAG Pipeline Definition & Execution
- Data Sources (existing Data Integration functionality preserved)
- Pipeline Builder (visual node palette/canvas/properties editor)
- Pipeline Runs (execution history with SSE streaming logs)

**2. Data Quality & Security** - Independent Enterprise Module
- Quality Rules (NULL/RANGE/REF validation with alerts)
- Data Profiling (automated PII detection and statistical analysis)
- PII Policies (existing security features: show|mask|deny column policies)

**3. Real-time Monitoring** - Independent System Health Module  
- System Health (p95 latency and error rate monitoring)
- Connector Status (real-time connector health with offline alerts)
- Alert Management (webhook integration for Slack, Teams, etc.)

**4. View & Dashboard** - Team-Centric Interface System
- Dashboard Builder (existing View Setting functionality preserved)
- Team Workspaces (collaborative workspace management)
- Performance Analytics (view usage and optimization insights)

**5. Automation Engine** - Intelligent Business Process Automation
- Workflow Designer (existing Automation functionality preserved)
- Process Automation (approval workflows for high-risk actions)
- Trigger Management (CRON scheduling and event-driven triggers)

**6. AI Laboratory** - Model Development & Research Platform
- Model Development (Study Studio with TTL datasets and lineage)
- Model Upload (existing functionality preserved)
- Model Configuration (existing AI Graph Builder preserved)
- Testing & Validation (regression testing and deployment gates)

**7. Intelligence Hub** - AI Results Deep Analysis Center
- AI Results Analysis (implemented with comprehensive metrics)
- Performance Insights (AI drift detection and KPI tracking)
- Prediction Analytics (forecasting templates and analytics)

**8. Business Intelligence** - Strategic Organization Analytics
- Strategic Overview (existing BOI functionality preserved)
- Organization Analytics (KPI tracking with provenance)
- AI Recommendations (impact/effort scoring recommendations)

**9. Assistant** - LLM-Powered Integrated Assistant
- AI Chat Interface (tool registry with approval workflows)
- Knowledge Base (vector search with document indexing)
- Task Automation (natural language task execution)

**Preserved Legacy Features:**
- Complete YAML/JSON AI model config file lifecycle management
- Workflow editor UX with drag-and-drop canvas and node palette
- View editor with grid-based layout and component configuration
- All existing AI model upload, configuration, and execution functionality
- Data source integrations (Google Sheets, Excel, SAP, Oracle, Salesforce)
- User role switching and permission management

**Enhanced Enterprise Features:**
- Audit trails for all read/write operations
- Feature flags (FF_*) for controlled module rollouts
- Performance SLO monitoring (read p95 < 300ms, write p95 < 1s)
- OpenTelemetry traceId integration
- KMS-based secret management
- RLS/CLS row-level and column-level security

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

**AI Model Folder Management System (January 2025):**
- Complete folder-based organization system for AI models with hierarchical database structure
- Custom folder creation with name, description, color, and icon customization
- Folder-specific model organization and management capabilities
- Enhanced model upload with folder selection dropdown functionality
- Tree-view folder display with expandable/collapsible folder contents
- Comprehensive folder CRUD operations (Create, Read, Update, Delete)
- Search functionality across folders and models for efficient organization
- Unorganized models handling for models without folder assignment
- Database schema includes ai_model_folders table and folderId field in ai_models table

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