import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertViewSchema } from "@shared/schema";

// Default data schemas for mock data sources
function getDefaultDataSchema(type: string, id: string) {
  const defaultSchemas: Record<string, any[]> = {
    'sap-erp': [
      {
        table: 'CUSTOMERS',
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
        table: 'ORDERS',
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
        table: 'ACCOUNTS',
        fields: [
          { name: 'sf_id', type: 'VARCHAR(18)', description: 'Salesforce ID' },
          { name: 'name', type: 'VARCHAR(255)', description: 'Account name' },
          { name: 'industry', type: 'VARCHAR(100)', description: 'Industry' },
          { name: 'annual_revenue', type: 'INTEGER', description: 'Annual revenue' },
          { name: 'number_of_employees', type: 'INTEGER', description: 'Number of employees' }
        ],
        recordCount: 10
      }
    ],
    'aveva-pi': [
      {
        table: 'ASSET_HIERARCHY',
        fields: [
          { name: 'asset_name', type: 'VARCHAR(255)', description: 'Asset name' },
          { name: 'asset_path', type: 'VARCHAR(500)', description: 'Asset path' },
          { name: 'asset_type', type: 'VARCHAR(100)', description: 'Asset type' },
          { name: 'location', type: 'VARCHAR(255)', description: 'Location' },
          { name: 'operational_status', type: 'VARCHAR(50)', description: 'Operational status' }
        ],
        recordCount: 10
      }
    ]
  };

  return defaultSchemas[id] || defaultSchemas[type] || [];
}

// Default sample data for mock data sources
function getDefaultSampleData(type: string, id: string) {
  const defaultSampleData: Record<string, any> = {
    'sap-erp': {
      'CUSTOMERS': [
        { customer_id: 'CUST001', customer_name: 'Acme Manufacturing Co.', country: 'USA', credit_limit: 500000, created_date: '2023-03-15' },
        { customer_id: 'CUST002', customer_name: 'Global Tech Solutions', country: 'Germany', credit_limit: 750000, created_date: '2023-01-08' },
        { customer_id: 'CUST003', customer_name: 'Innovation Ltd.', country: 'UK', credit_limit: 300000, created_date: '2023-05-22' }
      ],
      'ORDERS': [
        { order_id: 'ORD001', customer_id: 'CUST001', order_date: '2024-01-15', total_amount: 25000, status: 'Completed' },
        { order_id: 'ORD002', customer_id: 'CUST002', order_date: '2024-01-16', total_amount: 42000, status: 'Processing' },
        { order_id: 'ORD003', customer_id: 'CUST003', order_date: '2024-01-17', total_amount: 18000, status: 'Shipped' }
      ]
    },
    'salesforce-crm': {
      'ACCOUNTS': [
        { sf_id: 'SF001', name: 'Enterprise Corp', industry: 'Technology', annual_revenue: 5000000, number_of_employees: 250 },
        { sf_id: 'SF002', name: 'Global Manufacturing', industry: 'Manufacturing', annual_revenue: 12000000, number_of_employees: 800 },
        { sf_id: 'SF003', name: 'Digital Solutions Inc', industry: 'Software', annual_revenue: 3500000, number_of_employees: 150 }
      ]
    },
    'aveva-pi': {
      'ASSET_HIERARCHY': [
        { asset_name: 'Drilling Platform Alpha', asset_path: '/Oil_Gas/Offshore/Platform_Alpha', asset_type: 'Drilling Platform', location: 'North Sea', operational_status: 'Active' },
        { asset_name: 'Production Unit Beta', asset_path: '/Oil_Gas/Onshore/Unit_Beta', asset_type: 'Production Unit', location: 'Texas', operational_status: 'Active' },
        { asset_name: 'Refinery Gamma', asset_path: '/Oil_Gas/Refinery/Gamma', asset_type: 'Refinery', location: 'Louisiana', operational_status: 'Maintenance' }
      ]
    }
  };

  return defaultSampleData[id] || defaultSampleData[type] || {};
}

