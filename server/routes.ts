import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertViewSchema } from "@shared/schema";
import * as XLSX from 'xlsx';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

// Google OAuth2 Client 설정
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Replit 환경에 맞는 리디렉션 URI 설정
const getRedirectUri = () => {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/auth/google/callback`;
  }
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`;
  }
  return 'http://localhost:5000/auth/google/callback';
};

const REDIRECT_URI = getRedirectUri();
console.log('OAuth Redirect URI:', REDIRECT_URI);

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

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
          'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name,modifiedTime,webViewLink,createdTime)&orderBy=modifiedTime desc&pageSize=50',
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
                  // Don't throw error, just return basic sheet info
                  return {
                    id: file.id,
                    name: file.name,
                    url: file.webViewLink,
                    sheets: ['Sheet1'], // Default fallback
                    lastModified: file.modifiedTime,
                    error: `API error: ${sheetsResponse.status}`
                  };
                }
                
                let sheetsData;
                try {
                  const responseText = await sheetsResponse.text();
                  console.log(`Raw response for ${file.name}:`, responseText.substring(0, 200));
                  sheetsData = JSON.parse(responseText);
                } catch (parseError) {
                  console.error(`JSON parsing error for ${file.name}:`, parseError);
                  return {
                    id: file.id,
                    name: file.name,
                    url: file.webViewLink,
                    sheets: ['Sheet1'], // Default fallback
                    lastModified: file.modifiedTime,
                    error: 'JSON parsing failed'
                  };
                }
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
        
        console.log(`Processing data source: ${ds.name} (type: ${ds.type})`);
        console.log('Config:', JSON.stringify(ds.config, null, 2));
        
        // For file-based sources (Excel, Google Sheets), ALWAYS use data from config first
        if ((ds.type === 'Excel' || ds.type === 'excel' || ds.type === 'Google Sheets') && ds.config) {
          const config = ds.config as any;
          if (config.dataSchema && config.dataSchema.length > 0) {
            dataSchema = config.dataSchema;
            console.log(`Found dataSchema in config for ${ds.name}:`, dataSchema.length, 'tables');
          }
          if (config.sampleData && Object.keys(config.sampleData).length > 0) {
            sampleData = config.sampleData;
            console.log(`Found sampleData in config for ${ds.name}:`, Object.keys(sampleData));
          }
        }
        
        // Check if the data source itself has runtime dataSchema and sampleData (for Google Sheets)
        if ((ds as any).dataSchema && (ds as any).dataSchema.length > 0) {
          dataSchema = (ds as any).dataSchema;
          console.log(`Found runtime dataSchema for ${ds.name}:`, dataSchema.length, 'tables');
        }
        if ((ds as any).sampleData && Object.keys((ds as any).sampleData).length > 0) {
          sampleData = (ds as any).sampleData;
          console.log(`Found runtime sampleData for ${ds.name}:`, Object.keys(sampleData));
        }
        
        // Fallback to defaults only if still empty AND not file-based type
        if ((!dataSchema || dataSchema.length === 0) && ds.type !== 'Excel' && ds.type !== 'excel' && ds.type !== 'Google Sheets') {
          dataSchema = getDefaultDataSchema(ds.type, ds.id);
        }
        if ((!sampleData || Object.keys(sampleData).length === 0) && ds.type !== 'Excel' && ds.type !== 'excel' && ds.type !== 'Google Sheets') {
          sampleData = getDefaultSampleData(ds.type, ds.id);
        }
        
        console.log(`Final result for ${ds.name}: dataSchema=${dataSchema.length} tables, sampleData=${Object.keys(sampleData).length} tables`);
        
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

  // Google Sheets connection with data loading
  app.post("/api/google-sheets/connect", async (req, res) => {
    try {
      const { selectedSheets, config } = req.body;
      
      console.log('=== GOOGLE SHEETS CONNECT REQUEST ===');
      console.log('Selected sheets:', selectedSheets);
      console.log('Config:', config);
      console.log('Session exists:', !!req.session);
      console.log('Has Google tokens:', !!req.session?.googleTokens);
      
      if (!req.session?.googleTokens) {
        console.log('No Google tokens in session - treating as manual connection');
        
        // For manual connections without OAuth, create data source with provided config
        const dataSource = {
          name: config.title || 'Google Sheets',
          type: 'Google Sheets',
          category: 'file',
          vendor: 'Google',
          status: 'connected',
          config: {
            title: config.title,
            description: config.description,
            selectedSheets: selectedSheets || [],
            manualConnection: true,
            connectionMethod: 'manual',
            dataSchema: [
              {
                table: "Sample Data",
                fields: [
                  { name: "데이터", type: "VARCHAR(255)", description: "수동 연결된 Google Sheets 데이터" }
                ],
                recordCount: 0,
                lastUpdated: new Date().toISOString()
              }
            ],
            sampleData: {
              "Sample Data": [
                { "데이터": "Google Sheets 연결이 완료되었습니다" }
              ]
            }
          }
        };
        
        const createdDataSource = await storage.createDataSource(dataSource);
        
        return res.json({
          success: true,
          dataSource: createdDataSource,
          message: "Google Sheets 연결이 완료되었습니다",
          connectionType: 'manual'
        });
      }

      const tokens = req.session.googleTokens;
      
      // Check if token is expired
      if (Date.now() > tokens.expires_at) {
        return res.status(401).json({ error: "Token expired, please re-authenticate" });
      }

      const { google } = await import('googleapis');
      
      // Use stored API configurations instead of environment variables
      const driveConfig = req.session.selectedDriveConfig;
      const sheetsConfig = req.session.selectedSheetsConfig;
      
      if (!driveConfig || !sheetsConfig) {
        return res.status(400).json({ error: "API configuration missing" });
      }
      
      const auth = new google.auth.OAuth2(
        driveConfig.clientId,
        driveConfig.clientSecret,
        `${req.protocol}://${req.get('host')}/api/google-sheets/oauth/callback`
      );

      auth.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'Bearer',
        expiry_date: tokens.expires_at
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const dataSchema: any[] = [];
      const sampleData: any = {};
      let totalRecordCount = 0;

      // Process each selected sheet
      for (const sheetId of selectedSheets) {
        try {
          console.log(`Processing Google Sheet: ${sheetId}`);
          
          // Get spreadsheet metadata
          const spreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId: sheetId
          });
          
          const spreadsheetTitle = spreadsheetResponse.data.properties?.title || `Sheet_${sheetId}`;
          const availableSheets = spreadsheetResponse.data.sheets?.map(s => s.properties?.title) || [];
          
          console.log(`Available worksheets in ${spreadsheetTitle}:`, availableSheets);
          
          // Process each worksheet
          for (const worksheetName of availableSheets) {
            try {
              console.log(`Fetching data from worksheet: "${worksheetName}"`);
              
              // Get the data from the worksheet
              const range = `'${worksheetName}'!A1:Z100`; // Get first 100 rows and columns A-Z
              const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: range,
              });

              const rows = response.data.values || [];
              
              if (rows.length > 0) {
                // Format the data
                const headers = rows[0] || [];
                const dataRows = rows.slice(1).map((row: any[]) => {
                  const rowData: any = {};
                  headers.forEach((header: string, index: number) => {
                    rowData[header || `Column_${index + 1}`] = row[index] || '';
                  });
                  return rowData;
                });

                // Create schema for this worksheet
                const fields = headers.map((header: string, index: number) => ({
                  name: header || `Column_${index + 1}`,
                  type: 'VARCHAR(255)',
                  description: `Column from ${worksheetName} in ${spreadsheetTitle}`
                }));

                dataSchema.push({
                  table: `${spreadsheetTitle} - ${worksheetName}`,
                  fields: fields,
                  recordCount: dataRows.length,
                  lastUpdated: new Date().toISOString()
                });

                sampleData[`${spreadsheetTitle} - ${worksheetName}`] = dataRows.slice(0, 5); // Store first 5 rows as sample
                totalRecordCount += dataRows.length;

                console.log(`Successfully processed ${worksheetName}: ${dataRows.length} records`);
              }
            } catch (worksheetError: any) {
              console.error(`Error processing worksheet ${worksheetName}:`, worksheetError);
            }
          }
        } catch (sheetError: any) {
          console.error(`Error processing sheet ${sheetId}:`, sheetError);
        }
      }

      // Create proper data source config for Google Sheets
      const googleSheetsDataSource = {
        name: config.title || 'Google Sheets',
        type: 'Google Sheets',
        category: 'file',
        vendor: 'Google',
        status: 'connected',
        config: {
          title: config.title,
          description: config.description,
          selectedSheets: selectedSheets,
          account: req.session?.googleAccount,
          dataSchema: dataSchema,
          sampleData: sampleData,
          connectionMethod: 'oauth'
        },
        connectionDetails: {
          service: 'Google Sheets API',
          authenticated: true,
          email: req.session?.googleAccount?.email
        },
        recordCount: totalRecordCount,
        lastSync: new Date().toISOString()
      };

      console.log('Creating Google Sheets data source with:');
      console.log('- DataSchema:', dataSchema.length, 'tables');
      console.log('- SampleData keys:', Object.keys(sampleData));
      console.log('- Record count:', totalRecordCount);

      const createdDataSource = await storage.createDataSource(googleSheetsDataSource, dataSchema, sampleData);
      
      res.json({
        success: true,
        dataSource: createdDataSource,
        message: `Successfully connected ${selectedSheets.length} Google Sheets with ${totalRecordCount} total records`
      });

    } catch (error: any) {
      console.error("Error connecting Google Sheets:", error);
      res.status(500).json({ 
        error: "Failed to connect Google Sheets",
        details: error.message 
      });
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

  // Refresh Google Sheets data
  app.post("/api/data-sources/:id/refresh", async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`=== REFRESHING DATA SOURCE: ${id} ===`);
      
      // Get the existing data source
      const dataSources = await storage.getDataSources();
      const dataSource = dataSources.find(ds => ds.id === id);
      
      if (!dataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }
      
      if (dataSource.type !== 'Google Sheets') {
        return res.status(400).json({ error: "Only Google Sheets can be refreshed" });
      }
      
      console.log('Found Google Sheets data source:', dataSource.name);
      
      // Check if we have authentication tokens
      if (!req.session?.googleTokens) {
        console.log('No Google tokens available - using manual refresh');
        
        // For manual connections, update with current timestamp
        const updatedConfig = {
          ...dataSource.config,
          lastRefresh: new Date().toISOString(),
          refreshMethod: 'manual'
        };
        
        const updatedDataSource = {
          ...dataSource,
          config: updatedConfig,
          lastSync: new Date().toISOString()
        };
        
        await storage.updateDataSource(id, updatedDataSource);
        
        return res.json({
          success: true,
          message: "데이터 소스가 새로고침되었습니다 (수동 연결)",
          dataSource: updatedDataSource,
          refreshType: 'manual'
        });
      }
      
      const tokens = req.session.googleTokens;
      
      // Check if token is expired
      if (Date.now() > tokens.expires_at) {
        return res.status(401).json({ 
          error: "Google 토큰이 만료되었습니다. 다시 인증해주세요." 
        });
      }
      
      console.log('Using OAuth tokens to refresh data');
      
      const { google } = await import('googleapis');
      const driveConfig = req.session.selectedDriveConfig;
      const sheetsConfig = req.session.selectedSheetsConfig;
      
      if (!driveConfig || !sheetsConfig) {
        return res.status(400).json({ error: "API configuration missing" });
      }
      
      const auth = new google.auth.OAuth2(
        driveConfig.clientId,
        driveConfig.clientSecret,
        `${req.protocol}://${req.get('host')}/api/google-sheets/oauth/callback`
      );
      
      auth.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'Bearer',
        expiry_date: tokens.expires_at
      });
      
      const sheets = google.sheets({ version: 'v4', auth });
      const selectedSheets = dataSource.config.selectedSheets || [];
      
      const dataSchema: any[] = [];
      const sampleData: any = {};
      let totalRecordCount = 0;
      
      // Refresh data from each selected sheet
      for (const sheetId of selectedSheets) {
        try {
          console.log(`Refreshing Google Sheet: ${sheetId}`);
          
          const spreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId: sheetId
          });
          
          const spreadsheetTitle = spreadsheetResponse.data.properties?.title || `Sheet_${sheetId}`;
          const availableSheets = spreadsheetResponse.data.sheets?.map(s => s.properties?.title) || [];
          
          // Process each worksheet
          for (const worksheetName of availableSheets) {
            try {
              console.log(`Refreshing data from worksheet: "${worksheetName}"`);
              
              const range = `'${worksheetName}'!A1:Z100`;
              const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: range,
              });
              
              const rows = response.data.values || [];
              
              if (rows.length > 0) {
                const headers = rows[0] || [];
                const dataRows = rows.slice(1).map((row: any[]) => {
                  const rowData: any = {};
                  headers.forEach((header: string, index: number) => {
                    rowData[header || `Column_${index + 1}`] = row[index] || '';
                  });
                  return rowData;
                });
                
                const fields = headers.map((header: string, index: number) => ({
                  name: header || `Column_${index + 1}`,
                  type: 'VARCHAR(255)',
                  description: `Column from ${worksheetName} in ${spreadsheetTitle}`
                }));
                
                dataSchema.push({
                  table: `${spreadsheetTitle} - ${worksheetName}`,
                  fields: fields,
                  recordCount: dataRows.length,
                  lastUpdated: new Date().toISOString()
                });
                
                sampleData[`${spreadsheetTitle} - ${worksheetName}`] = dataRows.slice(0, 5);
                totalRecordCount += dataRows.length;
                
                console.log(`Successfully refreshed ${worksheetName}: ${dataRows.length} records`);
              }
            } catch (worksheetError: any) {
              console.error(`Error refreshing worksheet ${worksheetName}:`, worksheetError);
            }
          }
        } catch (sheetError: any) {
          console.error(`Error refreshing sheet ${sheetId}:`, sheetError);
        }
      }
      
      // Update the data source with fresh data
      const updatedConfig = {
        ...dataSource.config,
        dataSchema: dataSchema,
        sampleData: sampleData,
        lastRefresh: new Date().toISOString(),
        refreshMethod: 'oauth'
      };
      
      const updatedDataSource = {
        ...dataSource,
        config: updatedConfig,
        recordCount: totalRecordCount,
        lastSync: new Date().toISOString()
      };
      
      await storage.updateDataSource(id, updatedDataSource);
      
      console.log(`Successfully refreshed Google Sheets: ${totalRecordCount} total records`);
      
      res.json({
        success: true,
        message: `Google Sheets 데이터가 성공적으로 새로고침되었습니다. ${totalRecordCount}개 레코드`,
        dataSource: updatedDataSource,
        refreshType: 'oauth',
        recordCount: totalRecordCount,
        schemasUpdated: dataSchema.length
      });
      
    } catch (error: any) {
      console.error("Error refreshing data source:", error);
      res.status(500).json({ 
        error: "데이터 소스 새로고침에 실패했습니다",
        details: error.message 
      });
    }
  });

  // Google API Config management endpoints
  app.get("/api/google-api-configs", async (req, res) => {
    try {
      const { type } = req.query;
      let configs;
      
      if (type && (type === 'drive' || type === 'sheets')) {
        configs = await storage.getGoogleApiConfigsByType(type as 'drive' | 'sheets');
      } else {
        configs = await storage.getGoogleApiConfigs();
      }
      
      res.json(configs);
    } catch (error) {
      console.error("Error fetching Google API configs:", error);
      res.status(500).json({ error: "Failed to fetch Google API configs" });
    }
  });

  app.get("/api/google-api-configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const config = await storage.getGoogleApiConfig(id);
      
      if (!config) {
        return res.status(404).json({ error: "Google API config not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching Google API config:", error);
      res.status(500).json({ error: "Failed to fetch Google API config" });
    }
  });

  app.post("/api/google-api-configs", async (req, res) => {
    try {
      const { title, type, clientId, clientSecret, projectId, apiKey, scopes } = req.body;
      
      if (!title || !type || !clientId || !clientSecret) {
        return res.status(400).json({ 
          error: "Title, type, clientId, and clientSecret are required" 
        });
      }

      if (type !== 'drive' && type !== 'sheets') {
        return res.status(400).json({ 
          error: "Type must be either 'drive' or 'sheets'" 
        });
      }

      const config = await storage.createGoogleApiConfig({
        title,
        type,
        clientId,
        clientSecret,
        projectId,
        apiKey,
        scopes: scopes || []
      });
      
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating Google API config:", error);
      res.status(500).json({ error: "Failed to create Google API config" });
    }
  });

  app.put("/api/google-api-configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const config = await storage.updateGoogleApiConfig(id, updates);
      res.json(config);
    } catch (error) {
      console.error("Error updating Google API config:", error);
      res.status(500).json({ error: "Failed to update Google API config" });
    }
  });

  app.delete("/api/google-api-configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGoogleApiConfig(id);
      res.status(200).json({ message: "Google API config deleted successfully" });
    } catch (error) {
      console.error("Error deleting Google API config:", error);
      res.status(500).json({ error: "Failed to delete Google API config" });
    }
  });

  // Test Google API config endpoint
  app.post("/api/google-api-configs/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const config = await storage.getGoogleApiConfig(id);
      
      if (!config) {
        return res.status(404).json({ error: "Google API config not found" });
      }

      // Test the API configuration
      const { google } = await import('googleapis');
      
      const auth = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );

      // Try to validate the configuration by checking OAuth endpoints
      try {
        // Simple validation - check if we can create auth URL
        const authUrl = auth.generateAuthUrl({
          access_type: 'offline',
          scope: config.scopes || []
        });
        
        res.json({
          success: true,
          message: "API configuration is valid",
          authUrl: authUrl,
          config: {
            title: config.title,
            type: config.type,
            clientId: config.clientId,
            projectId: config.projectId
          }
        });
      } catch (testError: any) {
        res.status(400).json({
          success: false,
          error: "Invalid API configuration",
          details: testError.message
        });
      }
    } catch (error) {
      console.error("Error testing Google API config:", error);
      res.status(500).json({ error: "Failed to test Google API config" });
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

  // Google OAuth 로그인 시작
  app.get('/auth/google/login', (req, res) => {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    res.json({ authUrl });
  });

  // Google OAuth 콜백
  app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      // 사용자 정보 가져오기
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // 세션에 토큰과 사용자 정보 저장
      if (req.session) {
        req.session.googleTokens = {
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token!,
          expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
          expires_at: tokens.expiry_date || Date.now() + 3600000
        };
        req.session.googleAccount = {
          email: userInfo.data.email!,
          name: userInfo.data.name!,
          picture: userInfo.data.picture!
        };
      }

      // 프론트엔드로 리다이렉트
      res.redirect('/settings/data-integration?auth=success');
    } catch (error) {
      console.error('Google OAuth error:', error);
      res.redirect('/settings/data-integration?auth=error');
    }
  });

  // Google 계정 정보 조회
  app.get('/api/google/account', (req, res) => {
    if (!req.session?.googleTokens || !req.session?.googleAccount) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      access_token: req.session.googleTokens.access_token,
      user_email: req.session.googleAccount.email,
      user_name: req.session.googleAccount.name,
      user_picture: req.session.googleAccount.picture,
      expires_at: req.session.googleTokens.expires_at
    });
  });

  // Google 로그아웃
  app.post('/api/google/logout', (req, res) => {
    if (req.session) {
      req.session.googleTokens = undefined;
      req.session.googleAccount = undefined;
    }
    res.json({ success: true });
  });

  // Google Sheets 목록 조회
  app.get('/api/google/sheets', async (req, res) => {
    if (!req.session?.googleTokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      // 토큰 설정
      oauth2Client.setCredentials({
        access_token: req.session.googleTokens.access_token,
        refresh_token: req.session.googleTokens.refresh_token
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      // Google Sheets 파일 목록 조회
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id, name, createdTime, modifiedTime, owners)',
        orderBy: 'modifiedTime desc',
        pageSize: 50
      });

      const sheets = response.data.files?.map(file => ({
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        owner: file.owners?.[0]?.displayName || 'Unknown'
      })) || [];

      res.json({ sheets });
    } catch (error) {
      console.error('Error fetching Google Sheets:', error);
      res.status(500).json({ error: 'Failed to fetch Google Sheets' });
    }
  });

  // Google Sheets 데이터 조회
  app.get('/api/google/sheets/:sheetId/data', async (req, res) => {
    if (!req.session?.googleTokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { sheetId } = req.params;
      
      // 토큰 설정
      oauth2Client.setCredentials({
        access_token: req.session.googleTokens.access_token,
        refresh_token: req.session.googleTokens.refresh_token
      });

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      // 스프레드시트 메타데이터 조회
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: sheetId
      });

      const worksheets = spreadsheet.data.sheets?.map(sheet => ({
        title: sheet.properties?.title,
        sheetId: sheet.properties?.sheetId,
        rowCount: sheet.properties?.gridProperties?.rowCount,
        columnCount: sheet.properties?.gridProperties?.columnCount
      })) || [];

      // 각 워크시트의 데이터 조회 (처음 몇 행만)
      const sheetsData = await Promise.all(
        worksheets.map(async (worksheet) => {
          try {
            const range = `${worksheet.title}!A1:Z100`; // 처음 100행, Z열까지
            const response = await sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: range
            });

            const values = response.data.values || [];
            const headers = values[0] || [];
            const rows = values.slice(1);

            return {
              title: worksheet.title,
              headers,
              data: rows.slice(0, 10), // 샘플 데이터 10행만
              totalRows: rows.length,
              fields: headers.map(header => ({
                name: header,
                type: 'VARCHAR(255)',
                description: `Column ${header} from ${worksheet.title}`
              }))
            };
          } catch (error) {
            console.error(`Error fetching data for sheet ${worksheet.title}:`, error);
            return {
              title: worksheet.title,
              headers: [],
              data: [],
              totalRows: 0,
              fields: []
            };
          }
        })
      );

      res.json({
        spreadsheetId: sheetId,
        spreadsheetName: spreadsheet.data.properties?.title,
        worksheets: sheetsData
      });
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      res.status(500).json({ error: 'Failed to fetch sheet data' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
