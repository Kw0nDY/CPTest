import { pgTable, text, integer, timestamp, json } from "drizzle-orm/pg-core";
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
  type: 'chart' | 'table' | 'metric' | 'text' | 'image' | 'map' | 'gauge' | 'timeline';
  gridPosition: number;
  visible: boolean;
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
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type View = typeof views.$inferSelect;
export type InsertView = z.infer<typeof insertViewSchema>;