// Microsoft Graph API helper functions
async function exchangeCodeForToken(code: string, dataSourceId: string, req: any) {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/data-sources/${dataSourceId}/oauth/callback`;

    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error_description || data.error };
    }

    const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();

    return {
      success: true,
      credentials: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        scope: data.scope,
        expiresAt
      }
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return { success: false, error: 'Failed to exchange authorization code' };
  }
}

async function getExcelFilesFromGraph(accessToken: string) {
  try {
    // Get files from OneDrive
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children?$filter=endsWith(name,\'.xlsx\') or endsWith(name,\'.xls\')', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.value.map((file: any) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      lastModified: file.lastModifiedDateTime,
      downloadUrl: file['@microsoft.graph.downloadUrl'],
      webUrl: file.webUrl
    }));
  } catch (error) {
    console.error('Error fetching Excel files from Graph:', error);
    throw error;
  }
}

async function getExcelFileData(accessToken: string, fileId: string) {
  try {
    // Get workbook metadata
    const workbookResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!workbookResponse.ok) {
      throw new Error(`Failed to get workbook: ${workbookResponse.status}`);
    }

    // Get worksheets
    const worksheetsResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const worksheetsData = await worksheetsResponse.json();
    
    const sheets = [];
    for (const sheet of worksheetsData.value) {
      // Get sheet data (first 100 rows for preview)
      const rangeResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets/${sheet.id}/range(address='A1:Z100')`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (rangeResponse.ok) {
        const rangeData = await rangeResponse.json();
        sheets.push({
          id: sheet.id,
          name: sheet.name,
          data: rangeData.values || [],
          rowCount: rangeData.rowCount || 0,
          columnCount: rangeData.columnCount || 0
        });
      }
    }

    return {
      fileId,
      sheets,
      message: `${sheets.length}개의 워크시트를 로드했습니다.`
    };
  } catch (error) {
    console.error('Error fetching Excel file data:', error);
    throw error;
  }
}

// Microsoft Graph API configuration
const MICROSOFT_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
  scope: 'Files.Read Sites.Read.All User.Read',
  authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  graphApiUrl: 'https://graph.microsoft.com/v1.0'
};

