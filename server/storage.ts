import { 
  type User, 
  type InsertUser,
  type DataSource,
  type InsertDataSource,
  type DataMapping,
  type InsertDataMapping,
  type Workflow,
  type InsertWorkflow,
  type AiModel,
  type InsertAiModel,
  type BoiConfiguration,
  type InsertBoiConfiguration
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Data Sources
  getDataSources(): Promise<DataSource[]>;
  getDataSource(id: string): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: string): Promise<boolean>;

  // Data Mappings
  getDataMappings(dataSourceId?: string): Promise<DataMapping[]>;
  createDataMapping(mapping: InsertDataMapping): Promise<DataMapping>;
  deleteDataMapping(id: string): Promise<boolean>;

  // Workflows
  getWorkflows(): Promise<Workflow[]>;
  getWorkflow(id: string): Promise<Workflow | undefined>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined>;
  deleteWorkflow(id: string): Promise<boolean>;

  // AI Models
  getAiModels(): Promise<AiModel[]>;
  getAiModel(id: string): Promise<AiModel | undefined>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel | undefined>;
  deleteAiModel(id: string): Promise<boolean>;

  // BOI Configurations
  getBoiConfigurations(): Promise<BoiConfiguration[]>;
  getBoiConfiguration(id: string): Promise<BoiConfiguration | undefined>;
  createBoiConfiguration(config: InsertBoiConfiguration): Promise<BoiConfiguration>;
  updateBoiConfiguration(id: string, updates: Partial<BoiConfiguration>): Promise<BoiConfiguration | undefined>;
  deleteBoiConfiguration(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private dataSources: Map<string, DataSource>;
  private dataMappings: Map<string, DataMapping>;
  private workflows: Map<string, Workflow>;
  private aiModels: Map<string, AiModel>;
  private boiConfigurations: Map<string, BoiConfiguration>;

  constructor() {
    this.users = new Map();
    this.dataSources = new Map();
    this.dataMappings = new Map();
    this.workflows = new Map();
    this.aiModels = new Map();
    this.boiConfigurations = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Data Sources
  async getDataSources(): Promise<DataSource[]> {
    return Array.from(this.dataSources.values());
  }

  async getDataSource(id: string): Promise<DataSource | undefined> {
    return this.dataSources.get(id);
  }

  async createDataSource(insertDataSource: InsertDataSource): Promise<DataSource> {
    const id = randomUUID();
    const dataSource: DataSource = {
      ...insertDataSource,
      id,
      createdAt: new Date(),
      lastSync: null,
      status: insertDataSource.status || 'disconnected',
    };
    this.dataSources.set(id, dataSource);
    return dataSource;
  }

  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource | undefined> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) return undefined;
    
    const updated = { ...dataSource, ...updates };
    this.dataSources.set(id, updated);
    return updated;
  }

  async deleteDataSource(id: string): Promise<boolean> {
    return this.dataSources.delete(id);
  }

  // Data Mappings
  async getDataMappings(dataSourceId?: string): Promise<DataMapping[]> {
    const mappings = Array.from(this.dataMappings.values());
    if (dataSourceId) {
      return mappings.filter(m => m.dataSourceId === dataSourceId);
    }
    return mappings;
  }

  async createDataMapping(insertMapping: InsertDataMapping): Promise<DataMapping> {
    const id = randomUUID();
    const mapping: DataMapping = {
      ...insertMapping,
      id,
      createdAt: new Date(),
      transformationRules: insertMapping.transformationRules || null,
    };
    this.dataMappings.set(id, mapping);
    return mapping;
  }

  async deleteDataMapping(id: string): Promise<boolean> {
    return this.dataMappings.delete(id);
  }

  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return this.workflows.get(id);
  }

  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const id = randomUUID();
    const workflow: Workflow = {
      ...insertWorkflow,
      id,
      createdAt: new Date(),
      lastRun: null,
      description: insertWorkflow.description || null,
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;
    
    const updated = { ...workflow, ...updates };
    this.workflows.set(id, updated);
    return updated;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    return this.workflows.delete(id);
  }

  // AI Models
  async getAiModels(): Promise<AiModel[]> {
    return Array.from(this.aiModels.values());
  }

  async getAiModel(id: string): Promise<AiModel | undefined> {
    return this.aiModels.get(id);
  }

  async createAiModel(insertModel: InsertAiModel): Promise<AiModel> {
    const id = randomUUID();
    const model: AiModel = {
      ...insertModel,
      id,
      createdAt: new Date(),
      description: insertModel.description || null,
      filePath: insertModel.filePath || null,
      performanceMetrics: insertModel.performanceMetrics || null,
      isActive: insertModel.isActive || false,
    };
    this.aiModels.set(id, model);
    return model;
  }

  async updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel | undefined> {
    const model = this.aiModels.get(id);
    if (!model) return undefined;
    
    const updated = { ...model, ...updates };
    this.aiModels.set(id, updated);
    return updated;
  }

  async deleteAiModel(id: string): Promise<boolean> {
    return this.aiModels.delete(id);
  }

  // BOI Configurations
  async getBoiConfigurations(): Promise<BoiConfiguration[]> {
    return Array.from(this.boiConfigurations.values());
  }

  async getBoiConfiguration(id: string): Promise<BoiConfiguration | undefined> {
    return this.boiConfigurations.get(id);
  }

  async createBoiConfiguration(insertConfig: InsertBoiConfiguration): Promise<BoiConfiguration> {
    const id = randomUUID();
    const config: BoiConfiguration = {
      ...insertConfig,
      id,
      createdAt: new Date(),
      batchSize: insertConfig.batchSize || 100,
      processingInterval: insertConfig.processingInterval || 'realtime',
      transformationRules: insertConfig.transformationRules || null,
      isActive: insertConfig.isActive || false,
    };
    this.boiConfigurations.set(id, config);
    return config;
  }

  async updateBoiConfiguration(id: string, updates: Partial<BoiConfiguration>): Promise<BoiConfiguration | undefined> {
    const config = this.boiConfigurations.get(id);
    if (!config) return undefined;
    
    const updated = { ...config, ...updates };
    this.boiConfigurations.set(id, updated);
    return updated;
  }

  async deleteBoiConfiguration(id: string): Promise<boolean> {
    return this.boiConfigurations.delete(id);
  }
}

export const storage = new MemStorage();
