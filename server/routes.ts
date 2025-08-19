import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertViewSchema } from "@shared/schema";
import * as XLSX from 'xlsx';

// Extend Express Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session?: {
      googleTokens?: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        expires_at: number;
      };
      googleAccount?: {
        email: string;
        name: string;
        picture: string;
      };
    };
  }
}

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

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

  // Google Sheets OAuth initialization endpoint
  app.post("/api/google-sheets/auth", async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      // Use environment variable if available, otherwise use dynamic URI
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/google-sheets/oauth/callback`;
      const scope = 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      
      // Log the redirect URI for debugging
      console.log('Google OAuth Redirect URI:', redirectUri);
      console.log('Full host header:', req.get('host'));
      console.log('Protocol:', req.protocol);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=select_account&` +
        `include_granted_scopes=true`;

      res.json({ 
        authUrl,
        redirectUri, // Include in response for debugging
        message: "Google 계정으로 로그인하여 Google Sheets에 접근 권한을 부여하세요."
      });
    } catch (error) {
      console.error("Error generating Google OAuth URL:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  // Google Sheets OAuth callback endpoint
  app.get("/api/google-sheets/oauth/callback", async (req, res) => {
    try {
      const { code, error } = req.query;

      if (error) {
        return res.send(`
          <script>
            window.opener.postMessage({type: 'google-auth-error', error: '${error}'}, '*');
            window.close();
          </script>
        `);
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/google-sheets/oauth/callback`,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return res.send(`
          <script>
            window.opener.postMessage({type: 'google-auth-error', error: '${tokenData.error}'}, '*');
            window.close();
          </script>
        `);
      }

      // Store tokens in session
      console.log('Storing Google tokens in session...', {
        hasAccessToken: !!tokenData.access_token,
        expiresIn: tokenData.expires_in,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      });
      
      req.session = req.session || {};
      req.session.googleTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + (tokenData.expires_in * 1000)
      };
      
      console.log('Session tokens stored successfully');

      // Get user account info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      const userData = await userResponse.json();
      req.session.googleAccount = {
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      };

      res.send(`
        <script>
          window.opener.postMessage({type: 'google-auth-success', account: ${JSON.stringify(req.session.googleAccount)}}, '*');
          window.close();
        </script>
      `);
    } catch (error) {
      console.error("Error in Google OAuth callback:", error);
      res.send(`
        <script>
          window.opener.postMessage({type: 'google-auth-error', error: 'oauth_failed'}, '*');
          window.close();
        </script>
      `);
    }
  });

  // Get Google account info
  app.get("/api/google-sheets/account", async (req, res) => {
    try {
      if (!req.session?.googleTokens || !req.session?.googleAccount) {
        return res.json({ success: false, message: "Not authenticated" });
      }

      res.json({
        success: true,
        account: req.session.googleAccount
      });
    } catch (error) {
      console.error("Error getting Google account:", error);
      res.status(500).json({ error: "Failed to get account info" });
    }
  });

  // List Google Sheets
  app.get("/api/google-sheets/list", async (req, res) => {
    try {
      // Prevent caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Expires', '0');
      
      console.log('=== NEW GOOGLE SHEETS REQUEST ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Checking session for Google tokens...', {
        hasSession: !!req.session,
        hasTokens: !!req.session?.googleTokens
      });
      
      if (!req.session?.googleTokens) {
        // Instead of returning error, return empty list with manual input option
        return res.status(200).json({ 
          success: true,
          sheets: [],
          error: "Google 계정이 연결되지 않았습니다.",
          helpMessage: "직접 Google Sheets URL을 입력하여 연결할 수 있습니다.",
          needsManualInput: true
        });
      }

      const tokens = req.session.googleTokens;
      
      // Check if token is expired
      if (Date.now() > tokens.expires_at) {
        return res.status(200).json({ 
          success: true,
          sheets: [],
          error: "Google 토큰이 만료되었습니다.",
          helpMessage: "직접 Google Sheets URL을 입력하여 연결할 수 있습니다.",
          needsManualInput: true
        });
      }

      // Try to use Google Drive API to list spreadsheets
      console.log('Attempting to get Google Sheets using Drive API...');
      
      try {
        const driveResponse = await fetch(
          'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=20',
          {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`
            }
          }
        );

        const driveData = await driveResponse.json();
        
        console.log('Drive API Response Status:', driveResponse.status);
        console.log('Drive API Response Data:', JSON.stringify(driveData, null, 2));

        if (driveData.error) {
          console.error('Google Drive API Error:', driveData.error);
          
          // Return helpful error message with fallback option
          return res.status(200).json({ 
            success: true,
            sheets: [],
            error: "Google Sheets API가 비활성화되어 있습니다.",
            helpMessage: "직접 Google Sheets URL을 입력하여 연결할 수 있습니다.",
            needsManualInput: true
          });
        }

        // Get sheet info for each spreadsheet
        console.log(`Processing ${driveData.files.length} spreadsheets...`);
        
        let sheets: any[] = [];
        try {
          sheets = await Promise.all(
            driveData.files.map(async (file: any) => {
              try {
                console.log(`Fetching worksheets for: ${file.name} (ID: ${file.id})`);
                const sheetsResponse = await fetch(
                  `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties.title`,
                  {
                    headers: {
                      'Authorization': `Bearer ${tokens.access_token}`
                    }
                  }
                );
                
                console.log(`Sheets API response status for ${file.name}: ${sheetsResponse.status}`);
                
                if (!sheetsResponse.ok) {
                  const errorText = await sheetsResponse.text();
                  console.error(`Sheets API error for ${file.name}:`, errorText);
                  throw new Error(`HTTP ${sheetsResponse.status}: ${errorText}`);
                }
                
                const sheetsData = await sheetsResponse.json();
                console.log(`Sheets data for ${file.name}:`, JSON.stringify(sheetsData, null, 2));
                
                const worksheetNames = sheetsData.sheets?.map((sheet: any) => sheet.properties.title) || [];
                console.log(`Worksheets found in ${file.name}:`, worksheetNames);
                
                const result = {
                  id: file.id,
                  name: file.name,
                  url: file.webViewLink,
                  sheets: worksheetNames,
                  lastModified: file.modifiedTime
                };
                
                console.log(`Final sheet object for ${file.name}:`, result);
                return result;
              } catch (error) {
                console.error(`Error fetching sheets for ${file.name}:`, error);
                return {
                  id: file.id,
                  name: file.name,
                  url: file.webViewLink,
                  sheets: [],
                  lastModified: file.modifiedTime
                };
              }
            })
          );
        } catch (promiseAllError) {
          console.error('Promise.all failed:', promiseAllError);
          // Fallback: create basic sheet objects without worksheet info
          sheets = driveData.files.map((file: any) => ({
            id: file.id,
            name: file.name,
            url: file.webViewLink,
            sheets: ['Sheet1'], // Default fallback
            lastModified: file.modifiedTime
          }));
        }

        console.log(`Successfully loaded ${sheets.length} spreadsheets from Google Drive`);
        console.log('All sheets before filtering:', JSON.stringify(sheets, null, 2));
        
        // Don't filter out sheets just because API failed - show all available sheets
        console.log(`All available sheets: ${sheets.length}`);
        console.log('All sheets data:', JSON.stringify(sheets, null, 2));
        
        // For sheets that failed to load worksheet info, add default worksheet names
        const enhancedSheets = sheets.map(sheet => ({
          ...sheet,
          sheets: sheet.sheets.length > 0 ? sheet.sheets : ['Sheet1', 'Sheet2', 'Sheet3'] // Default fallback
        }));
        
        return res.json({
          success: true,
          sheets: enhancedSheets,
          note: sheets.length > 0 ? "Google Sheets API가 제한되어 있어 워크시트 세부 정보를 가져올 수 없지만, 시트 연결은 가능합니다." : undefined
        });
      } catch (error) {
        console.error('Error accessing Google Drive API:', error);
        return res.status(500).json({ 
          error: "Google Drive API 접근 중 오류가 발생했습니다.",
          helpMessage: "Google Cloud Console에서 Google Drive API가 활성화되어 있는지 확인해주세요."
        });
      }
    } catch (error) {
      console.error("Error listing Google Sheets:", error);
      res.status(500).json({ error: "Failed to list Google Sheets" });
    }
  });

  // Get Google Sheets data preview
  app.get("/api/google-sheets/:sheetId/data", async (req, res) => {
    try {
      const { sheetId } = req.params;
      const { sheetName } = req.query;
      
      if (!req.session?.googleTokens) {
        return res.status(401).json({ error: "Not authenticated with Google" });
      }

      const tokens = req.session.googleTokens;
      
      // Check if token is expired
      if (Date.now() > tokens.expires_at) {
        return res.status(401).json({ error: "Token expired, please re-authenticate" });
      }

      const { google } = await import('googleapis');
      
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      auth.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'Bearer',
        expiry_date: tokens.expires_at
      });

      try {
        const sheets = google.sheets({ version: 'v4', auth });
        
        // First, get the spreadsheet metadata to find actual sheet names
        const spreadsheetResponse = await sheets.spreadsheets.get({
          spreadsheetId: sheetId
        });
        
        const availableSheets = spreadsheetResponse.data.sheets?.map(s => s.properties?.title) || [];
        console.log(`Available sheets in ${sheetId}:`, availableSheets);
        
        // Use the provided sheet name, or default to the first available sheet
        const targetSheetName = sheetName || availableSheets[0];
        
        if (!targetSheetName) {
          return res.json({
            success: false,
            error: "시트에 워크시트가 없습니다.",
            availableSheets
          });
        }
        
        console.log(`Fetching data from sheet: "${targetSheetName}"`);
        
        // Get the data from the specified sheet with proper escaping for sheet names with special characters
        const range = `'${targetSheetName}'!A1:Z100`; // Get first 100 rows and columns A-Z
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: range,
        });

        const rows = response.data.values || [];
        
        // Format the data for display
        const headers = rows.length > 0 ? rows[0] : [];
        const data = rows.slice(1).map((row: any[]) => {
          const rowData: any = {};
          headers.forEach((header: string, index: number) => {
            rowData[header || `Column_${index + 1}`] = row[index] || '';
          });
          return rowData;
        });

        res.json({
          success: true,
          data: {
            headers,
            rows: data,
            totalRows: data.length,
            sheetName
          }
        });

      } catch (apiError: any) {
        console.error('Google Sheets API error:', apiError);
        
        if (apiError.code === 403) {
          return res.json({
            success: false,
            error: "Google Sheets API가 비활성화되어 있습니다.",
            helpMessage: "Google Cloud Console에서 Google Sheets API를 활성화해주세요.",
            needsApiActivation: true,
            activationUrl: `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=${process.env.GOOGLE_CLIENT_ID?.split('-')[0]}`
          });
        }
        
        return res.status(500).json({
          success: false,
          error: "Google Sheets 데이터를 가져올 수 없습니다.",
          details: apiError.message
        });
      }
      
    } catch (error) {
      console.error("Error fetching Google Sheets data:", error);
      res.status(500).json({ error: "Failed to fetch sheet data" });
    }
  });

  // Data Sources API
  app.get("/api/data-sources", async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      
      // Add default dataSchema and sampleData for mock sources that don't have it
      const enhancedDataSources = dataSources.map(ds => {
        let dataSchema: any[] = [];
        let sampleData: any = {};
        
        // For Excel sources, ALWAYS use data from config first
        if ((ds.type === 'Excel' || ds.type === 'excel') && ds.config) {
          const config = ds.config as any;
          if (config.dataSchema && config.dataSchema.length > 0) {
            dataSchema = config.dataSchema;
          }
          if (config.sampleData && Object.keys(config.sampleData).length > 0) {
            sampleData = config.sampleData;
          }
        }
        
        // Fallback to defaults only if still empty AND not Excel type
        if ((!dataSchema || dataSchema.length === 0) && ds.type !== 'Excel' && ds.type !== 'excel') {
          dataSchema = getDefaultDataSchema(ds.type, ds.id);
        }
        if ((!sampleData || Object.keys(sampleData).length === 0) && ds.type !== 'Excel' && ds.type !== 'excel') {
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

  // Excel File Upload and Processing API
  app.post("/api/excel/process", async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      
      if (!fileData || !fileName) {
        return res.status(400).json({ error: "File data and name are required" });
      }

      // Decode base64 file data
      const buffer = Buffer.from(fileData, 'base64');
      
      // Read Excel file using xlsx library
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      const worksheets = workbook.SheetNames;
      const schema: Record<string, Array<{ name: string; type: string; description: string; }>> = {};
      const sampleData: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};
      const dataSchema: Array<{
        table: string;
        fields: Array<{ name: string; type: string; description: string; }>;
        recordCount: number;
      }> = [];

      worksheets.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          // Get header row (first row)
          const headers = (jsonData[0] as any[]).filter(h => h !== null && h !== undefined && h !== '');
          
          // Get sample data (first 5 rows excluding header)
          const rows = jsonData.slice(1, 6) as any[][];
          
          // Generate field definitions based on actual data
          const fields = headers.map(header => {
            // Infer type from first few data rows
            let type = 'VARCHAR(255)';
            let description = `${header} field`;
            
            // Check first few rows to infer data type
            for (let i = 1; i < Math.min(jsonData.length, 6); i++) {
              const row = jsonData[i] as any[];
              const value = row[headers.indexOf(header)];
              
              if (value !== null && value !== undefined && value !== '') {
                if (typeof value === 'number') {
                  if (Number.isInteger(value)) {
                    type = 'INTEGER';
                    description = `Numeric ${header.toLowerCase()} value`;
                  } else {
                    type = 'DECIMAL(10,2)';
                    description = `Decimal ${header.toLowerCase()} value`;
                  }
                } else if (typeof value === 'string') {
                  // Check if it looks like a date
                  if (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                    type = 'DATE';
                    description = `Date ${header.toLowerCase()} field`;
                  } else {
                    type = `VARCHAR(${Math.max(50, value.length * 2)})`;
                    description = `Text ${header.toLowerCase()} field`;
                  }
                }
                break;
              }
            }
            
            return {
              name: header,
              type,
              description
            };
          });
          
          // Convert sample data to objects
          const sampleRows = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
          
          schema[sheetName] = fields;
          sampleData[sheetName] = sampleRows;
          recordCounts[sheetName] = jsonData.length - 1; // Exclude header
          
          dataSchema.push({
            table: sheetName,
            fields,
            recordCount: jsonData.length - 1
          });
        }
      });

      res.json({
        success: true,
        data: {
          worksheets,
          schema,
          sampleData,
          recordCounts,
          dataSchema
        }
      });
      
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Failed to process Excel file" });
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
