CREATE TABLE "ai_model_files" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_model_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"color" text DEFAULT '#3B82F6',
	"icon" text DEFAULT 'FolderOpen',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_model_results" (
	"id" text PRIMARY KEY NOT NULL,
	"configuration_id" text,
	"configuration_name" text,
	"model_id" text NOT NULL,
	"execution_type" text NOT NULL,
	"input_data" json,
	"results" json NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"execution_time" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"model_type" text NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"file_path" text,
	"config_file_path" text,
	"analysis_status" text DEFAULT 'pending' NOT NULL,
	"input_specs" json DEFAULT '[]'::json,
	"output_specs" json DEFAULT '[]'::json,
	"metadata" json,
	"configuration" json,
	"folder_id" text,
	"uploaded_at" timestamp DEFAULT now(),
	"analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"vendor" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"config" json NOT NULL,
	"connection_details" json,
	"credentials" json,
	"last_sync" timestamp,
	"record_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"data_source_id" text NOT NULL,
	"table_name" text NOT NULL,
	"fields" json NOT NULL,
	"record_count" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_status" (
	"id" text PRIMARY KEY NOT NULL,
	"equipment_id" text NOT NULL,
	"equipment_type" text NOT NULL,
	"status" text NOT NULL,
	"utilization_rate" integer,
	"chamber_pressure" integer,
	"chamber_temperature" integer,
	"error_code" text,
	"last_maintenance_date" timestamp,
	"status_updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "excel_files" (
	"id" text PRIMARY KEY NOT NULL,
	"data_source_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"uploaded_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'processing' NOT NULL,
	"sheets" json DEFAULT '[]'::json,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "google_api_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"project_id" text,
	"api_key" text,
	"scopes" json DEFAULT '[]'::json,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_configuration_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"color" text DEFAULT '#3B82F6',
	"icon" text DEFAULT 'FolderOpen',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_configurations" (
	"id" text PRIMARY KEY NOT NULL,
	"folder_id" text,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"nodes" json DEFAULT '[]'::json,
	"connections" json DEFAULT '[]'::json,
	"model_id" text,
	"is_active" integer DEFAULT 0 NOT NULL,
	"input_mappings" json DEFAULT '[]'::json,
	"output_mappings" json DEFAULT '[]'::json,
	"settings" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pi_asset_hierarchy" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_name" text NOT NULL,
	"asset_path" text NOT NULL,
	"asset_type" text,
	"location" text,
	"operational_status" text,
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pi_drilling_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"well_pad_id" text NOT NULL,
	"bit_weight" integer,
	"block_height" integer,
	"diff_press" integer,
	"flow_in_rate" integer,
	"hole_depth" integer,
	"hook_load" integer,
	"pump_pressure" integer,
	"top_drive_rpm" integer,
	"top_drive_torque" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pi_event_frames" (
	"id" text PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"template_name" text NOT NULL,
	"asset_path" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"event_type" text,
	"acknowledged" integer DEFAULT 0,
	"severity" text DEFAULT 'Normal',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pi_tag_values" (
	"id" text PRIMARY KEY NOT NULL,
	"tag_name" text NOT NULL,
	"asset_path" text,
	"value" integer,
	"quality" text DEFAULT 'Good' NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"scale_flag" integer DEFAULT 1000,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_parameters" (
	"id" text PRIMARY KEY NOT NULL,
	"wafer_id" text NOT NULL,
	"equipment_id" text NOT NULL,
	"process_step" text NOT NULL,
	"temperature" integer,
	"pressure" integer,
	"gas_flow" integer,
	"rf_power" integer,
	"process_time" integer,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_inspection" (
	"id" text PRIMARY KEY NOT NULL,
	"wafer_id" text NOT NULL,
	"inspection_type" text NOT NULL,
	"defect_count" integer,
	"thickness_measurement" integer,
	"critical_dimension" integer,
	"yield" integer,
	"inspected_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salesforce_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"sf_id" text NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"annual_revenue" integer,
	"number_of_employees" integer,
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salesforce_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"sf_id" text NOT NULL,
	"name" text NOT NULL,
	"account_id" text,
	"amount" integer,
	"stage_name" text,
	"close_date" text,
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sap_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"country" text,
	"credit_limit" integer,
	"created_date" text,
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sap_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"order_date" text,
	"total_amount" integer,
	"status" text,
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "views" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"assigned_to" json DEFAULT '[]'::json,
	"assigned_departments" json DEFAULT '[]'::json,
	"data_sources" json DEFAULT '[]'::json,
	"layout" json DEFAULT '{"grids":[]}'::json,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wafer_data" (
	"id" text PRIMARY KEY NOT NULL,
	"wafer_id" text NOT NULL,
	"lot_id" text NOT NULL,
	"process_step" text NOT NULL,
	"equipment_id" text NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_model_files" ADD CONSTRAINT "ai_model_files_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_results" ADD CONSTRAINT "ai_model_results_configuration_id_model_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."model_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_results" ADD CONSTRAINT "ai_model_results_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_files" ADD CONSTRAINT "excel_files_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_configurations" ADD CONSTRAINT "model_configurations_folder_id_model_configuration_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."model_configuration_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_configurations" ADD CONSTRAINT "model_configurations_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;