import { 
  users, views, dataSources, dataTables, sapCustomers, sapOrders, 
  salesforceAccounts, salesforceOpportunities, piAssetHierarchy, piDrillingOperations,
  type User, type InsertUser, type View, type InsertView, type DataSource, type InsertDataSource 
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
  getDataSourceTables(dataSourceId: string): Promise<any[]>;
  getTableData(dataSourceId: string, tableName: string): Promise<any[]>;
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

  async createDataSource(dataSource: any): Promise<DataSource> {
    const newId = `ds-${Date.now()}`;
    const [created] = await db
      .insert(dataSources)
      .values({
        id: newId,
        name: dataSource.name,
        type: dataSource.type,
        category: dataSource.category,
        vendor: dataSource.vendor,
        status: 'connected',
        config: dataSource.config,
        connectionDetails: dataSource.connectionDetails || {},
        lastSync: new Date(),
        recordCount: dataSource.recordCount || 0
      })
      .returning();
    return created;
  }

  async getDataSourceTables(dataSourceId: string): Promise<any[]> {
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

  async getTableData(dataSourceId: string, tableName: string): Promise<any[]> {
    // Return actual data from the database tables
    try {
      if (dataSourceId === 'sap-erp') {
        if (tableName === 'CUSTOMERS') {
          return await db.select().from(sapCustomers);
        } else if (tableName === 'ORDERS') {
          return await db.select().from(sapOrders);
        }
      } else if (dataSourceId === 'salesforce-crm') {
        if (tableName === 'ACCOUNTS') {
          return await db.select().from(salesforceAccounts);
        } else if (tableName === 'OPPORTUNITIES') {
          return await db.select().from(salesforceOpportunities);
        }
      } else if (dataSourceId === 'aveva-pi') {
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
}

export const storage = new DatabaseStorage();