// In-memory token storage (in production, use a proper database or cache)
const tokenStorage = new Map<string, {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  clientId: string;
}>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Microsoft Excel OAuth 2.0 API Routes
  
  // Get authorization URL
  app.post("/api/microsoft-excel/authorize", async (req, res) => {
    try {
      const { clientId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ error: "Client ID is required" });
      }

      const state = Math.random().toString(36).substring(7);
      const authUrl = `${MICROSOFT_CONFIG.authorizeUrl}?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(MICROSOFT_CONFIG.redirectUri)}&` +
        `scope=${encodeURIComponent(MICROSOFT_CONFIG.scope)}&` +
        `state=${state}`;

      res.json({ authUrl, state });
    } catch (error) {
      console.error("Error creating authorization URL:", error);
      res.status(500).json({ error: "Failed to create authorization URL" });
    }
  });

  // Handle OAuth callback
  app.get("/auth/microsoft/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.status(400).send(`Authorization failed: ${error}`);
      }

      if (!code) {
        return res.status(400).send("Authorization code not provided");
      }

      // Exchange code for token
      const tokenResponse = await fetch(MICROSOFT_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: MICROSOFT_CONFIG.clientId,
          client_secret: MICROSOFT_CONFIG.clientSecret,
          code: code as string,
          redirect_uri: MICROSOFT_CONFIG.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Store token (in production, use proper storage)
      const sessionId = Math.random().toString(36).substring(7);
      tokenStorage.set(sessionId, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        clientId: MICROSOFT_CONFIG.clientId
      });

      // Set session cookie
      res.cookie('microsoft_session', sessionId, { 
        httpOnly: true, 
        secure: false, // Set to true in production with HTTPS
        maxAge: tokenData.expires_in * 1000 
      });

      res.send(`
        <html>
          <body>
            <h2>Authorization Successful!</h2>
            <p>You can now close this window and return to the application.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      res.status(500).send("Failed to complete authorization");
    }
  });

  // Check connection status
  app.get("/api/microsoft-excel/status", async (req, res) => {
    try {
      const sessionId = req.cookies?.microsoft_session;
      
      if (!sessionId || !tokenStorage.has(sessionId)) {
        return res.json({ connected: false });
      }

      const tokenInfo = tokenStorage.get(sessionId)!;
      
      if (Date.now() > tokenInfo.expiresAt) {
        tokenStorage.delete(sessionId);
        return res.json({ connected: false, reason: 'Token expired' });
      }

      res.json({
        connected: true,
        accessToken: tokenInfo.accessToken,
        expiresAt: new Date(tokenInfo.expiresAt).toISOString()
      });
    } catch (error) {
      console.error("Error checking status:", error);
      res.status(500).json({ error: "Failed to check connection status" });
    }
  });

  // Get Excel files from OneDrive
  app.get("/api/microsoft-excel/files", async (req, res) => {
    try {
      const sessionId = req.cookies?.microsoft_session;
      
      if (!sessionId || !tokenStorage.has(sessionId)) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const tokenInfo = tokenStorage.get(sessionId)!;
      
      if (Date.now() > tokenInfo.expiresAt) {
        tokenStorage.delete(sessionId);
        return res.status(401).json({ error: "Token expired" });
      }

      // Search for Excel files in OneDrive
      const searchResponse = await fetch(
        `${MICROSOFT_CONFIG.graphApiUrl}/me/drive/search(q='.xlsx OR .xls')`,
        {
          headers: {
            'Authorization': `Bearer ${tokenInfo.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`Failed to search files: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      const excelFiles = searchData.value
        .filter((file: any) => file.file && (
          file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        ))
        .map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          lastModified: file.lastModifiedDateTime,
          webUrl: file.webUrl,
          downloadUrl: file['@microsoft.graph.downloadUrl']
        }));

      res.json(excelFiles);
    } catch (error) {
      console.error("Error fetching Excel files:", error);
      res.status(500).json({ error: "Failed to fetch Excel files" });
    }
  });

  // Get Excel file data (worksheets and preview)
  app.get("/api/microsoft-excel/files/:fileId/data", async (req, res) => {
    try {
      const { fileId } = req.params;
      const sessionId = req.cookies?.microsoft_session;
      
      if (!sessionId || !tokenStorage.has(sessionId)) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const tokenInfo = tokenStorage.get(sessionId)!;
      
      if (Date.now() > tokenInfo.expiresAt) {
        tokenStorage.delete(sessionId);
        return res.status(401).json({ error: "Token expired" });
      }

      const fileData = await getExcelFileData(tokenInfo.accessToken, fileId);
      res.json(fileData);
    } catch (error) {
      console.error("Error fetching Excel file data:", error);
      res.status(500).json({ error: "Failed to fetch Excel file data" });
    }
  });

  // Disconnect Microsoft Excel
  app.post("/api/microsoft-excel/disconnect", async (req, res) => {
    try {
      const sessionId = req.cookies?.microsoft_session;
      
      if (sessionId && tokenStorage.has(sessionId)) {
        tokenStorage.delete(sessionId);
      }

      res.clearCookie('microsoft_session');
      res.json({ success: true, message: "Disconnected from Microsoft Excel" });
    } catch (error) {
      console.error("Error disconnecting:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // Views API
  app.get("/api/views", async (req, res) => {
    try {
      const views = await storage.getViews();
      res.json(views);
    } catch (error) {
      console.error("Error fetching views:", error);
      res.status(500).json({ error: "Failed to fetch views" });
    }
  });

  app.get("/api/views/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const view = await storage.getView(id);
      if (!view) {
        return res.status(404).json({ error: "View not found" });
      }
      res.json(view);
    } catch (error) {
      console.error("Error fetching view:", error);
      res.status(500).json({ error: "Failed to fetch view" });
    }
  });

  app.post("/api/views", async (req, res) => {
    try {
      const validatedData = insertViewSchema.parse(req.body);
      const view = await storage.createView(validatedData);
      res.status(201).json(view);
    } catch (error) {
      console.error("Error creating view:", error);
      res.status(400).json({ error: "Invalid view data" });
    }
  });

  app.put("/api/views/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const view = await storage.updateView(id, req.body);
      res.json(view);
    } catch (error) {
      console.error("Error updating view:", error);
      res.status(500).json({ error: "Failed to update view" });
    }
  });

  app.delete("/api/views/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteView(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting view:", error);
      res.status(500).json({ error: "Failed to delete view" });
    }
  });

  // Data Sources API
  app.get("/api/data-sources", async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      
      // Add default dataSchema and sampleData for mock sources that don't have it
      const enhancedDataSources = dataSources.map(ds => {
        let dataSchema = ds.dataSchema;
        let sampleData = ds.sampleData;
        
        // For Excel sources, try to get data from config
        if (ds.type === 'Excel' && ds.config) {
          const config = ds.config as any;
          if (config.dataSchema) {
            dataSchema = config.dataSchema;
          }
          if (config.sampleData) {
            sampleData = config.sampleData;
          }
        }
        
        // Fallback to defaults if still not found
        if (!dataSchema) {
          dataSchema = getDefaultDataSchema(ds.type, ds.id);
        }
        if (!sampleData) {
          sampleData = getDefaultSampleData(ds.type, ds.id);
        }
        
        return {
          ...ds,
          dataSchema,
          sampleData
        };
      });
      
      res.json(enhancedDataSources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ error: "Failed to fetch data sources" });
    }
  });

  app.post("/api/data-sources", async (req, res) => {
    try {
      const dataSource = await storage.createDataSource(req.body);
      res.status(201).json(dataSource);
    } catch (error) {
      console.error("Error creating data source:", error);
      res.status(400).json({ error: "Failed to create data source" });
    }
  });

  app.delete("/api/data-sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDataSource(id);
      res.status(200).json({ message: "Data source deleted successfully" });
    } catch (error) {
      console.error("Error deleting data source:", error);
      res.status(500).json({ error: "Failed to delete data source" });
    }
  });

  // Microsoft Excel/OneDrive OAuth 2.0 Integration
  app.post("/api/data-sources/:id/oauth/authorize", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource || dataSource.type !== 'excel') {
        return res.status(404).json({ error: "Excel data source not found" });
      }

      // Microsoft Graph OAuth 2.0 authorization URL
      const clientId = req.body.clientId || process.env.MICROSOFT_CLIENT_ID;
      const redirectUri = req.body.redirectUri || `${req.protocol}://${req.get('host')}/api/data-sources/${id}/oauth/callback`;
      const scope = 'Files.Read Files.Read.All Sites.Read.All User.Read offline_access';
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_mode=query&` +
        `state=${id}`;

      res.json({ 
        authUrl,
        message: "Microsoft 계정으로 로그인하여 Excel 파일에 접근 권한을 부여하세요.",
        clientId,
        scope
      });
    } catch (error) {
      console.error("Error generating OAuth URL:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  app.get("/api/data-sources/:id/oauth/callback", async (req, res) => {
    try {
      const { id } = req.params;
      const { code, state, error } = req.query;

      if (error) {
        return res.status(400).json({ error: `OAuth error: ${error}` });
      }

      if (state !== id) {
        return res.status(400).json({ error: "Invalid state parameter" });
      }

      const dataSource = await storage.getDataSource(id);
      if (!dataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }

      // Exchange authorization code for access token
      const tokenResponse = await exchangeCodeForToken(code as string, id, req);
      
      if (tokenResponse.success && tokenResponse.credentials) {
        // Update data source with credentials
        await storage.updateDataSource(id, {
          status: 'connected',
          credentials: tokenResponse.credentials,
          lastSync: new Date()
        });

        res.json({
          success: true,
          message: "Microsoft Excel 연결이 성공적으로 완료되었습니다.",
          expiresAt: tokenResponse.credentials.expiresAt
        });
      } else {
        res.status(400).json({ error: tokenResponse.error });
      }
    } catch (error) {
      console.error("Error in OAuth callback:", error);
      res.status(500).json({ error: "Failed to complete OAuth flow" });
    }
  });

  // Get Excel files from OneDrive/SharePoint
  app.get("/api/data-sources/:id/excel-files", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource || dataSource.type !== 'excel') {
        return res.status(404).json({ error: "Excel data source not found" });
      }

      if (dataSource.status !== 'connected' || !dataSource.credentials?.accessToken) {
        return res.status(401).json({ error: "Data source not connected. Please authorize first." });
      }

      // Get files from Microsoft Graph API
      const files = await getExcelFilesFromGraph(dataSource.credentials.accessToken!);
      
      res.json({
        files,
        message: `${files.length}개의 Excel 파일을 찾았습니다.`
      });
    } catch (error) {
      console.error("Error fetching Excel files:", error);
      res.status(500).json({ error: "Failed to fetch Excel files" });
    }
  });

  // Get specific Excel file data
  app.get("/api/data-sources/:id/excel-files/:fileId", async (req, res) => {
    try {
      const { id, fileId } = req.params;
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource || dataSource.status !== 'connected') {
        return res.status(401).json({ error: "Data source not connected" });
      }

      const fileData = await getExcelFileData(dataSource.credentials?.accessToken!, fileId);
      
      res.json(fileData);
    } catch (error) {
      console.error("Error fetching Excel file data:", error);
      res.status(500).json({ error: "Failed to fetch Excel file data" });
    }
  });

  // Data Source Tables and Data API
  app.get("/api/data-sources/:id/tables", async (req, res) => {
    try {
      const { id } = req.params;
      const tables = await storage.getDataSourceTables(id);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching data source tables:", error);
      res.status(500).json({ error: "Failed to fetch tables" });
    }
  });

  app.get("/api/data-sources/:id/tables/:tableName/data", async (req, res) => {
    try {
      const { id, tableName } = req.params;
      const data = await storage.getTableData(id, tableName);
      res.json(data);
    } catch (error) {
      console.error("Error fetching table data:", error);
      res.status(500).json({ error: "Failed to fetch table data" });
    }
  });

  // Data Source Schema & Sample Data API
  app.get("/api/data-sources/:id/schema", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Return schema based on actual database tables
      const dataSourceSchemas = {
        'aveva-pi': {
          tables: [
            {
              name: 'PI_ASSET_HIERARCHY',
              recordCount: 15420,
              description: 'Real-time equipment measurements',
              fields: [
                { name: 'MEASUREMENT_ID', type: 'VARCHAR(10)', description: 'Unique measurement identifier' },
                { name: 'EQUIPMENT_ID', type: 'VARCHAR(20)', description: 'Equipment identifier' },
                { name: 'TEMPERATURE', type: 'DECIMAL(5,2)', description: 'Temperature readings in Celsius' },
                { name: 'PRESSURE', type: 'DECIMAL(7,2)', description: 'Pressure measurements in PSI' },
                { name: 'FLOW_RATE', type: 'DECIMAL(6,2)', description: 'Flow rate in L/min' },
                { name: 'TIMESTAMP', type: 'DATETIME', description: 'Measurement timestamp' },
                { name: 'STATUS', type: 'VARCHAR(20)', description: 'Equipment status' }
              ],
              sampleData: [
                {
                  MEASUREMENT_ID: 'M001',
                  EQUIPMENT_ID: 'EQ-DRILL-001',
                  TEMPERATURE: 23.5,
                  PRESSURE: 1013.25,
                  FLOW_RATE: 45.2,
                  TIMESTAMP: '2025-01-15 09:30:00',
                  STATUS: 'Running'
                },
                {
                  MEASUREMENT_ID: 'M002', 
                  EQUIPMENT_ID: 'EQ-DRILL-002',
                  TEMPERATURE: 24.1,
                  PRESSURE: 1014.2,
                  FLOW_RATE: 46.1,
                  TIMESTAMP: '2025-01-15 09:31:00',
                  STATUS: 'Running'
                },
                {
                  MEASUREMENT_ID: 'M003',
                  EQUIPMENT_ID: 'EQ-DRILL-003', 
                  TEMPERATURE: 22.8,
                  PRESSURE: 1012.8,
                  FLOW_RATE: 44.8,
                  TIMESTAMP: '2025-01-15 09:32:00',
                  STATUS: 'Idle'
                }
              ]
            }
          ]
        },
        'sap-erp': {
          tables: [
            {
              name: 'CUSTOMERS',
              recordCount: 15420,
              description: 'Customer information and accounts',
              fields: [
                { name: 'CUSTOMER_ID', type: 'VARCHAR(10)', description: 'Unique customer identifier' },
                { name: 'CUSTOMER_NAME', type: 'VARCHAR(100)', description: 'Customer company name' },
                { name: 'COUNTRY', type: 'VARCHAR(50)', description: 'Customer country' },
                { name: 'CREDIT_LIMIT', type: 'DECIMAL(15,2)', description: 'Customer credit limit' },
                { name: 'CREATED_DATE', type: 'DATE', description: 'Account creation date' }
              ],
              sampleData: [
                {
                  CUSTOMER_ID: 'CUST001',
                  CUSTOMER_NAME: 'Acme Manufacturing Co.',
                  COUNTRY: 'USA',
                  CREDIT_LIMIT: 500000,
                  CREATED_DATE: '2023-03-15'
                },
                {
                  CUSTOMER_ID: 'CUST002',
                  CUSTOMER_NAME: 'Global Tech Solutions',
                  COUNTRY: 'Germany', 
                  CREDIT_LIMIT: 750000,
                  CREATED_DATE: '2023-01-08'
                },
                {
                  CUSTOMER_ID: 'CUST003',
                  CUSTOMER_NAME: 'Innovation Ltd.',
                  COUNTRY: 'UK',
                  CREDIT_LIMIT: 300000,
                  CREATED_DATE: '2023-05-22'
                }
              ]
            }
          ]
        },
        'oracle-db': {
          tables: [
            {
              name: 'USER_SESSIONS',
              recordCount: 8745,
              description: 'User login and session data',
              fields: [
                { name: 'SESSION_ID', type: 'VARCHAR(20)', description: 'Unique session identifier' },
                { name: 'USER_ID', type: 'VARCHAR(10)', description: 'User identifier' },
                { name: 'LOGIN_TIME', type: 'DATETIME', description: 'Login timestamp' },
                { name: 'SESSION_DURATION', type: 'INTEGER', description: 'Session length in minutes' },
                { name: 'PAGE_VIEWS', type: 'INTEGER', description: 'Number of page views' },
                { name: 'USER_TYPE', type: 'VARCHAR(20)', description: 'User category' }
              ],
              sampleData: [
                {
                  SESSION_ID: 'S2025011509001',
                  USER_ID: 'U001',
                  LOGIN_TIME: '2025-01-15 09:00:00',
                  SESSION_DURATION: 45,
                  PAGE_VIEWS: 12,
                  USER_TYPE: 'Admin'
                },
                {
                  SESSION_ID: 'S2025011509002',
                  USER_ID: 'U002', 
                  LOGIN_TIME: '2025-01-15 09:05:00',
                  SESSION_DURATION: 62,
                  PAGE_VIEWS: 8,
                  USER_TYPE: 'Manager'
                },
                {
                  SESSION_ID: 'S2025011509003',
                  USER_ID: 'U003',
                  LOGIN_TIME: '2025-01-15 09:10:00', 
                  SESSION_DURATION: 38,
                  PAGE_VIEWS: 15,
                  USER_TYPE: 'User'
                }
              ]
            }
          ]
        },
        'salesforce': {
          tables: [
            {
              name: 'LEADS',
              recordCount: 3267,
              description: 'Sales leads and prospects',
              fields: [
                { name: 'LEAD_ID', type: 'VARCHAR(15)', description: 'Lead identifier' },
                { name: 'COMPANY', type: 'VARCHAR(100)', description: 'Company name' },
                { name: 'LEAD_SCORE', type: 'INTEGER', description: 'Lead qualification score' },
                { name: 'CREATED_DATE', type: 'DATE', description: 'Lead creation date' },
                { name: 'STAGE', type: 'VARCHAR(30)', description: 'Sales stage' },
                { name: 'INDUSTRY', type: 'VARCHAR(50)', description: 'Industry sector' }
              ],
              sampleData: [
                {
                  LEAD_ID: 'L20250115001',
                  COMPANY: 'Tech Corp',
                  LEAD_SCORE: 85,
                  CREATED_DATE: '2025-01-15',
                  STAGE: 'Qualified',
                  INDUSTRY: 'Technology'
                },
                {
                  LEAD_ID: 'L20250115002',
                  COMPANY: 'Innovation Ltd',
                  LEAD_SCORE: 92,
                  CREATED_DATE: '2025-01-14', 
                  STAGE: 'Proposal',
                  INDUSTRY: 'Healthcare'
                },
                {
                  LEAD_ID: 'L20250115003',
                  COMPANY: 'Future Inc',
                  LEAD_SCORE: 76,
                  CREATED_DATE: '2025-01-13',
                  STAGE: 'Negotiation',
                  INDUSTRY: 'Finance'
                }
              ]
            }
          ]
        }
      };

      const schema = dataSourceSchemas[id as keyof typeof dataSourceSchemas];
      if (!schema) {
        return res.status(404).json({ error: "Data source not found" });
      }

      res.json(schema);
    } catch (error) {
      console.error("Error fetching data source schema:", error);
      res.status(500).json({ error: "Failed to fetch data source schema" });
    }
  });

  // Data sources list endpoint
  app.get('/api/data-sources', (req, res) => {
    try {
      const dataSources = [
        { id: 'aveva-pi', name: 'AVEVA PI System', type: 'Industrial Data', status: 'connected' },
        { id: 'sap-erp', name: 'SAP ERP', type: 'Enterprise Resource Planning', status: 'connected' },
        { id: 'oracle-db', name: 'Oracle Database', type: 'Database', status: 'connected' },
        { id: 'salesforce', name: 'Salesforce CRM', type: 'Customer Relationship Management', status: 'connected' }
      ];
      res.json(dataSources);
    } catch (error) {
      console.error('Error getting data sources:', error);
      res.status(500).json({ error: 'Failed to get data sources' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
