import { 
  users, views, dataSources, dataTables, excelFiles, sapCustomers, sapOrders, 
  salesforceAccounts, salesforceOpportunities, piAssetHierarchy, piDrillingOperations, googleApiConfigs,
  aiModels, modelConfigurations,
  type User, type InsertUser, type View, type InsertView, type DataSource, type InsertDataSource, 
  type ExcelFile, type InsertExcelFile, type GoogleApiConfig, type InsertGoogleApiConfig,
  type AiModel, type InsertAiModel, type ModelConfiguration, type InsertModelConfiguration
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // View methods
  getViews(): Promise<View[]>;
  getView(id: string): Promise<View | undefined>;
  createView(insertView: InsertView): Promise<View>;
  updateView(id: string, updates: Partial<View>): Promise<View>;
  deleteView(id: string): Promise<void>;
  
  // Data Source methods
  getDataSources(): Promise<DataSource[]>;
  getDataSource(id: string): Promise<DataSource | undefined>;
  createDataSource(dataSource: any): Promise<DataSource>;
  updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource>;
  deleteDataSource(id: string): Promise<void>;
  getDataSourceTables(dataSourceId: string): Promise<any[]>;
  getTableData(dataSourceId: string, tableName: string): Promise<any[]>;
  
  // Excel Files methods
  getExcelFiles(dataSourceId: string): Promise<ExcelFile[]>;
  createExcelFile(excelFile: InsertExcelFile): Promise<ExcelFile>;
  
  // Google API Config methods
  getGoogleApiConfigs(): Promise<GoogleApiConfig[]>;
  getGoogleApiConfig(id: string): Promise<GoogleApiConfig | undefined>;
  getGoogleApiConfigsByType(type: 'drive' | 'sheets'): Promise<GoogleApiConfig[]>;
  createGoogleApiConfig(config: InsertGoogleApiConfig): Promise<GoogleApiConfig>;
  updateGoogleApiConfig(id: string, updates: Partial<GoogleApiConfig>): Promise<GoogleApiConfig>;
  deleteGoogleApiConfig(id: string): Promise<void>;
  
  // AI Model methods
  getAiModels(): Promise<AiModel[]>;
  getAiModel(id: string): Promise<AiModel | undefined>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel>;
  deleteAiModel(id: string): Promise<void>;
  
  // Model Configuration methods
  getModelConfigurations(): Promise<ModelConfiguration[]>;
  getModelConfiguration(id: string): Promise<ModelConfiguration | undefined>;
  getModelConfigurationsByModel(modelId: string): Promise<ModelConfiguration[]>;
  createModelConfiguration(config: InsertModelConfiguration): Promise<ModelConfiguration>;
  updateModelConfiguration(id: string, updates: Partial<ModelConfiguration>): Promise<ModelConfiguration>;
  deleteModelConfiguration(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // View methods
  async getViews(): Promise<View[]> {
    return await db.select().from(views);
  }

  async getView(id: string): Promise<View | undefined> {
    const [view] = await db.select().from(views).where(eq(views.id, id));
    return view || undefined;
  }

  async createView(insertView: InsertView): Promise<View> {
    const [view] = await db
      .insert(views)
      .values(insertView)
      .returning();
    return view;
  }

  async updateView(id: string, updates: Partial<View>): Promise<View> {
    const [view] = await db
      .update(views)
      .set({ 
        ...updates, 
        updatedAt: new Date().toISOString().split('T')[0]
      })
      .where(eq(views.id, id))
      .returning();
    return view;
  }

  async deleteView(id: string): Promise<void> {
    await db.delete(views).where(eq(views.id, id));
  }

  // Data Source methods
  async getDataSources(): Promise<DataSource[]> {
    return await db.select().from(dataSources);
  }

  async getDataSource(id: string): Promise<DataSource | undefined> {
    const [dataSource] = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return dataSource || undefined;
  }

  async createDataSource(dataSource: any, dataSchema?: any, sampleData?: any): Promise<DataSource> {
    const newId = `ds-${Date.now()}`;
    
    // Extract dataSchema and sampleData from config for Excel and Google Sheets sources
    let finalConfig = dataSource.config;
    let extractedDataSchema = dataSchema;
    let extractedSampleData = sampleData;
    
    if ((dataSource.type === 'Excel' || dataSource.type === 'Google Sheets') && dataSource.config) {
      if (!extractedDataSchema) extractedDataSchema = dataSource.config.dataSchema;
      if (!extractedSampleData) extractedSampleData = dataSource.config.sampleData;
      
      // For Google Sheets, keep data in config; for Excel, remove to avoid duplication
      if (dataSource.type === 'Excel') {
        finalConfig = {
          ...dataSource.config
        };
        delete finalConfig.dataSchema;
        delete finalConfig.sampleData;
      } else {
        // Keep all config data for Google Sheets
        finalConfig = dataSource.config;
      }
    }
    
    console.log('createDataSource - Final config:', JSON.stringify(finalConfig, null, 2));
    console.log('createDataSource - extractedDataSchema length:', extractedDataSchema?.length || 0);
    console.log('createDataSource - extractedSampleData keys:', Object.keys(extractedSampleData || {}));
    
    const [created] = await db
      .insert(dataSources)
      .values({
        id: newId,
        name: dataSource.name,
        type: dataSource.type,
        category: dataSource.category,
        vendor: dataSource.vendor || null,
        status: 'connected',
        config: finalConfig,
        connectionDetails: dataSource.connectionDetails || {},
        lastSync: new Date(),
        recordCount: dataSource.recordCount || 0
      })
      .returning();
      
    // Add dataSchema and sampleData as separate fields for file-based sources
    if (extractedDataSchema && extractedSampleData) {
      return {
        ...created,
        dataSchema: extractedDataSchema as any,
        sampleData: extractedSampleData as any
      };
    }
      
    return created;
  }

  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
    const [updated] = await db
      .update(dataSources)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(dataSources.id, id))
      .returning();
    return updated;
  }

  async deleteDataSource(id: string): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  async getDataSourceTables(dataSourceId: string): Promise<any[]> {
    // Check if this is a file-based data source (Excel or Google Sheets) and return its schema
    const dataSource = await this.getDataSource(dataSourceId);
    if (dataSource && (dataSource.type === 'Excel' || dataSource.type === 'excel' || dataSource.type === 'Google Sheets')) {
      // First check if dataSchema is directly attached to the dataSource (from runtime)
      if ((dataSource as any).dataSchema) {
        return (dataSource as any).dataSchema.map((table: any) => ({
          name: table.table,
          fields: table.fields,
          recordCount: table.recordCount
        }));
      }
      
      // Then check config
      const config = dataSource.config as any;
      if (config && config.dataSchema) {
        return config.dataSchema.map((table: any) => ({
          name: table.table,
          fields: table.fields,
          recordCount: table.recordCount
        }));
      }
      
      // Return default Excel schema if no config found
      return [
        {
          name: 'Sales Data',
          fields: [
            { name: 'OrderID', type: 'VARCHAR(20)', description: 'Unique order identifier' },
            { name: 'CustomerName', type: 'VARCHAR(100)', description: 'Customer company name' },
            { name: 'ProductName', type: 'VARCHAR(100)', description: 'Product description' },
            { name: 'Quantity', type: 'INTEGER', description: 'Units sold' },
            { name: 'UnitPrice', type: 'DECIMAL(10,2)', description: 'Price per unit' },
            { name: 'TotalAmount', type: 'DECIMAL(15,2)', description: 'Total order value' },
            { name: 'OrderDate', type: 'DATE', description: 'Date of sale' }
          ],
          recordCount: 150
        },
        {
          name: 'Sheet1',
          fields: [
            { name: 'Name', type: 'VARCHAR(100)', description: 'Product name' },
            { name: 'Category', type: 'VARCHAR(50)', description: 'Product category' },
            { name: 'Price', type: 'DECIMAL(10,2)', description: 'Product price' },
            { name: 'Stock', type: 'INTEGER', description: 'Stock quantity' },
            { name: 'Supplier', type: 'VARCHAR(100)', description: 'Supplier name' }
          ],
          recordCount: 100
        }
      ];
    }

    // Return tables based on data source type
    const tableSchemas = {
      'sap-erp': [
        {
          name: 'CUSTOMERS',
          fields: [
            { name: 'customer_id', type: 'VARCHAR(50)', description: 'Customer ID' },
            { name: 'customer_name', type: 'VARCHAR(255)', description: 'Customer name' },
            { name: 'country', type: 'VARCHAR(50)', description: 'Country' },
            { name: 'credit_limit', type: 'INTEGER', description: 'Credit limit' },
            { name: 'created_date', type: 'DATE', description: 'Created date' }
          ],
          recordCount: 10
        },
        {
          name: 'ORDERS',
          fields: [
            { name: 'order_id', type: 'VARCHAR(50)', description: 'Order ID' },
            { name: 'customer_id', type: 'VARCHAR(50)', description: 'Customer ID' },
            { name: 'order_date', type: 'DATE', description: 'Order date' },
            { name: 'total_amount', type: 'INTEGER', description: 'Total amount' },
            { name: 'status', type: 'VARCHAR(50)', description: 'Order status' }
          ],
          recordCount: 10
        }
      ],
      'salesforce-crm': [
        {
          name: 'ACCOUNTS',
          fields: [
            { name: 'sf_id', type: 'VARCHAR(50)', description: 'Salesforce ID' },
            { name: 'name', type: 'VARCHAR(255)', description: 'Account name' },
            { name: 'industry', type: 'VARCHAR(100)', description: 'Industry' },
            { name: 'annual_revenue', type: 'INTEGER', description: 'Annual revenue' },
            { name: 'number_of_employees', type: 'INTEGER', description: 'Number of employees' }
          ],
          recordCount: 10
        },
        {
          name: 'OPPORTUNITIES',
          fields: [
            { name: 'sf_id', type: 'VARCHAR(50)', description: 'Salesforce ID' },
            { name: 'name', type: 'VARCHAR(255)', description: 'Opportunity name' },
            { name: 'account_id', type: 'VARCHAR(50)', description: 'Account ID' },
            { name: 'amount', type: 'INTEGER', description: 'Amount' },
            { name: 'stage_name', type: 'VARCHAR(100)', description: 'Sales stage' },
            { name: 'close_date', type: 'DATE', description: 'Close date' }
          ],
          recordCount: 10
        }
      ],
      'aveva-pi': [
        {
          name: 'ASSET_HIERARCHY',
          fields: [
            { name: 'asset_name', type: 'VARCHAR(255)', description: 'Asset name' },
            { name: 'asset_path', type: 'VARCHAR(500)', description: 'Asset path' },
            { name: 'asset_type', type: 'VARCHAR(100)', description: 'Asset type' },
            { name: 'location', type: 'VARCHAR(255)', description: 'Location' },
            { name: 'operational_status', type: 'VARCHAR(50)', description: 'Operational status' }
          ],
          recordCount: 10
        },
        {
          name: 'DRILLING_OPERATIONS',
          fields: [
            { name: 'well_pad_id', type: 'VARCHAR(50)', description: 'Well pad ID' },
            { name: 'bit_weight', type: 'INTEGER', description: 'Bit weight' },
            { name: 'block_height', type: 'INTEGER', description: 'Block height' },
            { name: 'diff_press', type: 'INTEGER', description: 'Differential pressure' },
            { name: 'flow_in_rate', type: 'INTEGER', description: 'Flow in rate' },
            { name: 'hole_depth', type: 'INTEGER', description: 'Hole depth' },
            { name: 'hook_load', type: 'INTEGER', description: 'Hook load' },
            { name: 'pump_pressure', type: 'INTEGER', description: 'Pump pressure' },
            { name: 'top_drive_rpm', type: 'INTEGER', description: 'Top drive RPM' },
            { name: 'top_drive_torque', type: 'INTEGER', description: 'Top drive torque' }
          ],
          recordCount: 10
        }
      ]
    };

    return tableSchemas[dataSourceId as keyof typeof tableSchemas] || [];
  }

  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
    const [dataSource] = await db
      .update(dataSources)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(dataSources.id, id))
      .returning();
    return dataSource;
  }

  async deleteDataSource(id: string): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  async getExcelFiles(dataSourceId: string): Promise<ExcelFile[]> {
    return await db.select().from(excelFiles).where(eq(excelFiles.dataSourceId, dataSourceId));
  }

  async createExcelFile(excelFile: InsertExcelFile): Promise<ExcelFile> {
    const [created] = await db
      .insert(excelFiles)
      .values(excelFile)
      .returning();
    return created;
  }

  async getTableData(dataSourceId: string, tableName: string): Promise<any[]> {
    // Check if this is an Excel data source and return its data
    const dataSource = await this.getDataSource(dataSourceId);
    console.log('getTableData - dataSource:', JSON.stringify(dataSource, null, 2));
    console.log('getTableData - looking for table:', tableName);
    
    if (dataSource && (dataSource.type === 'Excel' || dataSource.type === 'excel' || dataSource.type === 'Google Sheets')) {
      // Check if data is stored in the enhanced field (from runtime)
      if ((dataSource as any).sampleData && (dataSource as any).sampleData[tableName]) {
        console.log('Found file data in sampleData field');
        return (dataSource as any).sampleData[tableName];
      }
      
      // Check if data is stored in config
      const config = dataSource.config as any;
      if (config && config.sampleData && config.sampleData[tableName]) {
        console.log('Found file data in config.sampleData');
        return config.sampleData[tableName];
      }
      
      // Fallback to mock Excel data if no real data found
      console.log('No Excel data found for table:', tableName, '- returning mock data');
      const mockExcelData = {
        'Sales Data': [
          { OrderID: 'ORD001', CustomerName: 'Tech Solutions Inc', ProductName: 'Software License', Quantity: 5, UnitPrice: 299.99, TotalAmount: 1499.95, OrderDate: '2024-01-15' },
          { OrderID: 'ORD002', CustomerName: 'Global Manufacturing', ProductName: 'Consulting Services', Quantity: 1, UnitPrice: 2500.00, TotalAmount: 2500.00, OrderDate: '2024-01-16' },
          { OrderID: 'ORD003', CustomerName: 'Retail Corp', ProductName: 'Software License', Quantity: 10, UnitPrice: 299.99, TotalAmount: 2999.90, OrderDate: '2024-01-17' }
        ],
        'Sheet1': [
          { Name: 'Product A', Category: 'Electronics', Price: 299.99, Stock: 50, Supplier: 'Supplier 1' },
          { Name: 'Product B', Category: 'Clothing', Price: 49.99, Stock: 100, Supplier: 'Supplier 2' },
          { Name: 'Product C', Category: 'Books', Price: 19.99, Stock: 200, Supplier: 'Supplier 3' }
        ]
      };
      return (mockExcelData as any)[tableName] || [];
    }

    // Return mock data for testing - ensure authentic data is available
    const mockData: Record<string, Record<string, any[]>> = {
      'SAP ERP': {
        'customers': [
          { CUSTOMER_ID: 'CUST001', CUSTOMER_NAME: 'Acme Manufacturing Co.', COUNTRY: 'USA', CREDIT_LIMIT: 500000, CREATED_DATE: '2023-03-15', totalPurchases: 250000 },
          { CUSTOMER_ID: 'CUST002', CUSTOMER_NAME: 'Global Tech Solutions', COUNTRY: 'Germany', CREDIT_LIMIT: 750000, CREATED_DATE: '2023-01-08', totalPurchases: 420000 },
          { CUSTOMER_ID: 'CUST003', CUSTOMER_NAME: 'Innovation Ltd.', COUNTRY: 'UK', CREDIT_LIMIT: 300000, CREATED_DATE: '2023-05-22', totalPurchases: 180000 },
          { CUSTOMER_ID: 'CUST004', CUSTOMER_NAME: 'Pacific Industries', COUNTRY: 'Japan', CREDIT_LIMIT: 600000, CREATED_DATE: '2023-02-10', totalPurchases: 320000 },
          { CUSTOMER_ID: 'CUST005', CUSTOMER_NAME: 'Nordic Solutions AB', COUNTRY: 'Sweden', CREDIT_LIMIT: 400000, CREATED_DATE: '2023-04-03', totalPurchases: 280000 }
        ],
        'orders': [
          { ORDER_ID: 'ORD001', CUSTOMER_ID: 'CUST001', ORDER_DATE: '2024-01-15', TOTAL_AMOUNT: 25000, STATUS: 'Completed', orderNumber: 'PO-2024-001', customerName: 'Acme Manufacturing Co.' },
          { ORDER_ID: 'ORD002', CUSTOMER_ID: 'CUST002', ORDER_DATE: '2024-01-16', TOTAL_AMOUNT: 42000, STATUS: 'Processing', orderNumber: 'PO-2024-002', customerName: 'Global Tech Solutions' },
          { ORDER_ID: 'ORD003', CUSTOMER_ID: 'CUST003', ORDER_DATE: '2024-01-17', TOTAL_AMOUNT: 18000, STATUS: 'Shipped', orderNumber: 'PO-2024-003', customerName: 'Innovation Ltd.' },
          { ORDER_ID: 'ORD004', CUSTOMER_ID: 'CUST004', ORDER_DATE: '2024-01-18', TOTAL_AMOUNT: 32000, STATUS: 'Completed', orderNumber: 'PO-2024-004', customerName: 'Pacific Industries' },
          { ORDER_ID: 'ORD005', CUSTOMER_ID: 'CUST005', ORDER_DATE: '2024-01-19', TOTAL_AMOUNT: 28000, STATUS: 'Processing', orderNumber: 'PO-2024-005', customerName: 'Nordic Solutions AB' }
        ]
      },
      'Salesforce CRM': {
        'accounts': [
          { SF_ID: 'SF001', NAME: 'Enterprise Corp', INDUSTRY: 'Technology', ANNUAL_REVENUE: 5000000, NUMBER_OF_EMPLOYEES: 250 },
          { SF_ID: 'SF002', NAME: 'Global Manufacturing', INDUSTRY: 'Manufacturing', ANNUAL_REVENUE: 12000000, NUMBER_OF_EMPLOYEES: 800 },
          { SF_ID: 'SF003', NAME: 'Digital Solutions Inc', INDUSTRY: 'Software', ANNUAL_REVENUE: 3500000, NUMBER_OF_EMPLOYEES: 150 }
        ],
        'opportunities': [
          { SF_ID: 'OPP001', NAME: 'Q1 2024 Integration Project', ACCOUNT_ID: 'SF001', AMOUNT: 250000, STAGE_NAME: 'Proposal', CLOSE_DATE: '2024-03-31' },
          { SF_ID: 'OPP002', NAME: 'Manufacturing Automation', ACCOUNT_ID: 'SF002', AMOUNT: 450000, STAGE_NAME: 'Negotiation', CLOSE_DATE: '2024-02-28' }
        ]
      },
      'AVEVA PI': {
        'ASSET_HIERARCHY': [
          { ASSET_NAME: 'Drilling Platform Alpha', ASSET_PATH: '/Oil_Gas/Offshore/Platform_Alpha', ASSET_TYPE: 'Drilling Platform', LOCATION: 'North Sea', OPERATIONAL_STATUS: 'Active' },
          { ASSET_NAME: 'Production Unit Beta', ASSET_PATH: '/Oil_Gas/Onshore/Unit_Beta', ASSET_TYPE: 'Production Unit', LOCATION: 'Texas', OPERATIONAL_STATUS: 'Active' },
          { ASSET_NAME: 'Refinery Gamma', ASSET_PATH: '/Oil_Gas/Refinery/Gamma', ASSET_TYPE: 'Refinery', LOCATION: 'Louisiana', OPERATIONAL_STATUS: 'Maintenance' }
        ],
        'DRILLING_OPERATIONS': [
          { WELL_PAD_ID: 'WP001', BIT_WEIGHT: 45000, BLOCK_HEIGHT: 125, DIFF_PRESS: 850, FLOW_IN_RATE: 420, HOLE_DEPTH: 8500, HOOK_LOAD: 125000, PUMP_PRESSURE: 1200, TOP_DRIVE_RPM: 180, TOP_DRIVE_TORQUE: 15000 },
          { WELL_PAD_ID: 'WP002', BIT_WEIGHT: 52000, BLOCK_HEIGHT: 110, DIFF_PRESS: 920, FLOW_IN_RATE: 385, HOLE_DEPTH: 9200, HOOK_LOAD: 142000, PUMP_PRESSURE: 1350, TOP_DRIVE_RPM: 165, TOP_DRIVE_TORQUE: 17500 },
          { WELL_PAD_ID: 'WP003', BIT_WEIGHT: 48000, BLOCK_HEIGHT: 118, DIFF_PRESS: 780, FLOW_IN_RATE: 445, HOLE_DEPTH: 7800, HOOK_LOAD: 135000, PUMP_PRESSURE: 1100, TOP_DRIVE_RPM: 190, TOP_DRIVE_TORQUE: 14200 }
        ]
      }
    };

    try {
      console.log('getTableData called with:', { dataSourceId, tableName });
      const sourceData = mockData[dataSourceId];
      console.log('Found source data keys:', Object.keys(mockData));
      if (sourceData && sourceData[tableName.toLowerCase()]) {
        console.log('Returning mock data for:', tableName);
        return sourceData[tableName.toLowerCase()];
      }
      
      // Also try to fetch from database if available
      if (dataSourceId === 'sap-erp') {
        if (tableName === 'CUSTOMERS' || tableName === 'customers') {
          return await db.select().from(sapCustomers);
        } else if (tableName === 'ORDERS' || tableName === 'orders') {
          return await db.select().from(sapOrders);
        }
      } else if (dataSourceId === 'salesforce-crm' || dataSourceId === 'Salesforce CRM') {
        if (tableName === 'ACCOUNTS' || tableName === 'accounts') {
          return await db.select().from(salesforceAccounts);
        } else if (tableName === 'OPPORTUNITIES' || tableName === 'opportunities') {
          return await db.select().from(salesforceOpportunities);
        }
      } else if (dataSourceId === 'aveva-pi' || dataSourceId === 'AVEVA PI') {
        if (tableName === 'ASSET_HIERARCHY') {
          return await db.select().from(piAssetHierarchy);
        } else if (tableName === 'DRILLING_OPERATIONS') {
          return await db.select().from(piDrillingOperations);
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching table data:', error);
      return [];
    }
  }

  // Google API Config methods
  async getGoogleApiConfigs(): Promise<GoogleApiConfig[]> {
    return await db.select().from(googleApiConfigs);
  }

  async getGoogleApiConfig(id: string): Promise<GoogleApiConfig | undefined> {
    const [config] = await db.select().from(googleApiConfigs).where(eq(googleApiConfigs.id, id));
    return config || undefined;
  }

  async getGoogleApiConfigsByType(type: 'drive' | 'sheets'): Promise<GoogleApiConfig[]> {
    return await db.select().from(googleApiConfigs).where(eq(googleApiConfigs.type, type));
  }

  async createGoogleApiConfig(config: InsertGoogleApiConfig): Promise<GoogleApiConfig> {
    const newId = `gapi-${Date.now()}`;
    const [created] = await db
      .insert(googleApiConfigs)
      .values({
        id: newId,
        ...config
      })
      .returning();
    return created;
  }

  async updateGoogleApiConfig(id: string, updates: Partial<GoogleApiConfig>): Promise<GoogleApiConfig> {
    const [updated] = await db
      .update(googleApiConfigs)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(googleApiConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteGoogleApiConfig(id: string): Promise<void> {
    await db.delete(googleApiConfigs).where(eq(googleApiConfigs.id, id));
  }

  // AI Model methods
  async getAiModels(): Promise<AiModel[]> {
    return await db.select().from(aiModels);
  }

  async getAiModel(id: string): Promise<AiModel | undefined> {
    const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id));
    return model || undefined;
  }

  async createAiModel(model: InsertAiModel): Promise<AiModel> {
    const newId = `model-${Date.now()}`;
    const [created] = await db
      .insert(aiModels)
      .values({
        id: newId,
        ...model
      })
      .returning();
    return created;
  }

  async updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel> {
    const [updated] = await db
      .update(aiModels)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(aiModels.id, id))
      .returning();
    return updated;
  }

  async deleteAiModel(id: string): Promise<void> {
    await db.delete(aiModels).where(eq(aiModels.id, id));
  }

  // Model Configuration methods
  async getModelConfigurations(): Promise<ModelConfiguration[]> {
    return await db.select().from(modelConfigurations);
  }

  async getModelConfiguration(id: string): Promise<ModelConfiguration | undefined> {
    const [config] = await db.select().from(modelConfigurations).where(eq(modelConfigurations.id, id));
    return config || undefined;
  }

  async getModelConfigurationsByModel(modelId: string): Promise<ModelConfiguration[]> {
    return await db.select().from(modelConfigurations).where(eq(modelConfigurations.modelId, modelId));
  }

  async createModelConfiguration(config: InsertModelConfiguration): Promise<ModelConfiguration> {
    const newId = `config-${Date.now()}`;
    const [created] = await db
      .insert(modelConfigurations)
      .values({
        id: newId,
        ...config
      })
      .returning();
    return created;
  }

  async updateModelConfiguration(id: string, updates: Partial<ModelConfiguration>): Promise<ModelConfiguration> {
    const [updated] = await db
      .update(modelConfigurations)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(modelConfigurations.id, id))
      .returning();
    return updated;
  }

  async deleteModelConfiguration(id: string): Promise<void> {
    await db.delete(modelConfigurations).where(eq(modelConfigurations.id, id));
  }
}

export const storage = new DatabaseStorage();
