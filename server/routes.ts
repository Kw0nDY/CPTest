import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertViewSchema, insertAiModelSchema, insertModelConfigurationSchema, insertAiModelResultSchema, insertAiModelFolderSchema } from "@shared/schema";
import * as XLSX from 'xlsx';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { modelAnalysisService } from './modelAnalysisService';
import { modelConfigService } from './modelConfigService';

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
          { name: 'customer_id', type: 'STRING', description: 'Customer ID' },
          { name: 'customer_name', type: 'STRING', description: 'Customer name' },
          { name: 'country', type: 'STRING', description: 'Country' },
          { name: 'credit_limit', type: 'NUMBER', description: 'Credit limit' },
          { name: 'created_date', type: 'DATE', description: 'Created date' }
        ],
        recordCount: 10
      },
      {
        table: 'ORDERS',
        fields: [
          { name: 'order_id', type: 'STRING', description: 'Order ID' },
          { name: 'customer_id', type: 'STRING', description: 'Customer ID' },
          { name: 'order_date', type: 'DATE', description: 'Order date' },
          { name: 'total_amount', type: 'NUMBER', description: 'Total amount' },
          { name: 'status', type: 'STRING', description: 'Order status' }
        ],
        recordCount: 10
      }
    ],
    'salesforce-crm': [
      {
        table: 'ACCOUNTS',
        fields: [
          { name: 'sf_id', type: 'STRING', description: 'Salesforce ID' },
          { name: 'name', type: 'STRING', description: 'Account name' },
          { name: 'industry', type: 'STRING', description: 'Industry' },
          { name: 'annual_revenue', type: 'NUMBER', description: 'Annual revenue' },
          { name: 'number_of_employees', type: 'NUMBER', description: 'Number of employees' }
        ],
        recordCount: 10
      }
    ],
    'aveva-pi': [
      {
        table: 'ASSET_HIERARCHY',
        fields: [
          { name: 'asset_name', type: 'STRING', description: 'Asset name' },
          { name: 'asset_path', type: 'STRING', description: 'Asset path' },
          { name: 'asset_type', type: 'STRING', description: 'Asset type' },
          { name: 'location', type: 'STRING', description: 'Location' },
          { name: 'operational_status', type: 'STRING', description: 'Operational status' }
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
                  sheetCount: worksheetNames.length,
                  lastModified: file.modifiedTime,
                  lastModifiedFormatted: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : null
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
          // Fallback: create basic sheet objects with better info from Drive API
          sheets = driveData.files.map((file: any) => ({
            id: file.id,
            name: file.name,
            url: file.webViewLink,
            sheets: ['기본 시트'], // More realistic fallback
            sheetCount: 1,
            lastModified: file.modifiedTime,
            lastModifiedFormatted: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : null
          }));
        }

        console.log(`Successfully loaded ${sheets.length} spreadsheets from Google Drive`);
        console.log('All sheets before filtering:', JSON.stringify(sheets, null, 2));
        
        // Don't filter out sheets just because API failed - show all available sheets
        console.log(`All available sheets: ${sheets.length}`);
        console.log('All sheets data:', JSON.stringify(sheets, null, 2));
        
        // Enhanced sheets with better fallback logic
        const enhancedSheets = sheets.map(sheet => {
          // If we have actual sheet data, use it
          if (sheet.sheets && sheet.sheets.length > 0 && !sheet.sheets.includes('Sheet1')) {
            return sheet;
          }
          
          // Otherwise, try to get minimal info from Google Drive API
          return {
            ...sheet,
            sheets: sheet.sheets.length > 0 ? sheet.sheets : ['기본 시트'], // More realistic fallback
            sheetCount: sheet.sheets.length > 0 ? sheet.sheets.length : 1
          };
        });
        
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

  // Update all data sources to use STRING instead of VARCHAR
  app.post("/api/data-sources/update-all-varchar-to-string", async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      const updatedSources = [];
      
      for (const dataSource of dataSources) {
        if (dataSource.dataSchema && dataSource.dataSchema.length > 0) {
          const updatedDataSchema = dataSource.dataSchema.map((table: any) => ({
            ...table,
            fields: table.fields?.map((field: any) => ({
              ...field,
              type: field.type.startsWith('VARCHAR') ? 'STRING' : field.type
            })) || []
          }));
          
          // Also update config if it exists
          let updatedConfig = dataSource.config;
          if (dataSource.config && (dataSource.config as any).dataSchema) {
            const configDataSchema = (dataSource.config as any).dataSchema.map((table: any) => ({
              ...table,
              fields: table.fields?.map((field: any) => ({
                ...field,
                type: field.type.startsWith('VARCHAR') ? 'STRING' : field.type
              })) || []
            }));
            updatedConfig = { ...dataSource.config, dataSchema: configDataSchema };
          }
          
          await storage.updateDataSource(dataSource.id, { 
            dataSchema: updatedDataSchema,
            config: updatedConfig
          });
          
          updatedSources.push({
            id: dataSource.id,
            name: dataSource.name,
            tablesUpdated: updatedDataSchema.length
          });
        }
      }
      
      return res.json({
        success: true,
        message: "All VARCHAR types updated to STRING successfully",
        updatedSources: updatedSources
      });
    } catch (error) {
      console.error("Error updating VARCHAR to STRING:", error);
      res.status(500).json({ error: "Failed to update VARCHAR types" });
    }
  });

  // Update data source schema types API
  app.post("/api/data-sources/:id/update-schema", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource || dataSource.type !== 'Google Sheets') {
        return res.status(404).json({ error: "Google Sheets data source not found" });
      }
      
      // Update schema with better type detection for 차량정보
      if (dataSource.name === '차량정보' && dataSource.config) {
        const config = dataSource.config as any;
        const updatedDataSchema = config.dataSchema?.map((table: any) => {
          if (table.table.includes('CarData')) {
            return {
              ...table,
              fields: [
                { name: '차량 모델', type: 'STRING', description: 'Vehicle model name' },
                { name: '제조업체', type: 'STRING', description: 'Manufacturer name' },
                { name: '연식', type: 'INTEGER', description: 'Manufacturing year' },
                { name: '주행 거리 (km)', type: 'INTEGER', description: 'Mileage in kilometers' },
                { name: '색상', type: 'STRING', description: 'Vehicle color' },
                { name: '가격 (원)', type: 'DECIMAL', description: 'Price in Korean Won' }
              ]
            };
          } else if (table.table.includes('UserData')) {
            return {
              ...table,
              fields: [
                { name: '구매자 이름', type: 'STRING', description: 'Buyer name' },
                { name: '연락처', type: 'STRING', description: 'Contact phone number' },
                { name: '주소', type: 'STRING', description: 'Address' },
                { name: '구매 차량 모델', type: 'STRING', description: 'Purchased vehicle model' },
                { name: '구매 날짜', type: 'DATE', description: 'Purchase date' },
                { name: '결제 방식', type: 'STRING', description: 'Payment method' }
              ]
            };
          }
          return table;
        });
        
        const updatedConfig = {
          ...config,
          dataSchema: updatedDataSchema
        };
        
        // Also update the dataSchema field outside config for consistency
        await storage.updateDataSource(id, { 
          config: updatedConfig,
          dataSchema: updatedDataSchema
        });
        
        return res.json({
          success: true,
          message: "Schema types updated successfully",
          updatedTables: updatedDataSchema?.length || 0
        });
      }
      
      res.json({ success: false, message: "No updates needed" });
    } catch (error) {
      console.error("Error updating schema:", error);
      res.status(500).json({ error: "Failed to update schema" });
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
      console.log('=== GOOGLE SHEETS CONNECT REQUEST ===');
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      
      // Extract data from the nested structure
      const { title, description, selectedSheets, driveConfig, sheetsConfig, connectionData } = req.body;
      
      console.log('Extracted data:');
      console.log('- title:', title);
      console.log('- description:', description);
      console.log('- selectedSheets:', selectedSheets);
      console.log('- driveConfig:', driveConfig);
      console.log('- sheetsConfig:', sheetsConfig);
      console.log('- connectionData:', connectionData ? 'present' : 'missing');
      console.log('Session exists:', !!req.session);
      console.log('Has Google tokens:', !!req.session?.googleTokens);
      
      if (!req.session?.googleTokens && !connectionData) {
        console.log('No Google tokens in session - treating as manual connection');
        
        // For manual connections without OAuth, create data source with provided config
        const dataSource = {
          name: title || 'Google Sheets',
          type: 'Google Sheets',
          category: 'file',
          vendor: 'Google',
          status: 'connected',
          config: {
            title: title || 'Google Sheets',
            description: description || '',
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

      // Use tokens from connectionData if available, or from session
      const tokens = connectionData || req.session?.googleTokens;
      
      if (!tokens) {
        return res.status(400).json({ error: "No authentication tokens available" });
      }
      
      // Check if token is expired
      if (Date.now() > tokens.expires_at) {
        return res.status(401).json({ error: "Token expired, please re-authenticate" });
      }

      const { google } = await import('googleapis');
      
      // Use provided API configurations (no session dependency for now)
      const finalDriveConfig = driveConfig;
      const finalSheetsConfig = sheetsConfig;
      
      // For OAuth authentication, we can use environment variables as fallback
      if (!finalDriveConfig && !finalSheetsConfig && tokens.access_token) {
        console.log('Using direct OAuth authentication with environment credentials');
        const auth = new google.auth.OAuth2(
          GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET,
          REDIRECT_URI
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

        // Process each selected sheet
        for (const sheetId of selectedSheets || []) {
          try {
            console.log(`Processing Google Sheet: ${sheetId}`);
            
            // Get spreadsheet metadata
            const spreadsheetResponse = await sheets.spreadsheets.get({
              spreadsheetId: sheetId
            });
            
            const spreadsheetTitle = spreadsheetResponse.data.properties?.title || `Sheet_${sheetId}`;
            console.log(`Found spreadsheet: ${spreadsheetTitle}`);

            // Get all worksheet names
            const worksheets = spreadsheetResponse.data.sheets || [];
            
            for (const worksheet of worksheets) {
              const worksheetTitle = worksheet.properties?.title || 'Untitled';
              console.log(`Processing worksheet: ${worksheetTitle}`);
              
              try {
                // Get data from this worksheet (first 100 rows)
                const range = `${worksheetTitle}!A1:Z100`;
                const valuesResponse = await sheets.spreadsheets.values.get({
                  spreadsheetId: sheetId,
                  range: range
                });
                
                const values = valuesResponse.data.values || [];
                if (values.length === 0) {
                  console.log(`No data found in worksheet: ${worksheetTitle}`);
                  continue;
                }
                
                const headers = values[0] || [];
                const dataRows = values.slice(1);
                
                console.log(`Found ${headers.length} columns and ${dataRows.length} data rows in ${worksheetTitle}`);
                
                // Function to detect data type from sample values
                const detectDataType = (columnIndex: number, sampleSize: number = 10): string => {
                  const sampleValues = dataRows.slice(0, sampleSize).map(row => row[columnIndex]).filter(val => val && val.toString().trim() !== '');
                  
                  if (sampleValues.length === 0) return "STRING";
                  
                  // Check if all values are numbers
                  const isAllNumbers = sampleValues.every(val => {
                    const num = val.toString().replace(/[,\s]/g, '');
                    return !isNaN(Number(num)) && !isNaN(parseFloat(num));
                  });
                  
                  if (isAllNumbers) {
                    return "NUMBER";
                  }
                  
                  // Check if all values are dates
                  const isAllDates = sampleValues.every(val => {
                    const dateStr = val.toString().trim();
                    // Check various date formats
                    const datePatterns = [
                      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
                      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
                      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
                      /^\d{4}\.\d{2}\.\d{2}$/, // YYYY.MM.DD
                      /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
                    ];
                    return datePatterns.some(pattern => pattern.test(dateStr)) || !isNaN(Date.parse(dateStr));
                  });
                  
                  if (isAllDates) return "DATE";
                  
                  return "STRING";
                };
                
                // Build schema with smart type detection
                const fields = headers.map((header, index) => ({
                  name: header || `Column_${index + 1}`,
                  type: detectDataType(index),
                  description: `Column from ${worksheetTitle} in ${spreadsheetTitle}`
                }));
                
                dataSchema.push({
                  table: `${spreadsheetTitle} - ${worksheetTitle}`,
                  fields: fields,
                  recordCount: dataRows.length,
                  lastUpdated: new Date().toISOString()
                });
                
                // Build sample data (first 5 rows)
                const sampleRows = dataRows.slice(0, 5).map(row => {
                  const rowObj: any = {};
                  headers.forEach((header, index) => {
                    rowObj[header || `Column_${index + 1}`] = row[index] || '';
                  });
                  return rowObj;
                });
                
                sampleData[`${spreadsheetTitle} - ${worksheetTitle}`] = sampleRows;
                
              } catch (worksheetError) {
                console.error(`Error processing worksheet ${worksheetTitle}:`, worksheetError);
              }
            }
            
          } catch (sheetError) {
            console.error(`Error processing sheet ${sheetId}:`, sheetError);
          }
        }

        // Create data source with actual Google Sheets data
        const dataSource = {
          name: title || 'Google Sheets',
          type: 'Google Sheets',
          category: 'file',
          vendor: 'Google',
          status: 'connected',
          config: {
            title: title || 'Google Sheets',
            description: description || '',
            selectedSheets: selectedSheets || [],
            connectionMethod: 'oauth',
            dataSchema: dataSchema,
            sampleData: sampleData,
            lastSync: new Date().toISOString(),
            tokens: {
              expires_at: tokens.expires_at,
              user_email: tokens.user_email,
              user_name: tokens.user_name
            }
          }
        };
        
        const createdDataSource = await storage.createDataSource(dataSource);
        
        return res.json({
          success: true,
          dataSource: createdDataSource,
          message: "Google Sheets 연결이 완료되었습니다",
          connectionType: 'oauth',
          tablesFound: dataSchema.length
        });
      }
      
      if (!finalDriveConfig || !finalSheetsConfig) {
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
    console.log(`=== DELETE DATA SOURCE REQUEST ===`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    console.log(`Request params:`, req.params);
    
    // Set proper JSON headers
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { id } = req.params;
      console.log(`Deleting data source with ID: ${id}`);
      
      if (!id) {
        console.log('No ID provided in request');
        return res.status(400).json({ 
          success: false,
          error: "Data source ID is required"
        });
      }
      
      // Check if data source exists first
      const existingDataSource = await storage.getDataSource(id);
      if (!existingDataSource) {
        console.log(`Data source with ID ${id} not found`);
        return res.status(404).json({ 
          success: false,
          error: "Data source not found",
          id: id
        });
      }
      
      console.log(`Found data source: ${existingDataSource.name}`);
      
      await storage.deleteDataSource(id);
      console.log(`Delete operation completed successfully`);
      
      return res.status(200).json({ 
        success: true,
        message: "Data source deleted successfully",
        id: id,
        name: existingDataSource.name
      });
      
    } catch (error: any) {
      console.error("Error deleting data source:", error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to delete data source",
        details: error.message
      });
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
          const fields = headers.map((header, columnIndex) => {
            // Detect data type from first few rows
            const sampleValues = rows.map(row => row[columnIndex]).filter(val => val !== null && val !== undefined && val !== '');
            
            let type = 'STRING';
            
            if (sampleValues.length > 0) {
              // Check if all values are numbers
              const isAllNumbers = sampleValues.every(val => {
                const num = val.toString().replace(/[,\s]/g, '');
                return !isNaN(Number(num)) && !isNaN(parseFloat(num));
              });
              
              if (isAllNumbers) {
                type = 'NUMBER';
              } else {
                // Check if all values are dates
                const isAllDates = sampleValues.every(val => {
                  const dateStr = val.toString().trim();
                  const datePatterns = [
                    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
                    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
                    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
                    /^\d{4}\.\d{2}\.\d{2}$/, // YYYY.MM.DD
                    /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
                  ];
                  return datePatterns.some(pattern => pattern.test(dateStr)) || !isNaN(Date.parse(dateStr));
                });
                
                if (isAllDates) {
                  type = 'DATE';
                }
              }
            }
            
            return {
              name: header,
              type,
              description: `${header} field`
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
                { name: 'SESSION_ID', type: 'STRING', description: 'Unique session identifier' },
                { name: 'USER_ID', type: 'STRING', description: 'User identifier' },
                { name: 'LOGIN_TIME', type: 'DATE', description: 'Login timestamp' },
                { name: 'SESSION_DURATION', type: 'NUMBER', description: 'Session length in minutes' },
                { name: 'PAGE_VIEWS', type: 'NUMBER', description: 'Number of page views' },
                { name: 'USER_TYPE', type: 'STRING', description: 'User category' }
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

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedExtensions = ['.pth', '.pt', '.onnx', '.h5', '.pb', '.tflite', '.pkl', '.pickle'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${ext} not supported. Supported formats: ${allowedExtensions.join(', ')}`));
      }
    }
  });

  // Configure multer for enhanced uploads (model + config files)
  const enhancedUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB limit
      files: 10 // Max 10 files
    },
    fileFilter: (req, file, cb) => {
      const allowedExtensions = [
        '.pth', '.pt', '.onnx', '.h5', '.pb', '.tflite', '.pkl', '.pickle', // Model files
        '.json', '.yaml', '.yml' // Config files
      ];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${ext} not supported. Supported formats: ${allowedExtensions.join(', ')}`));
      }
    }
  });

  // AI Models API
  app.get('/api/ai-models', async (req, res) => {
    try {
      const models = await storage.getAiModels();
      
      // Return actual uploaded models only
      res.json(models);
    } catch (error) {
      console.error('Error fetching AI models:', error);
      res.status(500).json({ error: 'Failed to fetch AI models' });
    }
  });

  app.get('/api/ai-models/:id', async (req, res) => {
    try {
      const model = await storage.getAiModel(req.params.id);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }
      res.json(model);
    } catch (error) {
      console.error('Error fetching AI model:', error);
      res.status(500).json({ error: 'Failed to fetch AI model' });
    }
  });

  // Delete AI model
  app.delete('/api/ai-models/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // Delete the model files from filesystem if they exist
      if (model.filePath && fs.existsSync(model.filePath)) {
        try {
          fs.unlinkSync(model.filePath);
          console.log(`Deleted model file: ${model.filePath}`);
        } catch (fileError) {
          console.warn(`Could not delete model file: ${model.filePath}`, fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete from database
      await storage.deleteAiModel(id);
      
      res.status(200).json({ message: 'AI model deleted successfully' });
    } catch (error) {
      console.error('Error deleting AI model:', error);
      res.status(500).json({ error: 'Failed to delete AI model' });
    }
  });

  // Re-analyze AI model
  app.post('/api/ai-models/:id/reanalyze', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      if (!model.filePath) {
        return res.status(400).json({ error: 'Model file path not available' });
      }

      // Check if file exists
      if (!fs.existsSync(model.filePath)) {
        return res.status(400).json({ error: 'Model file no longer exists' });
      }

      // Update status to processing
      await storage.updateAiModel(id, {
        analysisStatus: 'processing',
        status: 'processing'
      });

      // Start analysis in background
      setImmediate(async () => {
        try {
          console.log(`Re-analyzing model: ${model.name} (${model.fileName})`);
          
          // Analyze the model
          const analysisResult = await modelAnalysisService.analyzeModel(model.filePath!, model.fileName);

          if (analysisResult.success) {
            console.log(`Analysis successful for model: ${model.name}`);
            console.log(`Inputs: ${analysisResult.inputSpecs.length}, Outputs: ${analysisResult.outputSpecs.length}`);
            
            // Update model with analysis results
            await storage.updateAiModel(id, {
              status: 'completed',
              analysisStatus: 'completed',
              inputSpecs: analysisResult.inputSpecs,
              outputSpecs: analysisResult.outputSpecs,
              metadata: analysisResult.metadata,
              analyzedAt: new Date()
            });
          } else {
            console.error(`Analysis failed for model: ${model.name}`, analysisResult.error);
            await storage.updateAiModel(id, {
              status: 'error',
              analysisStatus: 'error',
              analyzedAt: new Date()
            });
          }
        } catch (error) {
          console.error(`Re-analysis error for model ${model.name}:`, error);
          await storage.updateAiModel(id, {
            status: 'error',
            analysisStatus: 'error',
            analyzedAt: new Date()
          });
        }
      });

      res.json({ message: 'Model re-analysis started' });
    } catch (error) {
      console.error('Error starting model re-analysis:', error);
      res.status(500).json({ error: 'Failed to start model re-analysis' });
    }
  });

  /* Original single file upload endpoint - replaced by enhanced multi-file upload
  app.post('/api/ai-models/upload', upload.single('model'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No model file provided' });
      }

      const { name, description, manualMode, inputSpecs, outputSpecs, metadata } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Model name is required' });
      }

      // Save uploaded file temporarily
      const tempFilePath = await modelAnalysisService.saveUploadedFile(
        req.file.buffer,
        req.file.originalname
      );

      // Determine model type from file extension
      const modelType = path.extname(req.file.originalname).toLowerCase();
      const typeMap: { [key: string]: string } = {
        '.pth': 'pytorch',
        '.pt': 'pytorch',
        '.onnx': 'onnx',
        '.h5': 'tensorflow',
        '.pb': 'tensorflow',
        '.tflite': 'tensorflow',
        '.pkl': 'sklearn',
        '.pickle': 'sklearn'
      };

      // Create AI model record
      const modelData = {
        name,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        modelType: typeMap[modelType] || 'unknown',
        status: manualMode === 'true' ? 'completed' as const : 'processing' as const,
        filePath: tempFilePath,
        analysisStatus: manualMode === 'true' ? 'completed' as const : 'pending' as const,
        inputSpecs: manualMode === 'true' ? JSON.parse(inputSpecs || '[]') : undefined,
        outputSpecs: manualMode === 'true' ? JSON.parse(outputSpecs || '[]') : undefined,
        metadata: manualMode === 'true' ? JSON.parse(metadata || '{}') : undefined,
        analyzedAt: manualMode === 'true' ? new Date() : undefined
      };

      const createdModel = await storage.createAiModel(modelData);

      // Generate config file for manual mode as well
      if (manualMode === 'true') {
        try {
          const configData = await modelConfigService.generateConfig({
            id: createdModel.id,
            name: createdModel.name,
            framework: typeMap[modelType] || 'pytorch',
            filePath: tempFilePath,
            inputSpecs: JSON.parse(inputSpecs || '[]'),
            outputSpecs: JSON.parse(outputSpecs || '[]')
          });
          
          const configFilePath = await modelConfigService.saveConfigFile(createdModel.id, configData);
          
          // Update model with config file path
          await storage.updateAiModel(createdModel.id, {
            configFilePath: configFilePath
          });
        } catch (configError) {
          console.error('Config file generation error in manual mode:', configError);
        }
      }

      // Start model analysis in background (only if not manual mode)
      if (manualMode !== 'true') {
        setImmediate(async () => {
          try {
          // Update status to processing
          await storage.updateAiModel(createdModel.id, {
            analysisStatus: 'processing'
          });

          // Analyze the model
          const analysisResult = await modelAnalysisService.analyzeModel(tempFilePath, req.file!.originalname);

          if (analysisResult.success) {
            // Generate YAML config file
            try {
              const configData = await modelConfigService.generateConfig({
                id: createdModel.id,
                name: createdModel.name,
                framework: typeMap[modelType] || 'pytorch',
                filePath: tempFilePath,
                inputSpecs: analysisResult.inputSpecs,
                outputSpecs: analysisResult.outputSpecs
              });
              
              const configFilePath = await modelConfigService.saveConfigFile(createdModel.id, configData);
              
              // Update model with analysis results and config file path
              await storage.updateAiModel(createdModel.id, {
                status: 'completed',
                analysisStatus: 'completed',
                inputSpecs: analysisResult.inputSpecs,
                outputSpecs: analysisResult.outputSpecs,
                metadata: analysisResult.metadata,
                configFilePath: configFilePath,
                analyzedAt: new Date()
              });
            } catch (configError) {
              console.error('Config file generation error:', configError);
              // Still update model with analysis results even if config generation fails
              await storage.updateAiModel(createdModel.id, {
                status: 'completed',
                analysisStatus: 'completed',
                inputSpecs: analysisResult.inputSpecs,
                outputSpecs: analysisResult.outputSpecs,
                metadata: analysisResult.metadata,
                analyzedAt: new Date()
              });
            }
          } else {
            // Update with error status
            await storage.updateAiModel(createdModel.id, {
              status: 'error',
              analysisStatus: 'error',
              analyzedAt: new Date()
            });
          }
        } catch (error) {
          console.error('Model analysis error:', error);
          await storage.updateAiModel(createdModel.id, {
            status: 'error',
            analysisStatus: 'error',
            analyzedAt: new Date()
          });
        } finally {
          // Clean up temporary file
          await modelAnalysisService.cleanupFile(tempFilePath);
        }
        });
      }

      res.json({
        message: 'Model uploaded successfully and analysis started',
        model: createdModel
      });
    } catch (error) {
      console.error('Error uploading model:', error);
      res.status(500).json({ error: 'Failed to upload model' });
    }
  }); */

  // Enhanced AI Model Upload with multiple files support
  app.post('/api/ai-models/upload', enhancedUpload.array('files'), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const { name, description, type, parsedConfig, folderId } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Model name is required' });
      }

      console.log(`Enhanced upload request for model: ${name}`);
      console.log(`Files received: ${req.files.length}`);
      console.log(`Request body:`, req.body);
      console.log(`Folder ID received:`, folderId);

      const files = req.files as Express.Multer.File[];
      let modelFile: Express.Multer.File | null = null;
      let configFile: Express.Multer.File | null = null;
      let configData: any = null;

      // Categorize uploaded files
      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const isModelFile = ['.pth', '.pt', '.onnx', '.h5', '.pb', '.tflite', '.pkl', '.pickle'].includes(ext);
        const isConfigFile = ['.json', '.yaml', '.yml'].includes(ext);

        if (isModelFile && !modelFile) {
          modelFile = file;
          console.log(`Model file found: ${file.originalname}`);
        } else if (isConfigFile && !configFile) {
          configFile = file;
          console.log(`Config file found: ${file.originalname}`);
        }
      }

      if (!modelFile) {
        return res.status(400).json({ error: 'No valid model file provided' });
      }

      // Parse config file if provided
      if (configFile) {
        try {
          const configContent = configFile.buffer.toString('utf-8');
          const ext = path.extname(configFile.originalname).toLowerCase();
          
          if (ext === '.json') {
            configData = JSON.parse(configContent);
          } else if (['.yaml', '.yml'].includes(ext)) {
            // For YAML files, we'll need to parse them properly
            // For now, we'll treat them as text and try to parse as JSON if possible
            try {
              configData = JSON.parse(configContent);
            } catch {
              configData = { content: configContent, type: 'yaml' };
            }
          }
          console.log('Config file parsed successfully');
        } catch (error) {
          console.error('Error parsing config file:', error);
          configData = null;
        }
      }

      // If parsedConfig is provided from the frontend, use that instead
      if (parsedConfig) {
        try {
          configData = JSON.parse(parsedConfig);
          console.log('Using parsed config from frontend');
        } catch (error) {
          console.error('Error parsing frontend config:', error);
        }
      }

      // Save uploaded model file temporarily
      const tempFilePath = await modelAnalysisService.saveUploadedFile(
        modelFile.buffer,
        modelFile.originalname
      );

      // Determine model type from file extension
      const modelType = path.extname(modelFile.originalname).toLowerCase();
      const typeMap: { [key: string]: string } = {
        '.pth': 'pytorch',
        '.pt': 'pytorch',
        '.onnx': 'onnx',
        '.h5': 'tensorflow',
        '.pb': 'tensorflow',
        '.tflite': 'tensorflow',
        '.pkl': 'sklearn',
        '.pickle': 'sklearn'
      };

      // Extract input/output specs from config if available
      let inputSpecs = [];
      let outputSpecs = [];
      let metadata = {};

      if (configData) {
        if (configData.inputs || configData.input) {
          inputSpecs = configData.inputs || configData.input || [];
        }
        if (configData.outputs || configData.output) {
          outputSpecs = configData.outputs || configData.output || [];
        }
        if (configData.metadata) {
          metadata = configData.metadata;
        }
      }

      // Create AI model record
      const modelData = {
        name,
        description: description || '',
        fileName: modelFile.originalname,
        fileSize: modelFile.size,
        modelType: type || typeMap[modelType] || 'unknown',
        status: configData ? 'completed' as const : 'processing' as const,
        filePath: tempFilePath,
        analysisStatus: configData ? 'completed' as const : 'pending' as const,
        inputSpecs: inputSpecs.length > 0 ? inputSpecs : undefined,
        outputSpecs: outputSpecs.length > 0 ? outputSpecs : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        analyzedAt: configData ? new Date() : undefined,
        folderId: folderId || null  // Add folderId to model data
      };

      const createdModel = await storage.createAiModel(modelData);
      console.log(`Model created with ID: ${createdModel.id}`);

      // Generate config file if we have enough information
      if (configData || (inputSpecs.length > 0 && outputSpecs.length > 0)) {
        try {
          const configToGenerate = {
            id: createdModel.id,
            name: createdModel.name,
            framework: typeMap[modelType] || 'pytorch',
            filePath: tempFilePath,
            inputSpecs: inputSpecs,
            outputSpecs: outputSpecs,
            metadata: metadata
          };
          
          const generatedConfigData = await modelConfigService.generateConfig(configToGenerate);
          const configFilePath = await modelConfigService.saveConfigFile(createdModel.id, generatedConfigData);
          
          // Update model with config file path
          await storage.updateAiModel(createdModel.id, {
            configFilePath: configFilePath
          });
          console.log(`Config file saved at: ${configFilePath}`);
        } catch (configError) {
          console.error('Config file generation error:', configError);
        }
      }

      // Start model analysis in background if no config was provided
      if (!configData) {
        setImmediate(async () => {
          try {
            console.log(`Starting analysis for model: ${createdModel.name}`);
            
            // Analyze the model
            const analysisResult = await modelAnalysisService.analyzeModel(tempFilePath, modelFile.originalname);

            if (analysisResult.success) {
              console.log(`Analysis successful for model: ${createdModel.name}`);
              
              // Update model with analysis results
              await storage.updateAiModel(createdModel.id, {
                status: 'completed',
                analysisStatus: 'completed',
                inputSpecs: analysisResult.inputSpecs,
                outputSpecs: analysisResult.outputSpecs,
                metadata: analysisResult.metadata,
                analyzedAt: new Date()
              });

              // Generate config file with analysis results
              try {
                const configData = await modelConfigService.generateConfig({
                  id: createdModel.id,
                  name: createdModel.name,
                  framework: typeMap[modelType] || 'pytorch',
                  filePath: tempFilePath,
                  inputSpecs: analysisResult.inputSpecs,
                  outputSpecs: analysisResult.outputSpecs,
                  metadata: analysisResult.metadata
                });
                
                const configFilePath = await modelConfigService.saveConfigFile(createdModel.id, configData);
                
                // Update model with config file path
                await storage.updateAiModel(createdModel.id, {
                  configFilePath: configFilePath
                });
              } catch (configError) {
                console.error('Config file generation error after analysis:', configError);
              }
            } else {
              console.error(`Analysis failed for model: ${createdModel.name}`, analysisResult.error);
              await storage.updateAiModel(createdModel.id, {
                status: 'error',
                analysisStatus: 'error',
                analyzedAt: new Date()
              });
            }
          } catch (error) {
            console.error('Model analysis error:', error);
            await storage.updateAiModel(createdModel.id, {
              status: 'error',
              analysisStatus: 'error',
              analyzedAt: new Date()
            });
          } finally {
            // Clean up temporary file
            await modelAnalysisService.cleanupFile(tempFilePath);
          }
        });
      }

      res.json({
        message: 'Model uploaded successfully',
        model: createdModel,
        hasConfig: !!configData
      });
    } catch (error) {
      console.error('Error in enhanced model upload:', error);
      res.status(500).json({ error: 'Failed to upload model' });
    }
  });

  app.delete('/api/ai-models/:id', async (req, res) => {
    try {
      await storage.deleteAiModel(req.params.id);
      res.json({ message: 'Model deleted successfully' });
    } catch (error) {
      console.error('Error deleting AI model:', error);
      res.status(500).json({ error: 'Failed to delete AI model' });
    }
  });

  // Model Configurations API
  app.get('/api/model-configurations', async (req, res) => {
    try {
      const configurations = await storage.getModelConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error('Error fetching model configurations:', error);
      res.status(500).json({ error: 'Failed to fetch model configurations' });
    }
  });

  app.get('/api/model-configurations/model/:modelId', async (req, res) => {
    try {
      const configurations = await storage.getModelConfigurationsByModel(req.params.modelId);
      res.json(configurations);
    } catch (error) {
      console.error('Error fetching model configurations:', error);
      res.status(500).json({ error: 'Failed to fetch model configurations' });
    }
  });

  app.post('/api/model-configurations', async (req, res) => {
    try {
      const validatedData = insertModelConfigurationSchema.parse(req.body);
      const configuration = await storage.createModelConfiguration(validatedData);
      res.json(configuration);
    } catch (error) {
      console.error('Error creating model configuration:', error);
      res.status(500).json({ error: 'Failed to create model configuration' });
    }
  });

  app.put('/api/model-configurations/:id', async (req, res) => {
    try {
      const configuration = await storage.updateModelConfiguration(req.params.id, req.body);
      res.json(configuration);
    } catch (error) {
      console.error('Error updating model configuration:', error);
      res.status(500).json({ error: 'Failed to update model configuration' });
    }
  });

  app.delete('/api/model-configurations/:id', async (req, res) => {
    try {
      await storage.deleteModelConfiguration(req.params.id);
      res.json({ message: 'Model configuration deleted successfully' });
    } catch (error) {
      console.error('Error deleting model configuration:', error);
      res.status(500).json({ error: 'Failed to delete model configuration' });
    }
  });

  // AI Model Config File Management APIs
  app.post('/api/ai-models/:id/generate-config', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }

      // Generate config from current model data
      const configData = await modelConfigService.generateConfig({
        id: model.id,
        name: model.name,
        framework: model.metadata?.framework || 'pytorch',
        filePath: model.filePath || '',
        inputSpecs: model.inputSpecs || [],
        outputSpecs: model.outputSpecs || [],
        configuration: model.configuration
      });

      const configFilePath = await modelConfigService.saveConfigFile(model.id, configData);

      // Update model with config file path
      await storage.updateAiModel(id, {
        configFilePath: configFilePath
      });

      res.json({
        success: true,
        message: 'Config file generated successfully',
        configFilePath: configFilePath,
        config: configData
      });
    } catch (error) {
      console.error('Error generating config file:', error);
      res.status(500).json({ error: 'Failed to generate config file' });
    }
  });

  app.get('/api/ai-models/:id/config', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }

      if (!model.configFilePath) {
        return res.status(404).json({ error: 'Config file not found for this model' });
      }

      const config = await modelConfigService.loadConfigFile(model.configFilePath);
      
      res.json({
        success: true,
        config: config,
        filePath: model.configFilePath
      });
    } catch (error) {
      console.error('Error loading config file:', error);
      res.status(500).json({ error: 'Failed to load config file' });
    }
  });

  app.get('/api/ai-models/:id/config/download', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }

      if (!model.configFilePath) {
        return res.status(404).json({ error: 'Config file not found for this model' });
      }

      const config = await modelConfigService.loadConfigFile(model.configFilePath);
      const fileName = `${model.name.toLowerCase().replace(/\s+/g, '_')}_config.yml`;

      res.setHeader('Content-Type', 'application/x-yaml');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Convert config to YAML and send
      const yaml = await import('js-yaml');
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });
      
      res.send(yamlContent);
    } catch (error) {
      console.error('Error downloading config file:', error);
      res.status(500).json({ error: 'Failed to download config file' });
    }
  });

  app.put('/api/ai-models/:id/config', async (req, res) => {
    try {
      const { id } = req.params;
      const { config } = req.body;
      
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }

      // Validate config structure
      const validation = modelConfigService.validateConfig(config);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid config structure',
          details: validation.errors
        });
      }

      let configFilePath = model.configFilePath;
      
      if (configFilePath) {
        // Update existing config file
        await modelConfigService.updateConfigFile(configFilePath, config);
      } else {
        // Create new config file
        configFilePath = await modelConfigService.saveConfigFile(model.id, config);
        await storage.updateAiModel(id, {
          configFilePath: configFilePath
        });
      }

      res.json({
        success: true,
        message: 'Config file updated successfully',
        configFilePath: configFilePath
      });
    } catch (error) {
      console.error('Error updating config file:', error);
      res.status(500).json({ error: 'Failed to update config file' });
    }
  });

  // Upload and parse config file
  const configUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit for config files
    },
    fileFilter: (req, file, cb) => {
      const allowedExtensions = ['.yml', '.yaml', '.json'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Config file type ${ext} not supported. Supported formats: ${allowedExtensions.join(', ')}`));
      }
    }
  });

  app.post('/api/ai-models/:id/config/upload', configUpload.single('config'), async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No config file provided' });
      }

      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }

      // Parse the uploaded config file
      const tempConfigPath = path.join(process.cwd(), 'uploads', 'configs', `temp_${Date.now()}_${req.file.originalname}`);
      await fs.promises.writeFile(tempConfigPath, req.file.buffer);

      try {
        const config = await modelConfigService.parseUploadedConfig(tempConfigPath);
        
        // Validate config structure
        const validation = modelConfigService.validateConfig(config);
        if (!validation.valid) {
          await fs.promises.unlink(tempConfigPath); // Clean up temp file
          return res.status(400).json({ 
            error: 'Invalid config file structure',
            details: validation.errors
          });
        }

        // Save as the model's config file
        const configFilePath = await modelConfigService.saveConfigFile(model.id, config);
        
        // Update model with config file path
        await storage.updateAiModel(id, {
          configFilePath: configFilePath
        });

        // Clean up temp file
        await fs.promises.unlink(tempConfigPath);

        res.json({
          success: true,
          message: 'Config file uploaded and parsed successfully',
          config: config,
          configFilePath: configFilePath
        });
      } catch (parseError) {
        // Clean up temp file on error
        await fs.promises.unlink(tempConfigPath);
        throw parseError;
      }
    } catch (error) {
      console.error('Error uploading config file:', error);
      res.status(500).json({ error: 'Failed to upload config file' });
    }
  });

  // Initialize default data sources if they don't exist
  app.post('/api/initialize-sample-data', async (req, res) => {
    try {
      const existingDataSources = await storage.getDataSources();
      
      // Check if sample data sources already exist
      const sapExists = existingDataSources.some(ds => ds.id === 'sap-erp');
      const salesforceExists = existingDataSources.some(ds => ds.id === 'salesforce-crm');
      const avevaExists = existingDataSources.some(ds => ds.id === 'aveva-pi');
      
      const created = [];
      
      if (!sapExists) {
        const sapDataSource = await storage.createDataSource({
          id: 'sap-erp',
          name: 'SAP ERP',
          type: 'ERP',
          category: 'Enterprise Resource Planning',
          vendor: 'SAP',
          status: 'connected',
          config: {
            host: 'sap-erp-prod.company.com',
            port: 8000,
            systemNumber: '00',
            client: '100'
          },
          connectionDetails: {
            authentication: 'Basic',
            lastConnection: new Date().toISOString(),
            connectionString: 'sap://sap-erp-prod:8000/100'
          },
          recordCount: 25
        });
        created.push('SAP ERP');
      }
      
      if (!salesforceExists) {
        const salesforceDataSource = await storage.createDataSource({
          id: 'salesforce-crm',
          name: 'Salesforce CRM',
          type: 'CRM',
          category: 'Customer Relationship Management',
          vendor: 'Salesforce',
          status: 'connected',
          config: {
            instanceUrl: 'https://company.salesforce.com',
            apiVersion: 'v58.0',
            username: 'admin@company.com'
          },
          connectionDetails: {
            authentication: 'OAuth 2.0',
            lastConnection: new Date().toISOString(),
            features: ['Real-time sync', 'Bulk API', 'Custom fields']
          },
          recordCount: 15
        });
        created.push('Salesforce CRM');
      }
      
      if (!avevaExists) {
        const avevaDataSource = await storage.createDataSource({
          id: 'aveva-pi',
          name: 'AVEVA PI System',
          type: 'Historian',
          category: 'Manufacturing/Operations',
          vendor: 'AVEVA',
          status: 'connected',
          config: {
            piServerUrl: 'https://aveva-pi.company.com/piwebapi',
            version: '2023',
            database: 'PetroLux_PI'
          },
          connectionDetails: {
            authentication: 'Windows Authentication',
            lastConnection: new Date().toISOString(),
            features: ['Real-time data streaming', 'Time-series database', 'Asset Framework']
          },
          recordCount: 15
        });
        created.push('AVEVA PI System');
      }
      
      res.json({
        success: true,
        message: created.length > 0 ? `Created ${created.length} sample data sources: ${created.join(', ')}` : 'All sample data sources already exist',
        created: created
      });
    } catch (error) {
      console.error('Error initializing sample data:', error);
      res.status(500).json({ error: 'Failed to initialize sample data' });
    }
  });

  // AI Model Execution APIs
  
  // Import model execution service
  const { modelExecutionService } = await import('./modelExecutionService');
  
  // Execute AI model with data
  app.post("/api/ai-models/execute", async (req, res) => {
    try {
      const { modelId, configId, inputData } = req.body;
      
      if (!modelId || !inputData) {
        return res.status(400).json({ 
          error: "Missing required fields: modelId and inputData are required" 
        });
      }
      
      // Get AI model information
      const model = await storage.getAiModel(modelId);
      if (!model) {
        return res.status(404).json({ error: "AI model not found" });
      }
      
      // Get model configuration if provided
      let modelConfig = null;
      if (configId) {
        modelConfig = await storage.getModelConfiguration(configId);
        if (!modelConfig) {
          return res.status(404).json({ error: "Model configuration not found" });
        }
      }
      
      // Construct model file path
      const modelPath = path.join(__dirname, '../uploads', model.filePath);
      
      // Prepare execution configuration
      const executionConfig = {
        modelPath,
        inputData,
        inputSpecs: model.inputs || [],
        outputSpecs: model.outputs || [],
        modelId,
        configurationId: configId
      };
      
      console.log('🤖 Executing AI model:', {
        modelId,
        modelName: model.name,
        modelPath,
        configId,
        inputDataKeys: Object.keys(inputData)
      });
      
      // Execute the model
      const result = await modelExecutionService.executeModel(executionConfig);
      
      if (result.success) {
        res.json({
          success: true,
          modelId,
          modelName: model.name,
          results: result.results,
          executionTime: result.executionTime,
          message: "Model executed successfully"
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          modelId,
          modelName: model.name
        });
      }
      
    } catch (error) {
      console.error("Error executing AI model:", error);
      res.status(500).json({ 
        error: "Failed to execute AI model",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get Python environment status
  app.get("/api/ai-models/python-env", async (req, res) => {
    try {
      const envStatus = await modelExecutionService.checkPythonEnvironment();
      res.json(envStatus);
    } catch (error) {
      console.error("Error checking Python environment:", error);
      res.status(500).json({ 
        error: "Failed to check Python environment",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test model execution with sample data
  app.post("/api/ai-models/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const { sampleData } = req.body;
      
      // Get AI model
      const model = await storage.getAiModel(id);
      if (!model) {
        return res.status(404).json({ error: "AI model not found" });
      }
      
      // Use provided sample data or create default test data
      const testData = sampleData || {
        graph_signal: [[1, 2, 3], [4, 5, 6]],
        adjacency_matrix: [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
      };
      
      // Construct model file path
      const modelPath = path.join(__dirname, '../uploads', model.filePath);
      
      // Prepare execution configuration
      const executionConfig = {
        modelPath,
        inputData: testData,
        inputSpecs: model.inputs || [],
        outputSpecs: model.outputs || []
      };
      
      console.log('🧪 Testing AI model:', {
        modelId: id,
        modelName: model.name,
        testDataKeys: Object.keys(testData)
      });
      
      // Execute the model
      const result = await modelExecutionService.executeModel(executionConfig);
      
      res.json({
        success: result.success,
        modelId: id,
        modelName: model.name,
        testData,
        results: result.results,
        error: result.error,
        executionTime: result.executionTime
      });
      
    } catch (error) {
      console.error("Error testing AI model:", error);
      res.status(500).json({ 
        error: "Failed to test AI model",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Model Results API
  
  // Get all AI model results
  app.get("/api/ai-model-results", async (req, res) => {
    try {
      const results = await storage.getAiModelResults();
      res.json(results);
    } catch (error) {
      console.error("Error fetching AI model results:", error);
      res.status(500).json({ error: "Failed to fetch AI model results" });
    }
  });

  // Get AI model result by ID
  app.get("/api/ai-model-results/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.getAiModelResult(id);
      
      if (!result) {
        return res.status(404).json({ error: "AI model result not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching AI model result:", error);
      res.status(500).json({ error: "Failed to fetch AI model result" });
    }
  });

  // Get AI model results by configuration
  app.get("/api/ai-model-results/configuration/:configId", async (req, res) => {
    try {
      const { configId } = req.params;
      const results = await storage.getAiModelResultsByConfiguration(configId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching AI model results by configuration:", error);
      res.status(500).json({ error: "Failed to fetch AI model results by configuration" });
    }
  });

  // Create AI model result
  app.post("/api/ai-model-results", async (req, res) => {
    try {
      const validatedData = insertAiModelResultSchema.parse(req.body);
      const result = await storage.createAiModelResult(validatedData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating AI model result:", error);
      res.status(500).json({ error: "Failed to create AI model result" });
    }
  });

  // Update AI model result
  app.put("/api/ai-model-results/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const result = await storage.updateAiModelResult(id, updates);
      res.json(result);
    } catch (error) {
      console.error("Error updating AI model result:", error);
      res.status(500).json({ error: "Failed to update AI model result" });
    }
  });

  // Delete AI model result
  app.delete("/api/ai-model-results/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAiModelResult(id);
      res.status(200).json({ message: "AI model result deleted successfully" });
    } catch (error) {
      console.error("Error deleting AI model result:", error);
      res.status(500).json({ error: "Failed to delete AI model result" });
    }
  });

  // AI Model Folders API

  // Get all AI model folders
  app.get("/api/ai-model-folders", async (req, res) => {
    try {
      const folders = await storage.getAiModelFolders();
      res.json(folders);
    } catch (error) {
      console.error("Error fetching AI model folders:", error);
      res.status(500).json({ error: "Failed to fetch AI model folders" });
    }
  });

  // Get AI model folder by ID
  app.get("/api/ai-model-folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const folder = await storage.getAiModelFolder(id);
      
      if (!folder) {
        return res.status(404).json({ error: "AI model folder not found" });
      }
      
      res.json(folder);
    } catch (error) {
      console.error("Error fetching AI model folder:", error);
      res.status(500).json({ error: "Failed to fetch AI model folder" });
    }
  });

  // Create AI model folder
  app.post("/api/ai-model-folders", async (req, res) => {
    try {
      const validatedData = insertAiModelFolderSchema.parse(req.body);
      const folder = await storage.createAiModelFolder(validatedData);
      res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating AI model folder:", error);
      res.status(500).json({ error: "Failed to create AI model folder" });
    }
  });

  // Update AI model folder
  app.put("/api/ai-model-folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const folder = await storage.updateAiModelFolder(id, updates);
      res.json(folder);
    } catch (error) {
      console.error("Error updating AI model folder:", error);
      res.status(500).json({ error: "Failed to update AI model folder" });
    }
  });

  // Delete AI model folder
  app.delete("/api/ai-model-folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAiModelFolder(id);
      res.status(200).json({ message: "AI model folder deleted successfully" });
    } catch (error) {
      console.error("Error deleting AI model folder:", error);
      res.status(500).json({ error: "Failed to delete AI model folder" });
    }
  });

  // Get AI models by folder
  app.get("/api/ai-model-folders/:id/models", async (req, res) => {
    try {
      const { id } = req.params;
      const models = await storage.getAiModelsByFolder(id);
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models by folder:", error);
      res.status(500).json({ error: "Failed to fetch AI models by folder" });
    }
  });

  // Enhanced AI Model Upload with Config Parsing (using existing enhancedUpload configuration)
  app.post("/api/ai-models/enhanced-upload", enhancedUpload.array('files'), async (req, res) => {
    try {
      console.log('Enhanced model upload request received');
      
      const files = req.files as Express.Multer.File[];
      const { name, description, type, parsedConfig } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "At least one file is required" });
      }
      
      if (!name) {
        return res.status(400).json({ error: "Model name is required" });
      }

      console.log(`Processing ${files.length} files for model: ${name}`);
      
      // Organize files by type
      const organizedFiles = {
        model: [] as Express.Multer.File[],
        config: [] as Express.Multer.File[],
        source: [] as Express.Multer.File[],
        documentation: [] as Express.Multer.File[]
      };

      files.forEach((file, index) => {
        const fileType = req.body.fileTypes ? req.body.fileTypes[index] : 'model';
        if (organizedFiles[fileType as keyof typeof organizedFiles]) {
          organizedFiles[fileType as keyof typeof organizedFiles].push(file);
        }
      });

      // Process config file for input/output extraction
      let extractedConfig = null;
      if (parsedConfig) {
        try {
          extractedConfig = JSON.parse(parsedConfig);
          console.log('Parsed config:', extractedConfig);
        } catch (error) {
          console.error('Error parsing config:', error);
        }
      }

      // Create AI model entry
      const modelData = {
        name,
        description: description || '',
        modelType: type || 'Unknown',
        fileName: files[0].originalname,
        fileSize: files.reduce((sum, file) => sum + file.size, 0),
        filePath: files[0].path,
        category: 'uploaded',
        framework: type || 'Unknown',
        version: '1.0.0',
        accuracy: null,
        trainingStatus: 'ready',
        configFile: organizedFiles.config.length > 0 ? organizedFiles.config[0].path : null,
        sourceFiles: organizedFiles.source.map(f => f.path).join(','),
        documentationFiles: organizedFiles.documentation.map(f => f.path).join(','),
        extractedInputs: extractedConfig ? JSON.stringify(extractedConfig.inputs) : null,
        extractedOutputs: extractedConfig ? JSON.stringify(extractedConfig.outputs) : null,
        modelInfo: extractedConfig ? JSON.stringify(extractedConfig.modelInfo) : null,
        analyzedAt: new Date()
      };

      const result = await storage.createAiModel(modelData);
      
      console.log('Enhanced model upload completed:', result.id);
      
      res.status(201).json({
        ...result,
        message: 'Model uploaded successfully with enhanced configuration',
        fileCount: files.length,
        extractedConfig: extractedConfig ? {
          inputCount: extractedConfig.inputs?.length || 0,
          outputCount: extractedConfig.outputs?.length || 0
        } : null
      });
      
    } catch (error) {
      console.error("Error in enhanced model upload:", error);
      res.status(500).json({ 
        error: "Failed to upload model",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
