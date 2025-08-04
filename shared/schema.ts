import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const dataSources = pgTable("data_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'salesforce', 'sap', 'oracle', 'mysql', 'csv'
  endpoint: text("endpoint"),
  authMethod: text("auth_method"), // 'oauth2', 'api_token', 'basic_auth'
  credentials: jsonb("credentials"), // Store encrypted credentials
  status: text("status").notNull().default("disconnected"), // 'connected', 'disconnected', 'error'
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const dataMappings = pgTable("data_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataSourceId: varchar("data_source_id").notNull().references(() => dataSources.id),
  sourceField: text("source_field").notNull(),
  targetField: text("target_field").notNull(),
  dataType: text("data_type").notNull(),
  transformationRules: jsonb("transformation_rules"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config").notNull(), // Store workflow nodes and connections
  schedule: text("schedule"), // cron expression
  isActive: boolean("is_active").default(false),
  lastRun: timestamp("last_run"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const aiModels = pgTable("ai_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'classification', 'regression', 'clustering', 'nlp', 'computer_vision'
  description: text("description"),
  filePath: text("file_path"), // Path to uploaded model file
  inputSchema: jsonb("input_schema").notNull(),
  outputSchema: jsonb("output_schema").notNull(),
  performanceMetrics: jsonb("performance_metrics"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const boiConfigurations = pgTable("boi_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  aiModelId: varchar("ai_model_id").notNull().references(() => aiModels.id),
  dataSourceId: varchar("data_source_id").notNull().references(() => dataSources.id),
  inputMappings: jsonb("input_mappings").notNull(), // Maps data fields to model inputs
  outputSettings: jsonb("output_settings").notNull(),
  transformationRules: jsonb("transformation_rules"),
  batchSize: integer("batch_size").default(100),
  processingInterval: text("processing_interval").default("realtime"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  createdAt: true,
  lastSync: true,
});

export const insertDataMappingSchema = createInsertSchema(dataMappings).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  lastRun: true,
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
  createdAt: true,
});

export const insertBoiConfigurationSchema = createInsertSchema(boiConfigurations).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;

export type DataMapping = typeof dataMappings.$inferSelect;
export type InsertDataMapping = z.infer<typeof insertDataMappingSchema>;

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;

export type BoiConfiguration = typeof boiConfigurations.$inferSelect;
export type InsertBoiConfiguration = z.infer<typeof insertBoiConfigurationSchema>;
