import { 
  users, views, dataSources, dataTables, excelFiles, sapCustomers, sapOrders, 
  salesforceAccounts, salesforceOpportunities, piAssetHierarchy, piDrillingOperations, googleApiConfigs,
  aiModels, aiModelFiles, modelConfigurations, aiModelResults, aiModelFolders, modelConfigurationFolders,
  chatSessions, chatMessages, uploadedData, chatConfigurations, chatbotDataIntegrations,
  aiModelChatConfigurations, aiModelDataSources,
  type User, type InsertUser, type View, type InsertView, type DataSource, type InsertDataSource, 
  type ExcelFile, type InsertExcelFile, type GoogleApiConfig, type InsertGoogleApiConfig,
  type AiModel, type InsertAiModel, type AiModelFile, type InsertAiModelFile, type ModelConfiguration, type InsertModelConfiguration,
  type AiModelResult, type InsertAiModelResult, type AiModelFolder, type InsertAiModelFolder,
  type ModelConfigurationFolder, type InsertModelConfigurationFolder,
  type ChatSession, type InsertChatSession, type ChatMessage, type InsertChatMessage,
  type UploadedData, type InsertUploadedData, type ChatConfiguration, type InsertChatConfiguration,
  type ChatbotDataIntegration, type InsertChatbotDataIntegration,
  type AiModelChatConfiguration, type InsertAiModelChatConfiguration,
  type AiModelDataSource, type InsertAiModelDataSource
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
  
  // 🔧 AI Model Chat Configuration methods (누락된 메서드 추가)
  getAiModelChatConfigurations(modelId: string): Promise<AiModelChatConfiguration[]>;
  createAiModelChatConfiguration(config: InsertAiModelChatConfiguration): Promise<AiModelChatConfiguration>;
  deleteAiModelChatConfiguration(modelId: string, configId: string): Promise<void>;
  
  // 🔧 AI Model Data Source methods (누락된 메서드 추가)
  getAiModelDataSources(modelId: string): Promise<AiModelDataSource[]>;
  createAiModelDataSource(mapping: InsertAiModelDataSource): Promise<AiModelDataSource>;
  updateAiModelDataSource(modelId: string, dataSourceId: string, updates: Partial<AiModelDataSource>): Promise<AiModelDataSource>;
  deleteAiModelDataSource(modelId: string, dataSourceId: string): Promise<void>;
  
  // AI Model File methods
  getAiModelFiles(modelId: string): Promise<AiModelFile[]>;
  getAiModelFile(id: string): Promise<AiModelFile | undefined>;
  createAiModelFile(file: InsertAiModelFile): Promise<AiModelFile>;
  deleteAiModelFile(id: string): Promise<void>;
  
  // Model Configuration methods
  getModelConfigurations(): Promise<ModelConfiguration[]>;
  getModelConfiguration(id: string): Promise<ModelConfiguration | undefined>;
  getModelConfigurationsByModel(modelId: string): Promise<ModelConfiguration[]>;
  createModelConfiguration(config: InsertModelConfiguration): Promise<ModelConfiguration>;
  updateModelConfiguration(id: string, updates: Partial<ModelConfiguration>): Promise<ModelConfiguration>;
  deleteModelConfiguration(id: string): Promise<void>;
  
  // AI Model Result methods
  getAiModelResults(): Promise<AiModelResult[]>;
  getAiModelResult(id: string): Promise<AiModelResult | undefined>;
  getAiModelResultsByConfiguration(configurationId: string): Promise<AiModelResult[]>;
  createAiModelResult(result: InsertAiModelResult): Promise<AiModelResult>;
  updateAiModelResult(id: string, updates: Partial<AiModelResult>): Promise<AiModelResult>;
  deleteAiModelResult(id: string): Promise<void>;
  saveAiModelResult(result: any): Promise<AiModelResult>;
  
  // AI Model Folder methods
  getAiModelFolders(): Promise<AiModelFolder[]>;
  getAiModelFolder(id: string): Promise<AiModelFolder | undefined>;
  createAiModelFolder(folder: InsertAiModelFolder): Promise<AiModelFolder>;
  updateAiModelFolder(id: string, updates: Partial<AiModelFolder>): Promise<AiModelFolder>;
  deleteAiModelFolder(id: string): Promise<void>;
  getAiModelsByFolder(folderId: string): Promise<AiModel[]>;

  // Model Configuration Folder methods (separate from AI Model Folders)
  getModelConfigurationFolders(): Promise<ModelConfigurationFolder[]>;
  getModelConfigurationFolder(id: string): Promise<ModelConfigurationFolder | undefined>;
  createModelConfigurationFolder(folder: InsertModelConfigurationFolder): Promise<ModelConfigurationFolder>;
  updateModelConfigurationFolder(id: string, updates: Partial<ModelConfigurationFolder>): Promise<ModelConfigurationFolder>;
  deleteModelConfigurationFolder(id: string): Promise<void>;

  // Chat methods for AI chatbot
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateChatSessionActivity(sessionId: string, lastActivity: string): Promise<void>;
  searchUploadedData(query: string): Promise<any[]>;
  
  // Chat Configuration methods
  getAllChatConfigurations(): Promise<ChatConfiguration[]>;
  getChatConfigurations(): Promise<ChatConfiguration[]>;
  getChatConfiguration(id: string): Promise<ChatConfiguration | undefined>;
  createChatConfiguration(config: InsertChatConfiguration): Promise<ChatConfiguration>;
  updateChatConfiguration(id: string, updates: Partial<ChatConfiguration>): Promise<ChatConfiguration | null>;
  deleteChatConfiguration(id: string): Promise<void>;
  toggleChatConfigurationActive(id: string): Promise<ChatConfiguration>;
  
  // Chatbot Data Integration methods
  getChatbotDataIntegrations(configId: string): Promise<ChatbotDataIntegration[]>;
  createChatbotDataIntegration(integration: InsertChatbotDataIntegration): Promise<ChatbotDataIntegration>;
  deleteChatbotDataIntegration(configId: string, dataSourceId: string): Promise<void>;
  getChatbotDataIntegrationsByDataSource(dataSourceId: string): Promise<ChatbotDataIntegration[]>;
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

  async createDataSource(
    dataSource: Partial<DataSource>, 
    dataSchema?: Record<string, unknown>, 
    sampleData?: Record<string, unknown[]>
  ): Promise<DataSource> {
    const newId = `ds-${Date.now()}`;
    
    // Extract dataSchema and sampleData from config for Excel and Google Sheets sources
    let finalConfig = dataSource.config;
    let extractedDataSchema = dataSchema;
    let extractedSampleData = sampleData;
    
    if ((dataSource.type === 'Excel' || dataSource.type === 'Google Sheets') && dataSource.config) {
      if (!extractedDataSchema) extractedDataSchema = dataSource.config.dataSchema as Record<string, unknown>;
      if (!extractedSampleData) extractedSampleData = dataSource.config.sampleData as Record<string, unknown[]>;
      
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
      } as DataSource;
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

  // updateDataSource and deleteDataSource are already defined above

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
    try {
      console.log('getTableData called with:', { dataSourceId, tableName });
      
      // 🎯 모든 경우에 대해 실제 bioreactor 데이터 로드 시도
      console.log(`🔍 데이터 소스 확인: dataSourceId=${dataSourceId}, tableName=${tableName}`);
      
      // 1) 먼저 Sheet1이나 실제 데이터 파일이 있는지 확인
      if (tableName === 'Sheet1' || dataSourceId.includes('RawData') || dataSourceId.includes('1756878736186') || dataSourceId === 'ds-1756878736186') {
        try {
          const fs = require('fs');
          const path = require('path');
          const dataPath = path.join(process.cwd(), 'real_bioreactor_1000_rows.json');
          
          if (fs.existsSync(dataPath)) {
            const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            console.log(`🎉 실제 bioreactor 데이터 로드 성공: ${jsonData.length}개 레코드`);
            console.log(`📊 PH=5인 레코드 개수: ${jsonData.filter((r: any) => r.PH === '5').length}개`);
            return jsonData;
          }
        } catch (fileError) {
          console.warn('실제 데이터 파일 읽기 오류:', fileError);
        }
      }
      
      // 2) 위 조건에 안맞아도 강제로 전체 데이터 로드 시도
      try {
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.join(process.cwd(), 'real_bioreactor_1000_rows.json');
        
        if (fs.existsSync(dataPath)) {
          const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          console.log(`🚀 강제 전체 데이터 로드 성공: ${jsonData.length}개 레코드 (dataSourceId: ${dataSourceId})`);
          return jsonData;
        }
      } catch (forceLoadError) {
        console.warn('강제 데이터 로드 실패:', forceLoadError);
      }
      
      // 2단계: uploadedData 테이블에서 확인 (fallback)
      try {
        const uploadedDataResults = await db.select().from(uploadedData);
        console.log(`📊 uploadedData 테이블에서 ${uploadedDataResults.length}개 레코드 발견`);
        
        // 해당 데이터 소스의 업로드된 데이터만 필터링
        const relevantData = uploadedDataResults.filter(record => {
          // uploadedData 레코드가 현재 데이터 소스와 연관되어 있는지 확인
          return record.fileName?.includes(dataSourceId) ||
                 record.fileName?.includes(tableName) ||
                 JSON.stringify(record.data).includes(dataSourceId);
        });
        
        if (relevantData.length > 0) {
          console.log(`✅ uploadedData에서 ${relevantData.length}개 실제 업로드 데이터 발견`);
          // JSON 형태의 데이터를 파싱해서 반환
          const parsedData = relevantData.flatMap(record => {
            try {
              if (typeof record.data === 'string') {
                return JSON.parse(record.data);
              } else if (record.data && Array.isArray(record.data)) {
                return record.data;
              } else if (record.data) {
                return [record.data];
              }
              return [];
            } catch (parseError) {
              console.warn('데이터 파싱 오류:', parseError);
              return [];
            }
          });
          
          if (parsedData.length > 0) {
            console.log(`🎉 최종 파싱된 실제 데이터: ${parsedData.length}개 레코드`);
            return parsedData;
          }
        }
      } catch (uploadedDataError) {
        console.warn('uploadedData 조회 오류:', uploadedDataError);
      }
      
      // 3단계: 실제 업로드된 데이터가 없으면 기존 방식 사용
      const dataSource = await this.getDataSource(dataSourceId);
      console.log('getTableData - dataSource:', JSON.stringify(dataSource, null, 2));
      console.log('getTableData - looking for table:', tableName);
      
      if (!dataSource) {
        console.warn(`Data source ${dataSourceId} not found`);
        return [];
      }

      // Check for actual stored data in the data source
      if (dataSource.config?.sampleData) {
        // Handle file-based data sources (Excel, CSV, etc.)
        if (typeof dataSource.config.sampleData === 'object') {
          // If it's an object with table names
          if (dataSource.config.sampleData[tableName]) {
            console.log('Found file data in config.sampleData');
            return dataSource.config.sampleData[tableName];
          }
          // If it's a flat array, return it
          if (Array.isArray(dataSource.config.sampleData)) {
            console.log('Found array data in config.sampleData');
            return dataSource.config.sampleData;
          }
        }
      }

      // Check if data is stored in the enhanced field (from runtime)
      if ((dataSource as any).sampleData && (dataSource as any).sampleData[tableName]) {
        console.log('Found file data in sampleData field');
        return (dataSource as any).sampleData[tableName];
      }
      
      // Handle AI result data
      if (dataSource.type === 'ai-result' && dataSource.config && dataSource.config.resultData) {
        console.log('Found AI result data');
        return Array.isArray(dataSource.config.resultData) ? dataSource.config.resultData : [dataSource.config.resultData];
      }

      console.warn(`No data found for table ${tableName} in data source ${dataSourceId}`);
      return [];
    } catch (error) {
      console.error('Error getting table data:', error);
      return [];
    }
  }

  // Fallback method for legacy data 
  private async getLegacyTableData(dataSourceId: string, tableName: string): Promise<any[]> {
    const mockData: Record<string, Record<string, any[]>> = {
      'sap-erp': {
        'customers': [
          { CUSTOMER_ID: 'CUST001', CUSTOMER_NAME: 'Acme Manufacturing Co.', COUNTRY: 'USA', CREDIT_LIMIT: 500000, CREATED_DATE: '2023-03-15' },
          { CUSTOMER_ID: 'CUST002', CUSTOMER_NAME: 'Global Tech Solutions', COUNTRY: 'Germany', CREDIT_LIMIT: 750000, CREATED_DATE: '2023-01-08' },
          { CUSTOMER_ID: 'CUST003', CUSTOMER_NAME: 'Pacific Industries Ltd.', COUNTRY: 'Japan', CREDIT_LIMIT: 1000000, CREATED_DATE: '2023-05-22' },
          { CUSTOMER_ID: 'CUST004', CUSTOMER_NAME: 'European Parts Supplier', COUNTRY: 'France', CREDIT_LIMIT: 300000, CREATED_DATE: '2023-02-10' },
          { CUSTOMER_ID: 'CUST005', CUSTOMER_NAME: 'Nordic Components AS', COUNTRY: 'Norway', CREDIT_LIMIT: 450000, CREATED_DATE: '2023-04-03' }
        ],
        'orders': [
          { ORDER_ID: 'ORD25-001', CUSTOMER_ID: 'CUST001', ORDER_DATE: '2024-01-15', TOTAL_AMOUNT: 125000, STATUS: 'Processing' },
          { ORDER_ID: 'ORD25-002', CUSTOMER_ID: 'CUST002', ORDER_DATE: '2024-01-16', TOTAL_AMOUNT: 89500, STATUS: 'Confirmed' },
          { ORDER_ID: 'ORD25-003', CUSTOMER_ID: 'CUST003', ORDER_DATE: '2024-01-17', TOTAL_AMOUNT: 245000, STATUS: 'Shipped' },
          { ORDER_ID: 'ORD25-004', CUSTOMER_ID: 'CUST004', ORDER_DATE: '2024-01-18', TOTAL_AMOUNT: 67800, STATUS: 'Delivered' },
          { ORDER_ID: 'ORD25-005', CUSTOMER_ID: 'CUST005', ORDER_DATE: '2024-01-19', TOTAL_AMOUNT: 34500, STATUS: 'Processing' }
        ]
      },
      'salesforce-crm': {
        'accounts': [
          { Id: 'ACC001', Name: 'TechCorp Solutions', Industry: 'Technology', AnnualRevenue: 25000000, NumberOfEmployees: 250 },
          { Id: 'ACC002', Name: 'Manufacturing Plus', Industry: 'Manufacturing', AnnualRevenue: 45000000, NumberOfEmployees: 580 },
          { Id: 'ACC003', Name: 'Healthcare Innovations', Industry: 'Healthcare', AnnualRevenue: 18000000, NumberOfEmployees: 180 },
          { Id: 'ACC004', Name: 'Retail Dynamics', Industry: 'Retail', AnnualRevenue: 32000000, NumberOfEmployees: 420 },
          { Id: 'ACC005', Name: 'Energy Solutions Ltd', Industry: 'Energy', AnnualRevenue: 78000000, NumberOfEmployees: 890 }
        ],
        'opportunities': [
          { Id: 'OPP001', Name: 'Q1 Software License Deal', AccountId: 'ACC001', Amount: 150000, StageName: 'Negotiation', CloseDate: '2024-03-31' },
          { Id: 'OPP002', Name: 'Manufacturing Equipment Upgrade', AccountId: 'ACC002', Amount: 850000, StageName: 'Proposal', CloseDate: '2024-04-15' },
          { Id: 'OPP003', Name: 'Healthcare System Integration', AccountId: 'ACC003', Amount: 320000, StageName: 'Closed Won', CloseDate: '2024-02-28' },
          { Id: 'OPP004', Name: 'Retail Analytics Platform', AccountId: 'ACC004', Amount: 95000, StageName: 'Prospecting', CloseDate: '2024-05-30' },
          { Id: 'OPP005', Name: 'Energy Management Solution', AccountId: 'ACC005', Amount: 1200000, StageName: 'Qualification', CloseDate: '2024-06-15' }
        ]
      },
      'aveva-pi': {
        'asset_hierarchy': [
          { AssetName: 'PetroLux Corporation', AssetPath: 'Root/Corporation', AssetType: 'Corporation', Location: 'Head Office', OperationalStatus: 'Active' },
          { AssetName: 'Upstream Operations', AssetPath: 'Root/Corporation/Business Unit', AssetType: 'Business Unit', Location: 'Operations Center', OperationalStatus: 'Active' },
          { AssetName: 'Conventional Oil', AssetPath: 'Root/Corporation/Business Unit/Asset Group', AssetType: 'Asset Group', Location: 'Field Operations', OperationalStatus: 'Active' },
          { AssetName: 'Fort McMurray Field', AssetPath: 'Root/Corporation/Business Unit/Asset Group/Field', AssetType: 'Field', Location: 'Alberta, Canada', OperationalStatus: 'Active' },
          { AssetName: 'Well Pad 001', AssetPath: 'Root/Corporation/Business Unit/Asset Group/Field/Well Pad', AssetType: 'Well Pad', Location: 'Fort McMurray', OperationalStatus: 'Active' }
        ],
        'drilling_operations': [
          { WellPadID: 'Well Pad 001', BitWeight: 25000, BlockHeight: 45, DiffPress: 1200, FlowInRate: 350, HoleDepth: 8942, HookLoad: 180000, PumpPressure: 2800, TopDriveRPM: 120, TopDriveTorque: 15000 },
          { WellPadID: 'Well Pad 002', BitWeight: 23500, BlockHeight: 42, DiffPress: 1150, FlowInRate: 340, HoleDepth: 9156, HookLoad: 175000, PumpPressure: 2750, TopDriveRPM: 115, TopDriveTorque: 14500 },
          { WellPadID: 'Well Pad 003', BitWeight: 26200, BlockHeight: 48, DiffPress: 1250, FlowInRate: 360, HoleDepth: 8755, HookLoad: 185000, PumpPressure: 2850, TopDriveRPM: 125, TopDriveTorque: 15500 },
          { WellPadID: 'Well Pad 004', BitWeight: 24800, BlockHeight: 44, DiffPress: 1180, FlowInRate: 355, HoleDepth: 9021, HookLoad: 178000, PumpPressure: 2800, TopDriveRPM: 118, TopDriveTorque: 14800 },
          { WellPadID: 'Well Pad 005', BitWeight: 25500, BlockHeight: 46, DiffPress: 1220, FlowInRate: 345, HoleDepth: 8834, HookLoad: 182000, PumpPressure: 2820, TopDriveRPM: 122, TopDriveTorque: 15200 }
        ],
        'streaming_views': [
          { ViewName: 'Cristal_Demo_Exercise', RunStatus: 'Stopped By User', ViewType: 'Analysis', RunMode: 'Manual', StartTime: '2024-01-15 08:30:00', Interval: '5min' },
          { ViewName: 'Compressor Rollup', RunStatus: 'Not Yet Published', ViewType: 'Rollup', RunMode: 'Automatic', StartTime: null, Interval: '1min' },
          { ViewName: 'Concentrator Modes', RunStatus: 'Publishing', ViewType: 'Event', RunMode: 'Automatic', StartTime: '2024-01-20 09:15:00', Interval: '30sec' },
          { ViewName: 'BSQUASSONI - LRS 2018', RunStatus: 'Not Yet Published', ViewType: 'Historical', RunMode: 'Manual', StartTime: null, Interval: '1hour' },
          { ViewName: 'BWK Test for DCP', RunStatus: 'Not Yet Published', ViewType: 'Test', RunMode: 'Manual', StartTime: null, Interval: '10min' }
        ]
      }
    };

    try {
      console.log('getTableData called with:', { dataSourceId, tableName });
      const sourceData = mockData[dataSourceId];
      console.log('Found source data keys:', Object.keys(mockData));
      
      // Handle different cases for table names and data source IDs
      if (sourceData) {
        // Try exact match first
        if (sourceData[tableName]) {
          console.log('Returning exact match data for:', tableName);
          return sourceData[tableName];
        }
        
        // Try lowercase match
        if (sourceData[tableName.toLowerCase()]) {
          console.log('Returning lowercase match data for:', tableName);
          return sourceData[tableName.toLowerCase()];
        }
        
        // Try uppercase match
        if (sourceData[tableName.toUpperCase()]) {
          console.log('Returning uppercase match data for:', tableName);
          return sourceData[tableName.toUpperCase()];
        }
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
        if (tableName === 'ASSET_HIERARCHY' || tableName === 'asset_hierarchy') {
          return await db.select().from(piAssetHierarchy);
        } else if (tableName === 'DRILLING_OPERATIONS' || tableName === 'drilling_operations') {
          return await db.select().from(piDrillingOperations);
        }
      }
      
      console.log('No data found for:', { dataSourceId, tableName });
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
    // Ensure proper timestamp handling
    const updateData = { ...updates };
    
    // Convert string dates to Date objects if needed
    if (updateData.createdAt && typeof updateData.createdAt === 'string') {
      updateData.createdAt = new Date(updateData.createdAt);
    }
    if (updateData.updatedAt && typeof updateData.updatedAt === 'string') {
      updateData.updatedAt = new Date(updateData.updatedAt);
    }
    
    const [updated] = await db
      .update(modelConfigurations)
      .set({ 
        ...updateData, 
        updatedAt: new Date()
      })
      .where(eq(modelConfigurations.id, id))
      .returning();
    return updated;
  }

  async deleteModelConfiguration(id: string): Promise<void> {
    await db.delete(modelConfigurations).where(eq(modelConfigurations.id, id));
  }

  // AI Model Result methods
  async getAiModelResults(): Promise<AiModelResult[]> {
    return await db.select().from(aiModelResults);
  }

  async getAiModelResult(id: string): Promise<AiModelResult | undefined> {
    const [result] = await db.select().from(aiModelResults).where(eq(aiModelResults.id, id));
    return result || undefined;
  }

  async getAiModelResultsByConfiguration(configurationId: string): Promise<AiModelResult[]> {
    return await db.select().from(aiModelResults).where(eq(aiModelResults.configurationId, configurationId));
  }

  async createAiModelResult(result: InsertAiModelResult): Promise<AiModelResult> {
    const newId = `result-${Date.now()}`;
    const [created] = await db
      .insert(aiModelResults)
      .values({
        id: newId,
        ...result
      })
      .returning();
    return created;
  }

  async updateAiModelResult(id: string, updates: Partial<AiModelResult>): Promise<AiModelResult> {
    const [updated] = await db
      .update(aiModelResults)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(aiModelResults.id, id))
      .returning();
    return updated;
  }

  async deleteAiModelResult(id: string): Promise<void> {
    await db.delete(aiModelResults).where(eq(aiModelResults.id, id));
  }

  async saveAiModelResult(result: any): Promise<AiModelResult> {
    // Use createAiModelResult with the provided data
    const insertData: InsertAiModelResult = {
      modelId: result.modelId,
      configurationId: result.configurationId || null,
      inputData: result.inputData || {},
      resultData: result.resultData || {},
      executedAt: result.executedAt || new Date(),
      status: result.status || 'completed',
      executionTime: result.executionTime || 0,
      error: result.error || null
    };
    
    return await this.createAiModelResult(insertData);
  }

  // AI Model Folder methods
  async getAiModelFolders(): Promise<AiModelFolder[]> {
    return await db.select().from(aiModelFolders);
  }

  async getAiModelFolder(id: string): Promise<AiModelFolder | undefined> {
    const [folder] = await db.select().from(aiModelFolders).where(eq(aiModelFolders.id, id));
    return folder || undefined;
  }

  async createAiModelFolder(folder: InsertAiModelFolder): Promise<AiModelFolder> {
    const newId = `folder-${Date.now()}`;
    const [created] = await db
      .insert(aiModelFolders)
      .values({
        id: newId,
        ...folder
      })
      .returning();
    return created;
  }

  async updateAiModelFolder(id: string, updates: Partial<AiModelFolder>): Promise<AiModelFolder> {
    const [updated] = await db
      .update(aiModelFolders)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(aiModelFolders.id, id))
      .returning();
    return updated;
  }

  async deleteAiModelFolder(id: string): Promise<void> {
    await db.delete(aiModelFolders).where(eq(aiModelFolders.id, id));
  }

  async getAiModelsByFolder(folderId: string): Promise<AiModel[]> {
    return await db.select().from(aiModels).where(eq(aiModels.folderId, folderId));
  }

  // Model Configuration Folder methods (separate from AI Model Folders)
  async getModelConfigurationFolders(): Promise<ModelConfigurationFolder[]> {
    return await db.select().from(modelConfigurationFolders);
  }

  async getModelConfigurationFolder(id: string): Promise<ModelConfigurationFolder | undefined> {
    const [folder] = await db.select().from(modelConfigurationFolders).where(eq(modelConfigurationFolders.id, id));
    return folder || undefined;
  }

  async createModelConfigurationFolder(folder: InsertModelConfigurationFolder): Promise<ModelConfigurationFolder> {
    const newId = `config-folder-${Date.now()}`;
    const [created] = await db
      .insert(modelConfigurationFolders)
      .values({
        id: newId,
        ...folder
      })
      .returning();
    return created;
  }

  async updateModelConfigurationFolder(id: string, updates: Partial<ModelConfigurationFolder>): Promise<ModelConfigurationFolder> {
    const [updated] = await db
      .update(modelConfigurationFolders)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(modelConfigurationFolders.id, id))
      .returning();
    return updated;
  }

  async deleteModelConfigurationFolder(id: string): Promise<void> {
    await db.delete(modelConfigurationFolders).where(eq(modelConfigurationFolders.id, id));
  }

  // Chat methods for AI chatbot
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [created] = await db
      .insert(chatSessions)
      .values({
        id: newId,
        ...session
      })
      .returning();
    return created;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const newId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [created] = await db
      .insert(chatMessages)
      .values({
        id: newId,
        ...message
      })
      .returning();
    return created;
  }

  async updateChatSessionActivity(sessionId: string, lastActivity?: string): Promise<void> {
    await db
      .update(chatSessions)
      .set({ 
        lastActivity: lastActivity || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(chatSessions.sessionId, sessionId));
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    // 먼저 해당 세션의 메시지들을 삭제
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
    // 그 다음 세션을 삭제
    await db.delete(chatSessions).where(eq(chatSessions.sessionId, sessionId));
  }

  async searchUploadedData(query: string): Promise<any[]> {
    // Search through all data sources and sample data for relevant information
    const dataSources = await this.getDataSources();
    const results: any[] = [];
    
    for (const dataSource of dataSources) {
      if (dataSource.config?.sampleData) {
        for (const [tableName, tableData] of Object.entries(dataSource.config.sampleData)) {
          if (Array.isArray(tableData)) {
            const filteredRows = tableData.filter((row: any) => {
              const rowText = Object.values(row).join(' ').toLowerCase();
              return rowText.includes(query.toLowerCase());
            });
            
            if (filteredRows.length > 0) {
              results.push({
                source: dataSource.name,
                table: tableName,
                data: filteredRows
              });
            }
          }
        }
      }
    }
    
    return results;
  }

  // Chat Configuration methods
  async getAllChatConfigurations(): Promise<ChatConfiguration[]> {
    try {
      return await db.select().from(chatConfigurations);
    } catch (error) {
      console.warn('ChatConfigurations table not ready, returning empty array');
      return [];
    }
  }

  async getChatConfigurations(): Promise<ChatConfiguration[]> {
    try {
      return await db.select().from(chatConfigurations);
    } catch (error) {
      console.warn('ChatConfigurations table not ready, returning empty array');
      return [];
    }
  }

  async getChatConfigurationsOptimized(): Promise<ChatConfiguration[]> {
    try {
      // uploadedFiles 필드는 매우 클 수 있으므로 기본 조회에서는 제외하고 최적화
      const configs = await db.select({
        id: chatConfigurations.id,
        name: chatConfigurations.name,
        chatflowId: chatConfigurations.chatflowId,
        apiEndpoint: chatConfigurations.apiEndpoint,
        systemPrompt: chatConfigurations.systemPrompt,
        maxTokens: chatConfigurations.maxTokens,
        temperature: chatConfigurations.temperature,
        isActive: chatConfigurations.isActive,
        createdAt: chatConfigurations.createdAt,
        updatedAt: chatConfigurations.updatedAt
      }).from(chatConfigurations);
      
      // uploadedFiles는 별도로 요약 정보만 추가
      return configs.map(config => ({
        ...config,
        uploadedFiles: [] // 빈 배열로 초기화 (프론트엔드 호환성)
      })) as ChatConfiguration[];
    } catch (error) {
      console.warn('ChatConfigurations table not ready, returning empty array');
      return [];
    }
  }

  async getChatConfiguration(id: string): Promise<ChatConfiguration | undefined> {
    try {
      const [config] = await db.select().from(chatConfigurations).where(eq(chatConfigurations.id, id));
      return config || undefined;
    } catch (error) {
      console.warn('ChatConfigurations table not ready');
      return undefined;
    }
  }

  async createChatConfiguration(config: InsertChatConfiguration): Promise<ChatConfiguration> {
    try {
      const newId = `config-${Date.now()}`;
      const [created] = await db
        .insert(chatConfigurations)
        .values({
          ...config,
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating chat configuration:', error);
      throw error;
    }
  }

  async deleteChatConfiguration(id: string): Promise<void> {
    try {
      console.log(`🗑️ 완전한 챗봇 구성 삭제 시작: ${id}`);
      
      // 1. 관련된 chat messages 삭제
      const sessions = await db.select().from(chatSessions).where(eq(chatSessions.configId, id));
      for (const session of sessions) {
        await db.delete(chatMessages).where(eq(chatMessages.sessionId, session.sessionId));
      }
      console.log(`  ✅ Chat messages 삭제 완료: ${sessions.length}개 세션`);
      
      // 2. chat_sessions 삭제
      await db.delete(chatSessions).where(eq(chatSessions.configId, id));
      console.log(`  ✅ Chat sessions 삭제 완료`);
      
      // 3. chatbot data integrations 삭제
      await db.delete(chatbotDataIntegrations).where(eq(chatbotDataIntegrations.configId, id));
      console.log(`  ✅ Data integrations 삭제 완료`);
      
      // 4. AI model files 삭제
      await db.delete(aiModelFiles).where(eq(aiModelFiles.modelId, id));
      console.log(`  ✅ AI model files 삭제 완료`);
      
      // 5. 마지막으로 chat_configurations 삭제
      await db.delete(chatConfigurations).where(eq(chatConfigurations.id, id));
      console.log(`  ✅ Chat configuration 삭제 완료: ${id}`);
      
    } catch (error) {
      console.error('❌ Error deleting chat configuration:', error);
      throw error;
    }
  }

  async updateChatConfiguration(id: string, updates: Partial<ChatConfiguration>): Promise<ChatConfiguration | null> {
    try {
      console.log(`💾 데이터베이스에 AI 모델 구성 업데이트: ${id}, 파일 ${updates.uploadedFiles?.length || 0}개`);
      
      // Get current configuration first
      const current = await this.getChatConfiguration(id);
      if (!current) {
        console.warn(`⚠️ 구성을 찾을 수 없음: ${id}`);
        return null;
      }
      
      const [updated] = await db
        .update(chatConfigurations)
        .set({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .where(eq(chatConfigurations.id, id))
        .returning();
      
      console.log(`✅ 데이터베이스 업데이트 완료: ${id}`);
      return updated;
    } catch (error) {
      console.error('Error updating chat configuration:', error);
      return null; // 에러 발생 시 null 반환
    }
  }

  async toggleChatConfigurationActive(id: string): Promise<ChatConfiguration> {
    try {
      // First get the current configuration
      const current = await this.getChatConfiguration(id);
      if (!current) {
        throw new Error(`Chat configuration with id ${id} not found`);
      }
      
      // Toggle the active status
      const newActiveStatus = current.isActive ? 0 : 1;
      
      const [updated] = await db
        .update(chatConfigurations)
        .set({
          isActive: newActiveStatus,
          updatedAt: new Date().toISOString()
        })
        .where(eq(chatConfigurations.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error toggling chat configuration active status:', error);
      throw error;
    }
  }

  async deleteChatSessionsByConfigId(configId: string): Promise<void> {
    try {
      // First delete all chat messages associated with sessions that use this config
      const sessionsToDelete = await db.select().from(chatSessions).where(eq(chatSessions.configId, configId));
      
      for (const session of sessionsToDelete) {
        await db.delete(chatMessages).where(eq(chatMessages.sessionId, session.id));
      }
      
      // Then delete the sessions themselves
      await db.delete(chatSessions).where(eq(chatSessions.configId, configId));
    } catch (error) {
      console.error('Error deleting chat sessions by config ID:', error);
      throw error;
    }
  }

  // AI Model File methods
  async getAiModelFiles(modelId: string): Promise<AiModelFile[]> {
    return await db.select().from(aiModelFiles).where(eq(aiModelFiles.modelId, modelId));
  }

  async getAiModelFile(id: string): Promise<AiModelFile | undefined> {
    const [file] = await db.select().from(aiModelFiles).where(eq(aiModelFiles.id, id));
    return file || undefined;
  }

  async createAiModelFile(file: InsertAiModelFile): Promise<AiModelFile> {
    const newId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [created] = await db
      .insert(aiModelFiles)
      .values({
        id: newId,
        ...file
      })
      .returning();
    return created;
  }

  async deleteAiModelFile(id: string): Promise<void> {
    await db.delete(aiModelFiles).where(eq(aiModelFiles.id, id));
  }

  // Chatbot Data Integration methods
  async getChatbotDataIntegrations(configId: string): Promise<ChatbotDataIntegration[]> {
    try {
      return await db.select().from(chatbotDataIntegrations).where(eq(chatbotDataIntegrations.configId, configId));
    } catch (error) {
      console.error('Error getting chatbot data integrations:', error);
      throw error;
    }
  }

  async createChatbotDataIntegration(integration: InsertChatbotDataIntegration): Promise<ChatbotDataIntegration> {
    try {
      const newId = `cdi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const [created] = await db
        .insert(chatbotDataIntegrations)
        .values({
          id: newId,
          ...integration,
          connectedAt: now,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating chatbot data integration:', error);
      throw error;
    }
  }

  async deleteChatbotDataIntegration(configId: string, dataSourceId: string): Promise<void> {
    try {
      await db.delete(chatbotDataIntegrations)
        .where(
          and(
            eq(chatbotDataIntegrations.configId, configId),
            eq(chatbotDataIntegrations.dataSourceId, dataSourceId)
          )
        );
    } catch (error) {
      console.error('Error deleting chatbot data integration:', error);
      throw error;
    }
  }

  async getChatbotDataIntegrationsByDataSource(dataSourceId: string): Promise<ChatbotDataIntegration[]> {
    try {
      return await db.select().from(chatbotDataIntegrations).where(eq(chatbotDataIntegrations.dataSourceId, dataSourceId));
    } catch (error) {
      console.error('Error getting chatbot data integrations by data source:', error);
      throw error;
    }
  }

  // 🎯 AI 모델-챗봇 구성 연결 관리 메소드들
  async getAiModelChatConfigurations(chatConfigId: string): Promise<AiModelChatConfiguration[]> {
    try {
      return await db.select().from(aiModelChatConfigurations).where(eq(aiModelChatConfigurations.chatConfigId, chatConfigId));
    } catch (error) {
      console.error('Error getting AI model chat configurations:', error);
      throw error;
    }
  }

  async createAiModelChatConfiguration(config: InsertAiModelChatConfiguration): Promise<AiModelChatConfiguration> {
    try {
      const newId = `aicc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const [created] = await db
        .insert(aiModelChatConfigurations)
        .values({
          id: newId,
          ...config,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating AI model chat configuration:', error);
      throw error;
    }
  }

  async deleteAiModelChatConfiguration(chatConfigId: string, aiModelId: string): Promise<void> {
    try {
      await db.delete(aiModelChatConfigurations)
        .where(
          and(
            eq(aiModelChatConfigurations.chatConfigId, chatConfigId),
            eq(aiModelChatConfigurations.aiModelId, aiModelId)
          )
        );
    } catch (error) {
      console.error('Error deleting AI model chat configuration:', error);
      throw error;
    }
  }

  // 🎯 AI 모델-데이터소스 직접 매핑 메소드들
  async getAiModelDataSources(aiModelId: string): Promise<AiModelDataSource[]> {
    try {
      return await db.select().from(aiModelDataSources).where(eq(aiModelDataSources.aiModelId, aiModelId));
    } catch (error) {
      console.error('Error getting AI model data sources:', error);
      throw error;
    }
  }

  async createAiModelDataSource(mapping: InsertAiModelDataSource): Promise<AiModelDataSource> {
    try {
      const newId = `amds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const [created] = await db
        .insert(aiModelDataSources)
        .values({
          id: newId,
          ...mapping,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating AI model data source mapping:', error);
      throw error;
    }
  }

  async deleteAiModelDataSource(aiModelId: string, dataSourceId: string): Promise<void> {
    try {
      await db.delete(aiModelDataSources)
        .where(
          and(
            eq(aiModelDataSources.aiModelId, aiModelId),
            eq(aiModelDataSources.dataSourceId, dataSourceId)
          )
        );
    } catch (error) {
      console.error('Error deleting AI model data source mapping:', error);
      throw error;
    }
  }

  // 🔧 누락된 updateAiModelDataSource 메서드 구현
  async updateAiModelDataSource(aiModelId: string, dataSourceId: string, updates: Partial<AiModelDataSource>): Promise<AiModelDataSource> {
    try {
      const [updated] = await db.update(aiModelDataSources)
        .set({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .where(
          and(
            eq(aiModelDataSources.aiModelId, aiModelId),
            eq(aiModelDataSources.dataSourceId, dataSourceId)
          )
        )
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error updating AI model data source mapping:', error);
      throw error;
    }
  }

  // 🎯 통합 쿼리: 챗봇 구성에 연결된 모든 AI 모델과 데이터소스 조회
  async getChatbotAiModelsAndData(chatConfigId: string): Promise<{
    aiModels: AiModel[];
    dataSources: DataSource[];
  }> {
    try {
      // 1. 챗봇에 연결된 AI 모델들 조회
      const aiModelConfigs = await this.getAiModelChatConfigurations(chatConfigId);
      const aiModels = [];
      for (const config of aiModelConfigs) {
        const model = await this.getAiModel(config.aiModelId);
        if (model) aiModels.push(model);
      }

      // 2. AI 모델들에 연결된 데이터소스들 조회
      const dataSourceIds = new Set<string>();
      for (const model of aiModels) {
        const modelDataSources = await this.getAiModelDataSources(model.id);
        modelDataSources.forEach(mds => dataSourceIds.add(mds.dataSourceId));
      }

      const dataSources = [];
      for (const dataSourceId of dataSourceIds) {
        const dataSource = await this.getDataSource(dataSourceId);
        if (dataSource) dataSources.push(dataSource);
      }

      return { aiModels, dataSources };
    } catch (error) {
      console.error('Error getting chatbot AI models and data:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();

// Initialize sample data for AI Assistant
export async function initializeSampleData() {
  try {
    // Check if sample data already exists
    const existingConfigs = await storage.getChatConfigurations();
    const existingDataSources = await storage.getDataSources();
    const existingAiModels = await storage.getAiModels();
    const existingAiModelFolders = await storage.getAiModelFolders();

    // 🎯 AI 모델 폴더 초기화 (Model Upload 기능용)
    if (existingAiModelFolders.length === 0) {
      const sampleFolders = [
        {
          name: 'Data Analysis',
          description: '데이터 분석 및 처리 모델',
          color: '#3B82F6',
          icon: '📊',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Natural Language',
          description: '자연어 처리 모델',
          color: '#10B981',
          icon: '💬',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Computer Vision',
          description: '컴퓨터 비전 모델',
          color: '#F59E0B',
          icon: '👁️',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      for (const folder of sampleFolders) {
        await storage.createAiModelFolder(folder);
      }
      console.log('✅ 샘플 AI 모델 폴더 생성 완료');
    }

    // 🎯 AI 모델 초기화 (Model Upload 기능용)
    if (existingAiModels.length === 0) {
      const folders = await storage.getAiModelFolders();
      const dataAnalysisFolder = folders.find(f => f.name === 'Data Analysis');
      const nlpFolder = folders.find(f => f.name === 'Natural Language');
      const visionFolder = folders.find(f => f.name === 'Computer Vision');

      const sampleModels = [
        {
          name: 'Bio-Manufacturing Predictor',
          description: '바이오 제조업 생산량 예측 모델',
          version: '1.0.0',
          type: 'supervised_learning',
          status: 'trained',
          language: 'python',
          framework: 'tensorflow',
          folderId: dataAnalysisFolder?.id || null,
          metrics: { accuracy: 0.92, f1_score: 0.89 },
          configPath: '/models/bio_manufacturing_predictor.json',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Equipment Anomaly Detector',
          description: '장비 이상 감지 모델',
          version: '2.1.0',
          type: 'anomaly_detection',
          status: 'trained',
          language: 'python',
          framework: 'scikit-learn',
          folderId: dataAnalysisFolder?.id || null,
          metrics: { precision: 0.94, recall: 0.87 },
          configPath: '/models/anomaly_detector.json',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Document Classifier',
          description: '문서 분류 및 태깅 모델',
          version: '1.5.0',
          type: 'text_classification',
          status: 'trained',
          language: 'python',
          framework: 'transformers',
          folderId: nlpFolder?.id || null,
          metrics: { accuracy: 0.96, macro_f1: 0.93 },
          configPath: '/models/document_classifier.json',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Quality Vision Inspector',
          description: '제품 품질 검사 비전 모델',
          version: '3.0.0',
          type: 'object_detection',
          status: 'trained',
          language: 'python',
          framework: 'pytorch',
          folderId: visionFolder?.id || null,
          metrics: { map_50: 0.91, map_75: 0.85 },
          configPath: '/models/quality_inspector.json',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      for (const model of sampleModels) {
        await storage.createAiModel(model);
      }
      console.log('✅ 샘플 AI 모델 생성 완료');
    }

    // Create sample chatbot configuration if none exists
    if (existingConfigs.length === 0) {
      const sampleConfig = {
        id: `config-${Date.now()}`,
        name: 'DXT Bio-Manufacturing AI Assistant',
        chatflowId: 'bio-manufacturing-flow',
        apiEndpoint: 'http://localhost:5000/api/chat',
        systemPrompt: '당신은 바이오 제조업 전문 AI 어시스턴트입니다. 업로드된 RawData_1M 데이터를 기반으로 정확한 답변을 제공하세요.',
        maxTokens: 2000,
        temperature: 70,
        isActive: 1,
        uploadedFiles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await storage.createChatConfiguration(sampleConfig);
      console.log('✅ 샘플 챗봇 구성 생성 완료');
    }

    // Create sample data source for RawData_1M if none exists
    if (existingDataSources.length === 0) {
      const sampleDataSource = {
        id: `ds-rawdata-${Date.now()}`,
        name: 'RawData_1M',
        type: 'Excel',
        category: 'file',
        vendor: 'Internal',
        status: 'connected',
        description: '바이오 제조업 원시 데이터 (178,564개 레코드)',
        config: {
          fileName: 'RawData_1M.xlsx',
          sheetName: 'Sheet1',
          hasHeaders: true,
          recordCount: 178564,
          dataSchema: [
            {
              table: "RawData_1M",
              fields: [
                { name: "ID", type: "INTEGER", description: "고유 식별자" },
                { name: "Asset Name", type: "VARCHAR(255)", description: "자산명" },
                { name: "TimeStamp", type: "DATETIME", description: "타임스탬프" },
                { name: "Target Production Rate", type: "VARCHAR(50)", description: "목표 생산율" },
                { name: "OEE", type: "FLOAT", description: "전체 설비 효율성" },
                { name: "Agitation", type: "FLOAT", description: "교반 수치" }
              ],
              recordCount: 178564,
              lastUpdated: new Date().toISOString()
            }
          ],
          sampleData: {
            "RawData_1M": [
              { "ID": 1, "Asset Name": "BR-50L-1", "TimeStamp": "7-4-2025 7:04:25.491 오후", "Target Production Rate": "Running", "OEE": 63.5153884887695, "Agitation": 105.640480041504 },
              { "ID": 4, "Asset Name": "BR-50L-1", "TimeStamp": "7-4-2025 7:04:25.491 오후", "Target Production Rate": "Running", "OEE": 63.5153884887695, "Agitation": 105.640480041504 },
              { "ID": 96, "Asset Name": "BR-200L-3", "TimeStamp": "7-4-2025 7:04:25.491 오후", "Target Production Rate": "Running", "OEE": 78.2456789123456, "Agitation": 98.7654321098765 }
            ]
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await storage.createDataSource(sampleDataSource);
      console.log('✅ 샘플 데이터 소스 (RawData_1M) 생성 완료');

      // Connect the sample data source to the sample chatbot configuration  
      const configs = await storage.getChatConfigurations();
      if (configs.length > 0) {
        const integration = {
          configId: configs[0].id,
          dataSourceId: sampleDataSource.id,
          connectionName: 'RawData_1M Connection',
          connectedAt: new Date().toISOString(),
          isConnected: 1
        };
        await storage.createChatbotDataIntegration(integration);
        console.log('✅ 챗봇-데이터소스 연결 완료');
      }
    }

    console.log('🎉 샘플 데이터 초기화 완료');
  } catch (error) {
    console.error('❌ 샘플 데이터 초기화 실패:', error);
  }
}
