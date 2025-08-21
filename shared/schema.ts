import { pgTable, text, integer, timestamp, json, varchar, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  username: text("username").unique().notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const views = pgTable("views", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  assignedTo: json("assigned_to").$type<string[]>().default([]),
  assignedDepartments: json("assigned_departments").$type<string[]>().default([]),
  dataSources: json("data_sources").$type<string[]>().default([]),
  layout: json("layout").$type<{
    grids: GridRow[];
    components?: UIComponent[];
  }>().default({ grids: [] }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

// Type definitions for layout structure
export interface UIComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image' | 'map' | 'gauge' | 'timeline' | 'ai-result' | 'kpi-optimization';
  gridPosition: number;
  order?: number;
  visible?: boolean;
  config: {
    title?: string;
    dataSource?: string;
    selectedTable?: string;
    selectedFields?: string[];
    chartType?: 'bar' | 'line' | 'pie' | 'area' | 'doughnut' | 'scatter';
    metrics?: string[];
    dimensions?: string[];
    filters?: any[];
    styling?: any;
    refreshRate?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    animation?: boolean;
    // AI Model Result specific config
    aiModelResultId?: string;
    configurationId?: string;
    configurationName?: string;
    displayType?: 'summary' | 'detailed' | 'chart' | 'table';
    kpiOptimization?: {
      showRecommendations?: boolean;
      showConfidenceScore?: boolean;
      highlightChanges?: boolean;
    };
  };
}

export interface GridRow {
  id: string;
  columns: number;
  components: UIComponent[];
}

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertViewSchema = createInsertSchema(views);

// Types
// Data Sources table for integration
export const dataSources = pgTable('data_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  vendor: text('vendor'),
  status: text('status').notNull().default('disconnected'),
  config: json('config').$type<{
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    connectionString?: string;
    apiEndpoint?: string;
    authentication?: any;
    // Google Sheets specific
    spreadsheetId?: string;
    range?: string;
    worksheets?: string[];
    googleApiConfigId?: string;
    // Excel specific
    files?: Array<{
      name: string;
      url: string;
      worksheets: string[];
    }>;
    sampleData?: Record<string, any[]>;
    dataSchema?: Array<{
      table: string;
      fields: Array<{
        name: string;
        type: string;
        description: string;
      }>;
      recordCount?: number;
    }>;
    // AI Result specific
    modelName?: string;
    executedAt?: string;
    resultData?: any;
  }>().notNull(),
  connectionDetails: json('connection_details'),
  credentials: json('credentials').$type<{
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    expiresAt?: string;
    scope?: string;
    tokenType?: string;
  }>(),
  lastSync: timestamp('last_sync'),
  recordCount: integer('record_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Excel Files table for storing uploaded files and their data
export const excelFiles = pgTable('excel_files', {
  id: text('id').primaryKey(),
  dataSourceId: text('data_source_id').references(() => dataSources.id).notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  status: text('status').notNull().default('processing'), // processing, completed, error
  sheets: json('sheets').$type<Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    hasHeaders: boolean;
  }>>().default([]),
  metadata: json('metadata').$type<{
    author?: string;
    lastModified?: string;
    fileFormat?: string;
  }>()
});

// Data Tables (schema information for each data source)
export const dataTables = pgTable('data_tables', {
  id: text('id').primaryKey(),
  dataSourceId: text('data_source_id').references(() => dataSources.id).notNull(),
  tableName: text('table_name').notNull(),
  fields: json('fields').$type<Array<{
    name: string;
    type: string;
    description: string;
  }>>().notNull(),
  recordCount: integer('record_count').default(0),
  lastUpdated: timestamp('last_updated').defaultNow()
});

// Sample data for SAP ERP
export const sapCustomers = pgTable('sap_customers', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  country: text('country'),
  creditLimit: integer('credit_limit'),
  createdDate: text('created_date'),
  lastUpdate: timestamp('last_update').defaultNow()
});

export const sapOrders = pgTable('sap_orders', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  customerId: text('customer_id').notNull(),
  orderDate: text('order_date'),
  totalAmount: integer('total_amount'),
  status: text('status'),
  lastUpdate: timestamp('last_update').defaultNow()
});

// Sample data for Salesforce CRM
export const salesforceAccounts = pgTable('salesforce_accounts', {
  id: text('id').primaryKey(),
  sfId: text('sf_id').notNull(),
  name: text('name').notNull(),
  industry: text('industry'),
  annualRevenue: integer('annual_revenue'),
  numberOfEmployees: integer('number_of_employees'),
  lastUpdate: timestamp('last_update').defaultNow()
});

export const salesforceOpportunities = pgTable('salesforce_opportunities', {
  id: text('id').primaryKey(),
  sfId: text('sf_id').notNull(),
  name: text('name').notNull(),
  accountId: text('account_id'),
  amount: integer('amount'),
  stageName: text('stage_name'),
  closeDate: text('close_date'),
  lastUpdate: timestamp('last_update').defaultNow()
});

// Sample data for AVEVA PI System
export const piAssetHierarchy = pgTable('pi_asset_hierarchy', {
  id: text('id').primaryKey(),
  assetName: text('asset_name').notNull(),
  assetPath: text('asset_path').notNull(),
  assetType: text('asset_type'),
  location: text('location'),
  operationalStatus: text('operational_status'),
  lastUpdate: timestamp('last_update').defaultNow()
});

export const piDrillingOperations = pgTable('pi_drilling_operations', {
  id: text('id').primaryKey(),
  wellPadId: text('well_pad_id').notNull(),
  bitWeight: integer('bit_weight'),
  blockHeight: integer('block_height'),
  diffPress: integer('diff_press'),
  flowInRate: integer('flow_in_rate'),
  holeDepth: integer('hole_depth'),
  hookLoad: integer('hook_load'),
  pumpPressure: integer('pump_pressure'),
  topDriveRpm: integer('top_drive_rpm'),
  topDriveTorque: integer('top_drive_torque'),
  timestamp: timestamp('timestamp').defaultNow()
});

// Google API Configurations
export const googleApiConfigs = pgTable('google_api_configs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'drive' | 'sheets'
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  projectId: text('project_id'),
  apiKey: text('api_key'),
  scopes: json('scopes').$type<string[]>().default([]),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// AI Models table for uploaded model files
export const aiModels = pgTable('ai_models', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  modelType: text('model_type').notNull(), // 'pytorch', 'tensorflow', 'onnx', etc.
  status: text('status').notNull().default('uploading'), // 'uploading', 'processing', 'completed', 'error'
  filePath: text('file_path'), // Path to uploaded file in storage
  configFilePath: text('config_file_path'), // Path to YAML/JSON config file
  analysisStatus: text('analysis_status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'error'
  inputSpecs: json('input_specs').$type<Array<{
    name: string;
    type: string;
    shape?: number[];
    description?: string;
    dtype?: string;
  }>>().default([]),
  outputSpecs: json('output_specs').$type<Array<{
    name: string;
    type: string;
    shape?: number[];
    description?: string;
    dtype?: string;
  }>>().default([]),
  metadata: json('metadata').$type<{
    framework?: string;
    version?: string;
    modelSize?: string;
    parameters?: number;
    layers?: number;
    architecture?: string;
    description?: string;
  }>(),
  configuration: json('configuration').$type<{
    preprocessing?: any;
    postprocessing?: any;
    hyperparameters?: any;
    training_info?: any;
    // Extended configuration for YAML/JSON config files
    framework?: string;
    artifactUri?: string;
    runtime?: string;
    entrypoint?: string;
    resources?: {
      gpu?: number;
      cpu?: string;
      memory?: string;
    };
    preprocess?: Array<{
      type: 'sql_query' | 'normalize' | 'denormalize' | 'transform';
      connection?: string;
      sql?: string;
      params?: Record<string, any>;
    }>;
    postprocess?: Array<{
      type: 'sql_query' | 'normalize' | 'denormalize' | 'transform';
      connection?: string;
      sql?: string;
      params?: Record<string, any>;
    }>;
    connectors?: Array<{
      name: string;
      kind: 'postgres' | 'redis' | 'mysql' | 'mongodb' | 's3';
      dsn?: string;
      uri?: string;
      config?: Record<string, any>;
    }>;
  }>(),
  folderId: text('folder_id'), // Reference to model folder
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  analyzedAt: timestamp('analyzed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// AI Model Files - stores all files associated with each model
export const aiModelFiles = pgTable('ai_model_files', {
  id: text('id').primaryKey(),
  modelId: text('model_id').references(() => aiModels.id).notNull(),
  fileName: text('file_name').notNull(),
  originalFileName: text('original_file_name').notNull(), // Original name from user upload
  filePath: text('file_path').notNull(),
  fileType: text('file_type').notNull(), // 'model', 'config', 'scaler', 'other'
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

// AI Model Folders for organization (Upload Models tab)
export const aiModelFolders = pgTable('ai_model_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  color: text('color').default('#3B82F6'), // Default blue color
  icon: text('icon').default('FolderOpen'), // Icon name for display
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Model Configuration Folders (Model Configuration tab)
export const modelConfigurationFolders = pgTable('model_configuration_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  color: text('color').default('#3B82F6'), // Default blue color
  icon: text('icon').default('FolderOpen'), // Icon name for display
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Model Configuration for AI Fac settings (node-based workflow)
export const modelConfigurations = pgTable('model_configurations', {
  id: text('id').primaryKey(),
  folderId: text('folder_id').references(() => modelConfigurationFolders.id), // Reference to configuration folder
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // 'draft', 'active', 'testing', 'error'
  // Node-based workflow data
  nodes: json('nodes').$type<Array<{
    id: string;
    type: 'data-integration' | 'ai-model' | 'final-goal';
    position: { x: number; y: number };
    data: any;
  }>>().default([]),
  connections: json('connections').$type<Array<{
    id: string;
    type: 'parameter' | 'block';
    fromNodeId: string;
    toNodeId: string;
    fromOutputId?: string;
    toInputId?: string;
    mappings?: Array<{
      sourceField: string;
      targetField: string;
      transformation?: string;
    }>;
  }>>().default([]),
  // Legacy fields for backward compatibility
  modelId: text('model_id').references(() => aiModels.id), // Optional for single-model configs
  isActive: integer('is_active').notNull().default(0), // 0 = false, 1 = true
  inputMappings: json('input_mappings').$type<Array<{
    modelInput: string;
    dataSource?: string;
    fieldMapping?: string;
    defaultValue?: any;
    transformation?: string;
  }>>().default([]),
  outputMappings: json('output_mappings').$type<Array<{
    modelOutput: string;
    outputName: string;
    description?: string;
    postProcessing?: string;
  }>>().default([]),
  settings: json('settings').$type<{
    batchSize?: number;
    confidenceThreshold?: number;
    maxInferenceTime?: number;
    useGpu?: boolean;
    scalingFactor?: number;
  }>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// AI Model Execution Results for View Integration
export const aiModelResults = pgTable('ai_model_results', {
  id: text('id').primaryKey(),
  configurationId: text('configuration_id').references(() => modelConfigurations.id),
  configurationName: text('configuration_name'), // Store configuration name for easy reference
  modelId: text('model_id').references(() => aiModels.id).notNull(),
  executionType: text('execution_type').notNull(), // 'test', 'kpi_optimization', 'prediction'
  inputData: json('input_data').$type<Record<string, any>>(), // Input data used for execution
  results: json('results').$type<{
    predictions?: any[];
    kpiOptimization?: {
      kpiName: string;
      currentValue?: number;
      targetValue?: number;
      optimizedParameters?: Record<string, number>;
      confidenceScore?: number;
      recommendations?: Array<{
        parameter: string;
        currentValue: number;
        suggestedValue: number;
        impact: string;
        confidence: number;
      }>;
    };
    analysis?: any;
    executionTime?: number;
    errors?: string[];
  }>().notNull(),
  status: text('status').notNull().default('completed'), // 'running', 'completed', 'error'
  executionTime: integer('execution_time'), // Milliseconds
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Insert schemas
export const insertDataSourceSchema = createInsertSchema(dataSources);
export const insertDataTableSchema = createInsertSchema(dataTables);
export const insertExcelFileSchema = createInsertSchema(excelFiles);
export const insertSapCustomerSchema = createInsertSchema(sapCustomers);
export const insertSapOrderSchema = createInsertSchema(sapOrders);
export const insertSalesforceAccountSchema = createInsertSchema(salesforceAccounts);
export const insertSalesforceOpportunitySchema = createInsertSchema(salesforceOpportunities);
export const insertPiAssetHierarchySchema = createInsertSchema(piAssetHierarchy);
export const insertPiDrillingOperationsSchema = createInsertSchema(piDrillingOperations);
export const insertGoogleApiConfigSchema = createInsertSchema(googleApiConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  analyzedAt: true
});
export const insertAiModelFileSchema = createInsertSchema(aiModelFiles).omit({
  id: true,
  createdAt: true
});
export const insertModelConfigurationSchema = createInsertSchema(modelConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertAiModelResultSchema = createInsertSchema(aiModelResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertAiModelFolderSchema = createInsertSchema(aiModelFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertModelConfigurationFolderSchema = createInsertSchema(modelConfigurationFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type View = typeof views.$inferSelect;
export type InsertView = z.infer<typeof insertViewSchema>;
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataTable = typeof dataTables.$inferSelect;
export type InsertDataTable = z.infer<typeof insertDataTableSchema>;
export type ExcelFile = typeof excelFiles.$inferSelect;
export type InsertExcelFile = z.infer<typeof insertExcelFileSchema>;
export type GoogleApiConfig = typeof googleApiConfigs.$inferSelect;
export type InsertGoogleApiConfig = z.infer<typeof insertGoogleApiConfigSchema>;
export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModelFile = typeof aiModelFiles.$inferSelect;
export type InsertAiModelFile = z.infer<typeof insertAiModelFileSchema>;
export type ModelConfiguration = typeof modelConfigurations.$inferSelect;
export type InsertModelConfiguration = z.infer<typeof insertModelConfigurationSchema>;
export type AiModelResult = typeof aiModelResults.$inferSelect;
export type InsertAiModelResult = z.infer<typeof insertAiModelResultSchema>;
export type AiModelFolder = typeof aiModelFolders.$inferSelect;
export type InsertAiModelFolder = z.infer<typeof insertAiModelFolderSchema>;
export type ModelConfigurationFolder = typeof modelConfigurationFolders.$inferSelect;
export type InsertModelConfigurationFolder = z.infer<typeof insertModelConfigurationFolderSchema>;