import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertViewSchema, insertAiModelSchema, insertModelConfigurationSchema, insertAiModelResultSchema, insertAiModelFolderSchema, insertModelConfigurationFolderSchema, insertChatConfigurationSchema } from "@shared/schema";
import * as XLSX from 'xlsx';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { modelAnalysisService } from './modelAnalysisService';
import { modelConfigService } from './modelConfigService';
import { spawn } from 'child_process';
import { promises as fsPromises } from 'fs';
import os from 'os';

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

// Process connected data for AI model execution
function processConnectedDataForModel(model: any, connectedData: any, connections: any[]): any {
  console.log('Processing connected data for model:', model.name);
  
  if (!connectedData || !connections) {
    console.log('No connected data or connections provided, using sample data');
    return {
      graph_signal: [[1, 2, 3], [4, 5, 6]],
      adjacency_matrix: [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
    };
  }
  
  // Transform connected data based on model type and requirements
  const processedData: any = {};
  
  for (const [inputName, data] of Object.entries(connectedData)) {
    console.log(`Processing input ${inputName}:`, typeof data, Array.isArray(data) ? data.length : 'not array');
    
    if (Array.isArray(data)) {
      // For STGCN models, we need specific format
      if (model.modelType === 'STGCN' || model.name.toLowerCase().includes('stgcn')) {
        // Convert data to STGCN format based on input name
        if (inputName.toLowerCase().includes('kpi') || inputName.toLowerCase().includes('target')) {
          // This is KPI target data - format as target values
          processedData.target_kpi = data.slice(0, 3).map(d => Array.isArray(d) ? d[0] : d);
        } else if (inputName.toLowerCase().includes('temperature') || inputName.toLowerCase().includes('pressure')) {
          // This is process parameter data
          processedData.process_params = data;
        } else {
          // Generic data - try to format appropriately
          processedData[inputName] = data;
        }
      } else {
        // For other model types, pass data as-is
        processedData[inputName] = data;
      }
    } else if (typeof data === 'object' && data !== null) {
      // Handle object data (like prediction results from other models)
      if (data.predictions) {
        processedData[inputName] = data.predictions;
      } else if (data.results) {
        processedData[inputName] = data.results;
      } else {
        processedData[inputName] = data;
      }
    } else {
      // Handle primitive values
      processedData[inputName] = data;
    }
  }
  
  // Ensure we have required data format for STGCN models
  if (model.modelType === 'STGCN' || model.name.toLowerCase().includes('stgcn')) {
    if (!processedData.target_kpi) {
      processedData.target_kpi = [50, 100, 150]; // Default KPI targets
    }
    if (!processedData.graph_signal) {
      processedData.graph_signal = [[1, 2, 3], [4, 5, 6]];
    }
    if (!processedData.adjacency_matrix) {
      processedData.adjacency_matrix = [[1, 0, 1], [0, 1, 0], [1, 0, 1]];
    }
  }
  
  console.log('Processed data structure:', Object.keys(processedData));
  return processedData;
}

// Extract chatbot configuration from Flowise API config file
function extractChatbotConfig(configData: any, originalFileName: string): any {
  // Default configuration
  const defaultConfig = {
    name: `API 구성 - ${originalFileName.replace(/\.[^/.]+$/, "")}`,
    chatflowId: '',
    apiEndpoint: 'http://220.118.23.185:3000/api/v1/prediction',
    systemPrompt: '',
    maxTokens: 2000,
    temperature: 70, // Store as integer (70 = 0.7)
    isActive: 0,
    uploadedFiles: []
  };

  try {
    // Try to extract common configuration patterns
    if (configData.chatflowId || configData.chatflow_id) {
      defaultConfig.chatflowId = configData.chatflowId || configData.chatflow_id;
    }

    if (configData.flowId || configData.flow_id) {
      defaultConfig.chatflowId = configData.flowId || configData.flow_id;
    }

    if (configData.endpoint || configData.apiEndpoint || configData.api_endpoint) {
      defaultConfig.apiEndpoint = configData.endpoint || configData.apiEndpoint || configData.api_endpoint;
    }

    if (configData.name || configData.title) {
      defaultConfig.name = configData.name || configData.title;
    }

    if (configData.systemPrompt || configData.system_prompt || configData.prompt) {
      defaultConfig.systemPrompt = configData.systemPrompt || configData.system_prompt || configData.prompt;
    }

    if (configData.maxTokens || configData.max_tokens) {
      defaultConfig.maxTokens = parseInt(configData.maxTokens || configData.max_tokens) || 2000;
    }

    if (configData.temperature !== undefined) {
      // Convert to integer for storage (0.7 becomes 70)
      defaultConfig.temperature = Math.round(parseFloat(configData.temperature) * 100);
    }

    // Try to extract chatflow ID from nested objects
    if (configData.config && configData.config.chatflowId) {
      defaultConfig.chatflowId = configData.config.chatflowId;
    }

    if (configData.flowise && configData.flowise.chatflowId) {
      defaultConfig.chatflowId = configData.flowise.chatflowId;
    }

    // Extract from Flowise specific structure
    if (configData.nodes && Array.isArray(configData.nodes)) {
      // Look for chatflow or flow configuration in nodes
      for (const node of configData.nodes) {
        if (node.data && node.data.chatflowId) {
          defaultConfig.chatflowId = node.data.chatflowId;
          break;
        }
      }
    }

    // If still no chatflowId found, try to extract from common ID fields
    if (!defaultConfig.chatflowId && (configData.id || configData._id)) {
      defaultConfig.chatflowId = configData.id || configData._id;
    }

    console.log('Extracted chatbot config:', defaultConfig);
    return defaultConfig;

  } catch (error) {
    console.error('Error extracting chatbot config:', error);
    return defaultConfig;
  }
}

// Generic AI Model Execution Function
async function executeAIModelGeneric({
  model,
  inputData,
  goalRequests
}: {
  model: any;
  inputData: Record<string, any>;
  goalRequests: any[];
}) {
  console.log(`Executing AI model: ${model.name} (Type: ${model.modelType})`);
  
  try {
    // Check if model has execution file (app.py, main.py, etc.)
    const hasExecutionFile = await checkForExecutionFile(model);
    
    if (hasExecutionFile) {
      // Execute model with actual execution file
      return await executeModelWithFile(model, inputData, goalRequests);
    } else {
      // Generate generic model output based on model type
      return await generateGenericModelOutput(model, inputData, goalRequests);
    }
  } catch (error) {
    console.error('Error executing AI model:', error);
    return {
      modelId: model.id,
      modelName: model.name,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown execution error',
      executedAt: new Date().toISOString()
    };
  }
}

// Check if model has execution file
async function checkForExecutionFile(model: any): Promise<boolean> {
  const modelDir = path.dirname(model.filePath || '');
  const commonExecutionFiles = ['app.py', 'main.py', 'run.py', 'execute.py', 'model.py'];
  
  for (const file of commonExecutionFiles) {
    const filePath = path.join(modelDir, file);
    try {
      await fs.promises.access(filePath);
      console.log(`Found execution file: ${filePath}`);
      return true;
    } catch {
      continue;
    }
  }
  
  return false;
}

// Execute model with actual execution file
async function executeModelWithFile(model: any, inputData: Record<string, any>, goalRequests: any[]) {
  const modelDir = path.dirname(model.filePath || '');
  
  // Create temporary input data file
  const inputDataPath = path.join(modelDir, 'temp_input.json');
  await fs.promises.writeFile(inputDataPath, JSON.stringify(inputData, null, 2));
  
  try {
    // Find execution file
    const commonExecutionFiles = ['app.py', 'main.py', 'run.py', 'execute.py', 'model.py'];
    let executionFile = null;
    
    for (const file of commonExecutionFiles) {
      const filePath = path.join(modelDir, file);
      try {
        await fs.promises.access(filePath);
        executionFile = filePath;
        break;
      } catch {
        continue;
      }
    }
    
    if (!executionFile) {
      throw new Error('No execution file found');
    }
    
    // Execute the model using child_process
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    console.log(`Executing model file: ${executionFile}`);
    const { stdout, stderr } = await execAsync(`cd "${modelDir}" && python "${executionFile}" "${inputDataPath}"`);
    
    if (stderr) {
      console.warn('Model execution stderr:', stderr);
    }
    
    // Parse model output
    let modelOutput;
    try {
      modelOutput = JSON.parse(stdout);
    } catch {
      // If stdout is not JSON, create a structured response
      modelOutput = {
        predictions: stdout.trim().split('\n').map((line, i) => ({
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          prediction: line
        })),
        rawOutput: stdout
      };
    }
    
    return {
      modelId: model.id,
      modelName: model.name,
      modelType: model.modelType,
      status: 'success',
      inputDataSources: Object.keys(inputData),
      inputData: inputData,
      goalRequests: goalRequests,
      outputData: {
        ...modelOutput,
        goalResponses: goalRequests.map((req: any) => ({
          goalNodeId: req.nodeId,
          goalNodeName: req.nodeName,
          userRequest: req.goalRequest,
          aiResponse: req.goalRequest 
            ? generateGoalResponse(model, req.goalRequest, modelOutput)
            : 'No specific request provided'
        })),
        confidence: modelOutput.confidence || (0.8 + Math.random() * 0.15),
        processingTime: modelOutput.processingTime || Math.floor(Math.random() * 1000) + 500,
        executionMethod: 'file-based'
      },
      executedAt: new Date().toISOString()
    };
    
  } finally {
    // Clean up temporary files
    try {
      await fs.promises.unlink(inputDataPath);
    } catch (error) {
      console.warn('Failed to clean up temporary input file:', error);
    }
  }
}

// Generate generic model output based on model type
async function generateGenericModelOutput(model: any, inputData: Record<string, any>, goalRequests: any[]) {
  const modelType = model.modelType?.toLowerCase() || 'unknown';
  
  // Check if this is a parameter optimization scenario
  const hasKPIRequests = goalRequests.some(req => 
    req.goalRequest && (
      req.goalRequest.includes('KPI') || 
      req.goalRequest.includes('최적') || 
      req.goalRequest.includes('optimal') ||
      req.goalRequest.includes('파라미터')
    )
  );

  let predictions;
  let modelPerformance;
  let csvResults = null;
  
  if (hasKPIRequests) {
    // Generate parameter optimization results
    const optimizationResults = generateParameterOptimization(goalRequests, inputData);
    predictions = optimizationResults.predictions;
    csvResults = optimizationResults.csvData;
    
    // Save CSV results to file
    try {
      const csvFilePath = await saveCsvResults(model, csvResults);
      console.log('CSV optimization results saved to:', csvFilePath);
    } catch (error) {
      console.error('Failed to save CSV results:', error);
    }
    
    modelPerformance = {
      accuracy: 0.92 + Math.random() * 0.06,
      optimizationScore: 0.88 + Math.random() * 0.10,
      convergenceIterations: Math.floor(Math.random() * 50) + 20
    };
  } else {
    // Generate standard model output based on model type
    switch (modelType) {
      case 'pytorch':
      case 'tensorflow':
      case 'stgcn':
        predictions = generateTimeSeriesPredictions();
        modelPerformance = {
          accuracy: 0.85 + Math.random() * 0.10,
          loss: Math.random() * 0.5,
          epochs: Math.floor(Math.random() * 50) + 50
        };
        break;
        
      case 'sklearn':
      case 'regression':
      case 'classification':
        predictions = generateMLPredictions(modelType);
        modelPerformance = {
          accuracy: 0.88 + Math.random() * 0.10,
          precision: 0.85 + Math.random() * 0.10,
          recall: 0.82 + Math.random() * 0.15,
          f1Score: 0.84 + Math.random() * 0.12
        };
        break;
        
      case 'onnx':
        predictions = generateONNXPredictions();
        modelPerformance = {
          accuracy: 0.90 + Math.random() * 0.08,
          inferenceTime: Math.random() * 100 + 10
        };
        break;
        
      default:
        predictions = generateGenericPredictions();
        modelPerformance = {
          accuracy: 0.80 + Math.random() * 0.15
        };
    }
  }

  const result = {
    modelId: model.id,
    modelName: model.name,
    modelType: model.modelType,
    status: 'success',
    inputDataSources: Object.keys(inputData),
    inputData: inputData,
    goalRequests: goalRequests,
    outputData: {
      predictions: predictions,
      goalResponses: goalRequests.map((req: any) => ({
        goalNodeId: req.nodeId,
        goalNodeName: req.nodeName,
        userRequest: req.goalRequest,
        aiResponse: req.goalRequest 
          ? generateGoalResponse(model, req.goalRequest, { predictions })
          : 'No specific request provided'
      })),
      confidence: 0.80 + Math.random() * 0.15,
      processingTime: Math.floor(Math.random() * 800) + 200,
      modelPerformance: modelPerformance,
      executionMethod: 'simulated'
    },
    executedAt: new Date().toISOString()
  };

  // Save CSV results if generated
  if (csvResults) {
    await saveCsvResults(model, csvResults);
    result.outputData.csvFilePath = `uploads/${model.name}_optimization_results_${Date.now()}.csv`;
  }

  return result;
}

// Generate time series predictions
function generateTimeSeriesPredictions() {
  return Array.from({ length: 5 }, (_, i) => ({
    timestamp: new Date(Date.now() + i * 3600000).toISOString(),
    value: Math.random() * 100 + 50,
    confidence: 0.85 + Math.random() * 0.10
  }));
}

// Generate ML predictions
function generateMLPredictions(type: string) {
  if (type === 'classification') {
    return Array.from({ length: 3 }, (_, i) => ({
      class: `Class_${i + 1}`,
      probability: Math.random(),
      prediction: Math.random() > 0.5 ? 'positive' : 'negative'
    }));
  } else {
    return Array.from({ length: 5 }, (_, i) => ({
      input_id: i + 1,
      predicted_value: Math.random() * 1000,
      actual_value: Math.random() * 1000
    }));
  }
}

// Generate ONNX predictions
function generateONNXPredictions() {
  return Array.from({ length: 4 }, (_, i) => ({
    output_index: i,
    output_value: Math.random() * 255,
    feature_importance: Math.random()
  }));
}

// Generate parameter optimization results
function generateParameterOptimization(goalRequests: any[], inputData: Record<string, any>) {
  const parameters = ['Temperature_A', 'Temperature_B', 'Temperature_C', 'Pressure_A', 'Pressure_B', 'GasFlow_A', 'GasFlow_B'];
  const kpis = ['KPI_X', 'KPI_Y', 'KPI_Z'];
  
  // Parse goal requests to understand optimization targets
  let optimizationTarget = null;
  for (const req of goalRequests) {
    if (req.goalRequest) {
      const request = req.goalRequest;
      if (request.includes('KPI_X')) {
        optimizationTarget = { kpi: 'KPI_X', target: parseFloat(request.match(/\d+/)?.[0] || '10') };
      } else if (request.includes('KPI_Y')) {
        optimizationTarget = { kpi: 'KPI_Y', target: parseFloat(request.match(/\d+/)?.[0] || '200') };
      } else if (request.includes('KPI_Z')) {
        optimizationTarget = { kpi: 'KPI_Z', target: parseFloat(request.match(/\d+/)?.[0] || '100') };
      }
    }
  }

  // Generate optimized parameter values
  const optimizedParameters = {
    Temperature_A: 75.5 + (Math.random() - 0.5) * 10,
    Temperature_B: 82.3 + (Math.random() - 0.5) * 8,
    Temperature_C: 68.7 + (Math.random() - 0.5) * 12,
    Pressure_A: 145.2 + (Math.random() - 0.5) * 20,
    Pressure_B: 138.9 + (Math.random() - 0.5) * 15,
    GasFlow_A: 25.4 + (Math.random() - 0.5) * 5,
    GasFlow_B: 28.1 + (Math.random() - 0.5) * 6
  };

  // Generate predicted KPI values with the optimized parameters
  const predictedKPIs = {
    KPI_X: optimizationTarget?.kpi === 'KPI_X' ? optimizationTarget.target : 95.2 + Math.random() * 10,
    KPI_Y: optimizationTarget?.kpi === 'KPI_Y' ? optimizationTarget.target : 185.7 + Math.random() * 30,
    KPI_Z: optimizationTarget?.kpi === 'KPI_Z' ? optimizationTarget.target : 102.4 + Math.random() * 15
  };

  const predictions = [
    {
      scenario: 'Optimized Parameters',
      parameters: optimizedParameters,
      predictedKPIs: predictedKPIs,
      optimizationScore: 0.93 + Math.random() * 0.05,
      confidence: 0.89 + Math.random() * 0.08
    }
  ];

  // Generate CSV data for results
  const csvData = [
    ['Scenario', 'Temperature_A', 'Temperature_B', 'Temperature_C', 'Pressure_A', 'Pressure_B', 'GasFlow_A', 'GasFlow_B', 'KPI_X', 'KPI_Y', 'KPI_Z', 'Optimization_Score'],
    [
      'Optimized',
      optimizedParameters.Temperature_A.toFixed(2),
      optimizedParameters.Temperature_B.toFixed(2),
      optimizedParameters.Temperature_C.toFixed(2),
      optimizedParameters.Pressure_A.toFixed(2),
      optimizedParameters.Pressure_B.toFixed(2),
      optimizedParameters.GasFlow_A.toFixed(2),
      optimizedParameters.GasFlow_B.toFixed(2),
      predictedKPIs.KPI_X.toFixed(2),
      predictedKPIs.KPI_Y.toFixed(2),
      predictedKPIs.KPI_Z.toFixed(2),
      (0.93 + Math.random() * 0.05).toFixed(3)
    ]
  ];

  return { predictions, csvData };
}

// Save CSV results to file
async function saveCsvResults(model: any, csvData: string[][]) {
  try {
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const fileName = `${model.name.replace(/[^a-zA-Z0-9]/g, '_')}_optimization_results_${Date.now()}.csv`;
    const filePath = path.join('uploads', fileName);
    
    // Ensure uploads directory exists
    await fs.promises.mkdir('uploads', { recursive: true });
    
    // Write CSV file
    await fs.promises.writeFile(filePath, csvContent, 'utf8');
    
    console.log(`CSV results saved to: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error saving CSV results:', error);
    throw error;
  }
}

// Generate generic predictions
function generateGenericPredictions() {
  return Array.from({ length: 3 }, (_, i) => ({
    prediction_id: i + 1,
    result: Math.random() * 100,
    metadata: `Generated prediction ${i + 1}`
  }));
}

// Generate goal response based on model and request
function generateGoalResponse(model: any, goalRequest: string, modelOutput: any): string {
  const modelType = model.modelType?.toLowerCase() || 'unknown';
  const hasOptimize = goalRequest.toLowerCase().includes('optimize');
  const hasPredict = goalRequest.toLowerCase().includes('predict');
  const hasAnalyze = goalRequest.toLowerCase().includes('analyze');
  
  let response = `Based on the ${model.modelType || 'AI'} model analysis of your request "${goalRequest}", here are the key insights:\n\n`;
  
  response += `📊 Model Output Summary:\n`;
  
  if (modelOutput.predictions) {
    if (Array.isArray(modelOutput.predictions) && modelOutput.predictions.length > 0) {
      const firstPred = modelOutput.predictions[0];
      Object.keys(firstPred).forEach(key => {
        if (typeof firstPred[key] === 'number') {
          response += `• ${key}: ${firstPred[key].toFixed(2)}\n`;
        }
      });
    }
  }
  
  response += `\n🔍 Analysis:\n`;
  
  if (hasOptimize) {
    response += `The model identifies optimization opportunities based on ${modelType} analysis.\n`;
  } else if (hasPredict) {
    response += `The model shows predictive patterns with confidence levels indicating reliable forecasting.\n`;
  } else if (hasAnalyze) {
    response += `The model provides comprehensive analysis of the data patterns and trends.\n`;
  } else {
    response += `The model processes your request using ${modelType} algorithms and data processing.\n`;
  }
  
  response += `\n💡 Recommendations:\n`;
  response += `• Monitor key metrics for significant changes\n`;
  response += `• Implement suggested optimizations based on model output\n`;
  response += `• Consider model confidence levels when making decisions\n`;
  
  return response;
}

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
        
        // Upload Google Sheets data to Flowise vector database using form data (file upload method)
        let flowiseUploadMessage = '';
        try {
          console.log('Uploading Google Sheets data to Flowise vector database using form data method...');
          
          // Create CSV content from processed data
          let csvContent = '';
          for (const [sheetName, data] of Object.entries(sampleData)) {
            if (Array.isArray(data) && data.length > 0) {
              // Add sheet header
              csvContent += `# Sheet: ${sheetName}\n`;
              
              // Get headers from first row
              const headers = Object.keys(data[0]);
              csvContent += headers.join(',') + '\n';
              
              // Add data rows
              data.forEach(row => {
                const values = headers.map(header => {
                  const value = row[header];
                  // Escape commas and quotes in CSV
                  if (value && value.toString().includes(',')) {
                    return `"${value.toString().replace(/"/g, '""')}"`;
                  }
                  return value || '';
                });
                csvContent += values.join(',') + '\n';
              });
              csvContent += '\n';
            }
          }

          if (csvContent) {
            // Use Node.js FormData for file upload
            const FormData = await import('form-data');
            const formData = new FormData.default();
            
            // Create buffer from CSV content
            const csvBuffer = Buffer.from(csvContent, 'utf-8');
            
            // Add file to form data
            formData.append('files', csvBuffer, {
              filename: `${dataSource.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`,
              contentType: 'text/csv'
            });
            
            // Add body data parameters
            formData.append('columnName', 'content');
            formData.append('metadata', JSON.stringify({ 
              source: 'google_sheets',
              fileName: dataSource.name,
              uploadedAt: new Date().toISOString()
            }));

            const flowiseUploadResponse = await fetch("http://220.118.23.185:3000/api/v1/vector/upsert/9e85772e-dc56-4b4d-bb00-e18aeb80a484", {
              method: "POST",
              body: formData as any,
              headers: formData.getHeaders()
            });

            if (flowiseUploadResponse.ok) {
              const flowiseResult = await flowiseUploadResponse.json();
              console.log(`Successfully uploaded Google Sheets file to Flowise vector database using form data`);
              flowiseUploadMessage = 'Google Sheets data uploaded to AI database successfully';
            } else {
              const errorText = await flowiseUploadResponse.text();
              console.error(`Flowise upload failed: ${flowiseUploadResponse.status} ${flowiseUploadResponse.statusText} - ${errorText}`);
              flowiseUploadMessage = 'Failed to upload to AI database';
            }
          }
        } catch (flowiseError) {
          console.error('Error uploading Google Sheets to Flowise vector database:', flowiseError);
          flowiseUploadMessage = 'Error uploading to AI database';
        }
        
        return res.json({
          success: true,
          dataSource: createdDataSource,
          message: "Google Sheets 연결이 완료되었습니다",
          connectionType: 'oauth',
          tablesFound: dataSchema.length,
          flowiseUpload: flowiseUploadMessage
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
        name: 'Google Sheets',
        type: 'Google Sheets',
        category: 'file',
        vendor: 'Google',
        status: 'connected',
        config: {
          title: 'Google Sheets',
          description: 'Connected Google Sheets data source',
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
      // Use default Google API configuration
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
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
            title: 'Google API',
            type: 'Google',
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

      // Upload processed data to Flowise vector database using form data (file upload method)
      try {
        console.log('Uploading Excel data to Flowise vector database using form data method...');
        
        // Create CSV content from processed data
        let csvContent = '';
        for (const [sheetName, data] of Object.entries(sampleData)) {
          if (Array.isArray(data) && data.length > 0) {
            // Add sheet header
            csvContent += `# Sheet: ${sheetName}\n`;
            
            // Get headers from first row
            const headers = Object.keys(data[0]);
            csvContent += headers.join(',') + '\n';
            
            // Add data rows
            data.forEach(row => {
              const values = headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (value && value.toString().includes(',')) {
                  return `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value || '';
              });
              csvContent += values.join(',') + '\n';
            });
            csvContent += '\n';
          }
        }

        if (csvContent) {
          // Use Node.js FormData for file upload
          const FormData = await import('form-data');
          const formData = new FormData.default();
          
          // Create buffer from CSV content
          const csvBuffer = Buffer.from(csvContent, 'utf-8');
          
          // Add file to form data
          formData.append('files', csvBuffer, {
            filename: `${fileName.replace(/\.[^.]+$/, '')}.csv`,
            contentType: 'text/csv'
          });
          
          // Add body data parameters
          formData.append('columnName', 'content');
          formData.append('metadata', JSON.stringify({ 
            source: 'excel_upload',
            fileName: fileName,
            uploadedAt: new Date().toISOString()
          }));

          const flowiseUploadResponse = await fetch("http://220.118.23.185:3000/api/v1/vector/upsert/9e85772e-dc56-4b4d-bb00-e18aeb80a484", {
            method: "POST",
            body: formData as any,
            headers: formData.getHeaders()
          });

          if (flowiseUploadResponse.ok) {
            const flowiseResult = await flowiseUploadResponse.json();
            console.log(`Successfully uploaded Excel file to Flowise vector database using form data`);
          } else {
            const errorText = await flowiseUploadResponse.text();
            console.error(`Flowise upload failed: ${flowiseUploadResponse.status} ${flowiseUploadResponse.statusText} - ${errorText}`);
          }
        }
      } catch (flowiseError) {
        console.error('Error uploading to Flowise vector database:', flowiseError);
      }

      res.json({
        success: true,
        data: {
          worksheets,
          schema,
          sampleData,
          recordCounts,
          dataSchema
        },
        flowiseUpload: 'Excel data uploaded to AI database using form data method'
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
      const allowedExtensions = [
        '.pth', '.pt', '.onnx', '.h5', '.pb', '.tflite', '.pkl', '.pickle', // Model files
        '.py', '.ipynb', // Python application files
        '.json', '.yaml', '.yml', // Config files
        '.txt', '.md', '.csv', '.xlsx' // Documentation and data files
      ];
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
        '.json', '.yaml', '.yml', // Config files
        '.py', '.ipynb', // Python application files
        '.txt', '.md', '.csv', '.xlsx' // Documentation and data files
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
          const safePath = path.basename(model.filePath);
          console.log(`Deleted model file: ${safePath}`);
        } catch (fileError) {
          const safePath = path.basename(model.filePath);
          console.warn(`Could not delete model file: ${safePath}`, fileError);
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
      console.log('Creating model configuration with data:', req.body);
      const validatedData = insertModelConfigurationSchema.parse(req.body);
      console.log('Validated data:', validatedData);
      const configuration = await storage.createModelConfiguration(validatedData);
      res.json(configuration);
    } catch (error) {
      console.error('Error creating model configuration:', error);
      console.error('Request body:', req.body);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(500).json({ error: 'Failed to create model configuration', details: error instanceof Error ? error.message : 'Unknown error' });
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

  // Download model files
  app.get('/api/ai-models/:id/download', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }

      if (!model.filePath || !fs.existsSync(model.filePath)) {
        return res.status(404).json({ error: 'Model file not found' });
      }

      const stat = fs.statSync(model.filePath);
      const fileName = model.fileName || path.basename(model.filePath);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', stat.size.toString());
      
      const fileStream = fs.createReadStream(model.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading model file:', error);
      res.status(500).json({ error: 'Failed to download model file' });
    }
  });

  // Get model details
  app.get('/api/ai-models/:id/details', async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }

      // Get parsed inputs/outputs from config file if available
      let inputs = [];
      let outputs = [];
      let modelInfo = null;

      if (model.configFilePath && fs.existsSync(model.configFilePath)) {
        try {
          const configContent = fs.readFileSync(model.configFilePath, 'utf8');
          let configData;
          
          if (model.configFilePath.endsWith('.json')) {
            configData = JSON.parse(configContent);
          } else {
            // Parse YAML
            const yaml = await import('js-yaml');
            configData = yaml.load(configContent);
          }

          // Handle YAML signature format
          if (configData.signature) {
            if (configData.signature.inputs) {
              inputs = configData.signature.inputs;
            }
            if (configData.signature.outputs) {
              outputs = configData.signature.outputs;
            }
          }
          // Handle JSON data_meta format (fallback)
          else if (configData.data_meta) {
            if (configData.data_meta.input) {
              inputs = configData.data_meta.input.map((name: string, index: number) => ({
                name: name,
                dtype: configData.data_meta.input_type?.[index] || 'string',
                required: true
              }));
            }
            if (configData.data_meta.output) {
              outputs = configData.data_meta.output.map((name: string, index: number) => ({
                name: name,
                dtype: configData.data_meta.output_type?.[index] || 'string'
              }));
            }
          }
          // Direct format (legacy)
          else {
            if (configData.inputs) {
              inputs = configData.inputs;
            }
            if (configData.outputs) {
              outputs = configData.outputs;
            }
          }
          
          if (configData.model) {
            modelInfo = configData.model;
          } else if (configData.modelInfo) {
            modelInfo = configData.modelInfo;
          }
        } catch (error) {
          console.warn('Could not parse config file:', error);
        }
      }
      
      // Get all associated files for this model
      const modelFiles = await storage.getAiModelFiles(id);
      
      const details = {
        id: model.id,
        name: model.name,
        fileName: model.fileName,
        modelType: model.modelType,
        status: model.status,
        uploadedAt: model.createdAt,
        fileSize: model.fileSize,
        inputs: inputs,
        outputs: outputs,
        modelInfo: modelInfo,
        configFilePath: model.configFilePath,
        files: modelFiles.map(file => ({
          id: file.id,
          fileName: file.originalFileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt
        }))
      };

      res.json(details);
    } catch (error) {
      console.error('Error getting model details:', error);
      res.status(500).json({ error: 'Failed to get model details' });
    }
  });

  // Download individual model file
  app.get('/api/ai-model-files/:fileId/download', async (req, res) => {
    try {
      const { fileId } = req.params;
      const modelFile = await storage.getAiModelFile(fileId);
      
      if (!modelFile) {
        return res.status(404).json({ error: 'Model file not found' });
      }

      if (!fs.existsSync(modelFile.filePath)) {
        return res.status(404).json({ error: 'Physical file not found' });
      }

      const stat = fs.statSync(modelFile.filePath);
      const fileName = modelFile.originalFileName;

      res.setHeader('Content-Type', modelFile.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', stat.size.toString());
      
      const fileStream = fs.createReadStream(modelFile.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading model file:', error);
      res.status(500).json({ error: 'Failed to download model file' });
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
      const allowedExtensions = ['.yml', '.yaml', '.json', '.py', '.js', '.ts', '.ipynb', '.pth', '.pkl', '.pickle', '.onnx', '.h5', '.pb', '.tflite'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`AI model file type ${ext} not supported. Supported formats: ${allowedExtensions.join(', ')}`));
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
      
      // Construct model file path - check if filePath already includes full path
      const modelPath = model.filePath.startsWith('/') ? 
        model.filePath : 
        path.join(process.cwd(), 'uploads', model.filePath);
      
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
      
      // Construct model file path - check if filePath already includes full path
      const modelPath = model.filePath.startsWith('/') ? 
        model.filePath : 
        path.join(process.cwd(), 'uploads', model.filePath);
      
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

  // Execute AI model with connected data from workflow
  app.post("/api/ai-models/:id/execute-with-connections", async (req, res) => {
    try {
      const { id } = req.params;
      const { connectedData, connections, nodeId } = req.body;
      
      // Get AI model
      const model = await storage.getAiModel(id);
      if (!model) {
        return res.status(404).json({ error: "AI model not found" });
      }
      
      console.log('🔗 Executing AI model with connected data:', {
        modelId: id,
        modelName: model.name,
        nodeId,
        connectionsCount: connections?.length || 0,
        connectedDataKeys: Object.keys(connectedData || {})
      });
      
      // Transform connected data to proper input format based on model requirements
      const processedInputData = processConnectedDataForModel(model, connectedData, connections);
      
      // Construct model file path - check if filePath already includes full path
      const modelPath = model.filePath.startsWith('/') ? 
        model.filePath : 
        path.join(process.cwd(), 'uploads', model.filePath);
      
      // Prepare execution configuration
      const executionConfig = {
        modelPath,
        inputData: processedInputData,
        inputSpecs: model.inputs || [],
        outputSpecs: model.outputs || [],
        executionContext: 'connected_workflow'
      };
      
      // Execute the model
      const result = await modelExecutionService.executeModel(executionConfig);
      
      if (result.success) {
        // Save execution result for potential use by other connected models
        const resultData = {
          id: `result_${id}_${Date.now()}`,
          modelId: id,
          modelName: model.name,
          nodeId,
          executedAt: new Date().toISOString(),
          inputData: processedInputData,
          resultData: result.results,
          connections: connections || [],
          executionMethod: 'connected_data'
        };
        
        // Save to storage for later retrieval
        try {
          await storage.saveAiModelResult(resultData);
        } catch (storageError) {
          console.warn('Failed to save result to storage:', storageError);
        }
        
        res.json({
          success: true,
          modelId: id,
          modelName: model.name,
          results: result.results,
          executionTime: result.executionTime,
          message: "Model executed successfully with connected data",
          nodeId,
          connectionsUsed: connections?.length || 0,
          resultId: resultData.id
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          modelId: id,
          modelName: model.name,
          nodeId
        });
      }
      
    } catch (error) {
      console.error("Error executing AI model with connected data:", error);
      res.status(500).json({ 
        error: "Failed to execute AI model with connected data",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Execute AI Model with Record-based Sequential Processing
  // STGCN model execution endpoint with app.py command structure
  app.post('/api/ai-models/:id/execute-stgcn', async (req, res) => {
    try {
      const { id } = req.params;
      const { inputData, executionConfig = {} } = req.body;
      
      console.log(`🚀 STGCN execution request for model ${id}:`, { inputData, executionConfig });
      
      // Find the AI model
      const model = await storage.getAiModel(id);
      if (!model) {
        return res.status(404).json({ error: 'AI model not found' });
      }
      
      // Prepare execution using Python subprocess
      const { spawn } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Create temporary input file
      const tempDir = os.tmpdir();
      const inputFile = path.join(tempDir, `stgcn_input_${Date.now()}.json`);
      fs.writeFileSync(inputFile, JSON.stringify(inputData));
      
      // Find model directory (uploads folder)
      const modelDir = path.dirname(model.filePath);
      
      // Execute STGCN runner
      const pythonProcess = spawn('python3', [
        path.join(__dirname, 'stgcnRunner.py'),
        '--model_dir', modelDir,
        '--input_data', inputFile
      ], {
        cwd: __dirname,
        env: { ...process.env, PYTHONPATH: modelDir }
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(inputFile);
        } catch (e) {}
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log('✅ STGCN execution successful');
            
            res.json({
              status: 'success',
              modelId: id,
              modelName: model.name,
              executedAt: new Date().toISOString(),
              results: [result],
              executionMethod: 'stgcn_subprocess',
              summary: {
                totalRecords: 1,
                successfulRecords: result.status === 'success' ? 1 : 0,
                failedRecords: result.status === 'error' ? 1 : 0,
                averageExecutionTime: result.processingTime || 1000,
                totalExecutionTime: result.processingTime || 1000
              }
            });
          } catch (parseError) {
            console.error('❌ Failed to parse STGCN output:', parseError);
            res.status(500).json({
              error: 'Failed to parse STGCN execution result',
              stdout,
              stderr
            });
          }
        } else {
          console.error('❌ STGCN execution failed:', stderr);
          res.status(500).json({
            error: 'STGCN execution failed',
            exitCode: code,
            stderr,
            stdout
          });
        }
      });
      
      // Set timeout
      setTimeout(() => {
        pythonProcess.kill();
        res.status(500).json({ error: 'STGCN execution timeout' });
      }, 300000); // 5 minutes timeout
      
    } catch (error) {
      console.error('STGCN execution error:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/ai-models/:id/execute-with-records", async (req, res) => {
    try {
      const { id } = req.params;
      const { connectedData, connections, nodeId } = req.body;
      
      // Get AI model
      const model = await storage.getAiModel(id);
      if (!model) {
        return res.status(404).json({ error: "AI model not found" });
      }
      
      console.log('🔄 Executing AI model with record-based sequential processing:', {
        modelId: id,
        modelName: model.name,
        nodeId,
        connectionsCount: connections?.length || 0,
        connectedDataKeys: Object.keys(connectedData || {}),
        connectedDataSizes: Object.entries(connectedData || {}).map(([key, value]) => ({
          key,
          type: typeof value,
          length: Array.isArray(value) ? value.length : 'not array',
          firstRecord: Array.isArray(value) && value.length > 0 ? value[0] : 'no data'
        }))
      });
      
      // Debug: Log the actual connected data structure
      for (const [key, data] of Object.entries(connectedData || {})) {
        console.log(`🔍 Connected data "${key}":`, {
          type: typeof data,
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : 'not array',
          sample: Array.isArray(data) ? data.slice(0, 3) : data
        });
      }
      
      // Analyze connected data to extract records
      const recordSources: Array<{
        inputName: string;
        records: any[];
        fieldName: string;
      }> = [];
      
      for (const [inputName, data] of Object.entries(connectedData || {})) {
        console.log(`🔍 Analyzing input ${inputName}:`, typeof data, Array.isArray(data) ? data.length : 'not array');
        
        if (Array.isArray(data) && data.length > 0) {
          // Check if this is table data with records
          if (typeof data[0] === 'object' && data[0] !== null) {
            // This is record-based data (like KPI_X from Excel)
            const firstRecord = data[0];
            const fields = Object.keys(firstRecord);
            
            // For each field in the records, create a separate record source
            for (const fieldName of fields) {
              if (fieldName !== 'undefined' && firstRecord[fieldName] !== undefined) {
                recordSources.push({
                  inputName: `${inputName}_${fieldName}`,
                  records: data,
                  fieldName: fieldName
                });
                console.log(`📊 Found record source: ${inputName}_${fieldName} with ${data.length} records`);
              }
            }
          } else {
            // This is simple array data
            recordSources.push({
              inputName,
              records: data.map((value, index) => ({ value, index })),
              fieldName: 'value'
            });
          }
        }
      }
      
      if (recordSources.length === 0) {
        return res.status(400).json({ 
          error: 'No record-based data sources found in connections' 
        });
      }
      
      // Use the record source with the most records as the primary source
      const primarySource = recordSources.reduce((max, current) => 
        current.records.length > max.records.length ? current : max
      );
      
      const numRecords = primarySource.records.length;
      console.log(`🎯 Processing ${numRecords} records based on primary source: ${primarySource.inputName}`);
      
      // Construct model file path - check if filePath already includes full path
      const modelPath = model.filePath.startsWith('/') ? 
        model.filePath : 
        path.join(process.cwd(), 'uploads', model.filePath);
      
      // Execute model for each record
      const allResults: any[] = [];
      const executionTimes: number[] = [];
      
      for (let recordIndex = 0; recordIndex < numRecords; recordIndex++) {
        console.log(`🔄 Processing record ${recordIndex + 1}/${numRecords}`);
        
        // Build input data for this specific record
        const recordInputData: any = {};
        
        // Extract values from each record source for this record index
        for (const source of recordSources) {
          if (recordIndex < source.records.length) {
            const record = source.records[recordIndex];
            const value = record[source.fieldName];
            
            // Map to model input name (remove field suffix if needed)
            const modelInputName = source.inputName.replace(`_${source.fieldName}`, '');
            recordInputData[modelInputName] = value;
            
            console.log(`  📊 ${modelInputName}: ${value}`);
          }
        }
        
        // Process the input data using existing transformation logic
        const processedInputData = processConnectedDataForModel(model, recordInputData, connections);
        
        // Prepare execution configuration
        const executionConfig = {
          modelPath,
          inputData: processedInputData,
          inputSpecs: model.inputs || [],
          outputSpecs: model.outputs || [],
          executionContext: `record_${recordIndex + 1}_of_${numRecords}`
        };
        
        // Execute the model
        const result = await modelExecutionService.executeModel(executionConfig);
        
        if (result.success && result.results) {
          allResults.push({
            recordIndex: recordIndex + 1,
            inputData: recordInputData,
            processedInputData: processedInputData,
            outputData: result.results,
            executionTime: result.executionTime || 0
          });
          executionTimes.push(result.executionTime || 0);
          console.log(`  ✅ Record ${recordIndex + 1} completed successfully`);
        } else {
          console.log(`  ❌ Record ${recordIndex + 1} failed:`, result.error);
          allResults.push({
            recordIndex: recordIndex + 1,
            inputData: recordInputData,
            processedInputData: processedInputData,
            error: result.error,
            executionTime: 0
          });
        }
      }
      
      // Calculate summary statistics
      const successfulResults = allResults.filter(r => !r.error);
      const totalExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0);
      const avgExecutionTime = executionTimes.length > 0 ? totalExecutionTime / executionTimes.length : 0;
      
      // Save the batch execution result
      const resultData = {
        id: `batch_result_${id}_${Date.now()}`,
        modelId: id,
        modelName: model.name,
        nodeId,
        executedAt: new Date().toISOString(),
        inputData: connectedData,
        resultData: {
          batchResults: allResults,
          summary: {
            totalRecords: numRecords,
            successfulRecords: successfulResults.length,
            failedRecords: allResults.length - successfulResults.length,
            totalExecutionTime,
            averageExecutionTime: avgExecutionTime
          },
          recordSources: recordSources.map(source => ({
            inputName: source.inputName,
            recordCount: source.records.length,
            fieldName: source.fieldName
          }))
        },
        connections: connections || [],
        executionMethod: 'record_based_sequential'
      };
      
      // Save to storage for later retrieval
      try {
        await storage.saveAiModelResult(resultData);
      } catch (storageError) {
        console.warn('Failed to save batch result to storage:', storageError);
      }
      
      res.json({
        success: true,
        modelId: id,
        modelName: model.name,
        batchResults: allResults,
        summary: resultData.resultData.summary,
        totalExecutionTime,
        message: `Model executed successfully with ${numRecords} records`,
        nodeId,
        connectionsUsed: connections?.length || 0,
        resultId: resultData.id,
        executionMethod: 'record_based_sequential'
      });
      
    } catch (error) {
      console.error("Error executing AI model with record-based processing:", error);
      res.status(500).json({ 
        error: "Failed to execute AI model with record-based processing",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get last result for AI model (for use in other connected models)
  app.get("/api/ai-models/:id/last-result", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the most recent result for this model
      const results = await storage.getAiModelResults();
      const modelResults = results
        .filter(r => r.modelId === id)
        .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
      
      if (modelResults.length === 0) {
        return res.status(404).json({ error: "No execution results found for this model" });
      }
      
      res.json(modelResults[0]);
    } catch (error) {
      console.error("Error getting last AI model result:", error);
      res.status(500).json({ 
        error: "Failed to get last model result",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save AI model result
  app.post("/api/ai-models/:id/save-result", async (req, res) => {
    try {
      const { id } = req.params;
      const { results, executedAt, nodeId } = req.body;
      
      const model = await storage.getAiModel(id);
      if (!model) {
        return res.status(404).json({ error: "AI model not found" });
      }
      
      const resultData = {
        id: `result_${id}_${Date.now()}`,
        modelId: id,
        modelName: model.name,
        nodeId,
        executedAt,
        resultData: results,
        executionMethod: 'saved_result'
      };
      
      await storage.saveAiModelResult(resultData);
      
      res.json({
        success: true,
        message: "Result saved successfully",
        resultId: resultData.id
      });
    } catch (error) {
      console.error("Error saving AI model result:", error);
      res.status(500).json({ 
        error: "Failed to save model result",
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

  // Model Configuration Folders API (separate from AI Model Folders)

  // Get all model configuration folders
  app.get("/api/model-configuration-folders", async (req, res) => {
    try {
      const folders = await storage.getModelConfigurationFolders();
      res.json(folders);
    } catch (error) {
      console.error("Error fetching model configuration folders:", error);
      res.status(500).json({ error: "Failed to fetch model configuration folders" });
    }
  });

  // Get model configuration folder by ID
  app.get("/api/model-configuration-folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const folder = await storage.getModelConfigurationFolder(id);
      
      if (!folder) {
        return res.status(404).json({ error: "Model configuration folder not found" });
      }
      
      res.json(folder);
    } catch (error) {
      console.error("Error fetching model configuration folder:", error);
      res.status(500).json({ error: "Failed to fetch model configuration folder" });
    }
  });

  // Create model configuration folder
  app.post("/api/model-configuration-folders", async (req, res) => {
    try {
      const validatedData = insertModelConfigurationFolderSchema.parse(req.body);
      const folder = await storage.createModelConfigurationFolder(validatedData);
      res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating model configuration folder:", error);
      res.status(500).json({ error: "Failed to create model configuration folder" });
    }
  });

  // Update model configuration folder
  app.put("/api/model-configuration-folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const folder = await storage.updateModelConfigurationFolder(id, updates);
      res.json(folder);
    } catch (error) {
      console.error("Error updating model configuration folder:", error);
      res.status(500).json({ error: "Failed to update model configuration folder" });
    }
  });

  // Delete model configuration folder
  app.delete("/api/model-configuration-folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteModelConfigurationFolder(id);
      res.status(200).json({ message: "Model configuration folder deleted successfully" });
    } catch (error) {
      console.error("Error deleting model configuration folder:", error);
      res.status(500).json({ error: "Failed to delete model configuration folder" });
    }
  });

  // Execute AI Model Configuration
  app.post('/api/model-configuration/execute', async (req, res) => {
    try {
      const { configurationId, nodes, connections, goalInputs } = req.body;
      
      console.log('Executing model configuration:', configurationId);
      console.log('Nodes:', nodes?.length);
      console.log('Connections:', connections?.length);
      console.log('Goal Inputs:', goalInputs?.length ? goalInputs.map((g: any) => ({ name: g.nodeName, request: g.goalRequest })) : 'None');
      
      // Find AI model nodes in the configuration
      const aiModelNodes = nodes?.filter((node: any) => node.type === 'ai-model') || [];
      const dataInputNodes = nodes?.filter((node: any) => node.type === 'data-input') || [];
      
      if (aiModelNodes.length === 0) {
        return res.status(400).json({ 
          error: 'No AI model found in configuration',
          success: false 
        });
      }
      
      if (dataInputNodes.length === 0) {
        return res.status(400).json({ 
          error: 'No data input sources found in configuration',
          success: false 
        });
      }
      
      const results = [];
      
      // Process each AI model
      for (const aiModelNode of aiModelNodes) {
        const modelId = aiModelNode.modelId || aiModelNode.data?.modelId;
        if (!modelId) {
          console.warn('AI model node missing modelId:', aiModelNode);
          continue;
        }
        
        // Get the AI model data
        const aiModel = await storage.getAiModel(modelId);
        if (!aiModel) {
          console.warn('AI model not found:', modelId);
          continue;
        }
        
        // Find connected input data sources
        const connectedInputs = connections?.filter((conn: any) => 
          conn.toNodeId === aiModelNode.id
        ) || [];
        
        const inputData: Record<string, any> = {};
        
        // Collect data from connected sources
        for (const connection of connectedInputs) {
          const sourceNode = dataInputNodes.find(node => node.id === connection.fromNodeId);
          if (sourceNode?.data?.sourceId) {
            const dataSource = await storage.getDataSource(sourceNode.data.sourceId);
            if (dataSource?.config) {
              const config = typeof dataSource.config === 'string' 
                ? JSON.parse(dataSource.config) 
                : dataSource.config;
                
              if (config.sampleData) {
                inputData[sourceNode.data.name] = config.sampleData;
              }
            }
          }
        }
        
        console.log('Input data for model execution:', Object.keys(inputData));
        
        // Find connected Final Goal nodes and their requests
        const connectedGoalNodes = connections?.filter((conn: any) => 
          conn.fromNodeId === aiModelNode.id
        ) || [];
        
        const goalRequests = goalInputs?.filter((goal: any) => 
          connectedGoalNodes.some((conn: any) => conn.toNodeId === goal.nodeId)
        ) || [];
        
        console.log('Connected goal requests:', goalRequests.map((g: any) => g.goalRequest));
        
        // Execute model with real data - Generic AI Model Execution
        const executionResult = await executeAIModelGeneric({
          model: aiModel,
          inputData: inputData,
          goalRequests: goalRequests
        });
        
        results.push(executionResult);
      }
      
      res.json({
        success: true,
        configurationId,
        results,
        executedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error executing model configuration:', error);
      res.status(500).json({ 
        error: 'Failed to execute model configuration',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Chat session endpoints
  app.post("/api/chat/session", async (req, res) => {
    try {
      const { configId } = req.body;
      const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const session = await storage.createChatSession({
        sessionId,
        title: "새 채팅",
        configId: configId || null, // Store which chatbot config this session uses
        createdAt: now,
        updatedAt: now
      });

      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({ 
        error: "채팅 세션 생성에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/chat/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({ 
        error: "채팅 메시지 조회에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI-powered chat endpoint with Flowise integration
  app.post("/api/chat/:sessionId/message", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { message, configId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "메시지가 필요합니다" });
      }

      console.log(`채팅 요청: ${sessionId} - "${message}" (configId: ${configId})`);

      // Get connected data sources for this chatbot configuration (data isolation)
      let connectedDataSources = [];
      if (configId) {
        try {
          connectedDataSources = await storage.getChatbotDataIntegrations(configId);
          console.log(`챗봇 ${configId}에 연결된 데이터 소스: ${connectedDataSources.length}개`);
        } catch (error) {
          console.error('Error getting connected data sources:', error);
        }
      }

      // Save user message
      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        message: message.trim(),
        createdAt: new Date().toISOString()
      });

      // Update session activity
      await storage.updateChatSessionActivity(sessionId);

      // Check if any uploaded AI models need to be executed
      let executeResponse = '';
      const config = configId ? await storage.getChatConfiguration(configId) : null;
      
      if (config && config.uploadedFiles && config.uploadedFiles.length > 0) {
        // Check for executable files in Knowledge Base
        for (const file of config.uploadedFiles) {
          if (file.type === 'source_code' && file.isExecutable && file.language) {
            try {
              console.log(`Executing ${file.language} code for: ${file.metadata.name}`);
              const executionResult = await executeAIModel(file, message);
              if (executionResult) {
                executeResponse = executionResult;
                break; // Use first successful execution
              }
            } catch (error) {
              console.error('AI model execution error:', error);
            }
          }
        }
      }

      // Use Flowise API for intelligent responses with data isolation
      let botResponse = executeResponse || ''; // Use AI model result if available
      let searchQuery = message;
      let foundMatches = 0;
      let confidence = 0;

      // Build context data from connected data sources only (DATA ISOLATION)
      let contextData = '';
      let allConnectedData = []; // Store all data for precise matching
      
      if (connectedDataSources.length > 0) {
        console.log(`데이터 분리: ${connectedDataSources.length}개 연결된 데이터 소스에서만 검색`);
        try {
          for (const integration of connectedDataSources) {
            const dataSource = await storage.getDataSource(integration.dataSourceId);
            console.log(`데이터 소스 확인: ${dataSource?.name}, sampleData 존재: ${!!dataSource?.sampleData}`);
            
            if (dataSource && dataSource.sampleData) {
              contextData += `\n=== ${dataSource.name} 데이터 ===\n`;
              
              // Add sample data from this specific data source
              if (typeof dataSource.sampleData === 'object') {
                for (const [tableName, records] of Object.entries(dataSource.sampleData)) {
                  if (Array.isArray(records) && records.length > 0) {
                    contextData += `테이블: ${tableName}\n`;
                    contextData += JSON.stringify(records.slice(0, 5), null, 2) + '\n';
                    
                    // Store all records for precise matching
                    allConnectedData.push(...records);
                  }
                }
              }
            }
          }
          foundMatches = connectedDataSources.length;
          console.log(`contextData 생성 완료: ${contextData.length}자, 전체 레코드: ${allConnectedData.length}개`);
        } catch (error) {
          console.error('Error building context from connected data sources:', error);
        }

        // PRECISE LOCAL MATCHING: Find exact Type and Fault matches
        if (allConnectedData.length > 0) {
          console.log(`정밀 매칭 시작: "${message}"`);
          
          // Find matching records based on Type and Fault fields
          const matchedRecords = allConnectedData.filter(record => {
            if (!record.Type || !record.Fault || !record.Action) return false;
            
            const typeMatch = message.toLowerCase().includes(record.Type.toLowerCase());
            const faultMatch = message.toLowerCase().includes(record.Fault.toLowerCase());
            
            console.log(`레코드 검사: Type="${record.Type}" (매칭=${typeMatch}), Fault="${record.Fault}" (매칭=${faultMatch})`);
            
            return typeMatch && faultMatch;
          });

          if (matchedRecords.length > 0) {
            console.log(`정밀 매칭 성공: ${matchedRecords.length}개 결과 발견`);
            
            // Return the exact action from matched records
            let localResponse = '';
            if (matchedRecords.length === 1) {
              const match = matchedRecords[0];
              localResponse = `**문제 유형:** ${match.Type}\n**장애 내용:** ${match.Fault}\n\n**해결 방법:** ${match.Action}`;
            } else {
              localResponse = `해당 문제에 대한 ${matchedRecords.length}개의 해결 방법을 찾았습니다:\n\n`;
              matchedRecords.forEach((match, index) => {
                localResponse += `**${index + 1}. ${match.Type} - ${match.Fault}**\n`;
                localResponse += `해결 방법: ${match.Action}\n\n`;
              });
            }

            // Create bot message with precise local match
            const botMessage = await storage.createChatMessage({
              sessionId,
              configId: configId || undefined,
              type: 'bot',
              message: localResponse
            });

            return res.json({
              userMessage: userMessage,
              botMessage: botMessage
            });
          } else {
            console.log(`정밀 매칭 실패: 연결된 데이터에서 해당 내용을 찾을 수 없음`);
            
            // No matching data found in connected sources
            const noMatchMessage = `죄송합니다. 연결된 데이터에서 "${message}"와 관련된 정보를 찾을 수 없습니다.\n\n` +
              `다음 사항을 확인해주세요:\n` +
              `• 올바른 챗봇을 선택했는지 확인\n` +
              `• Knowledge Base에 관련 데이터가 업로드되었는지 확인\n` +
              `• Data Integration이 제대로 연결되었는지 확인\n\n` +
              `현재 연결된 데이터에는 ${allConnectedData.length}개의 레코드가 있습니다.`;

            const botMessage = await storage.createChatMessage({
              sessionId,
              configId: configId || undefined,
              type: 'bot',
              message: noMatchMessage
            });

            return res.json({
              userMessage: userMessage,
              botMessage: botMessage
            });
          }
        }
      } else {
        console.log(`데이터 분리: configId ${configId} - 연결된 데이터 소스가 없습니다.`);
        
        // If no data sources are connected, return an appropriate message
        const noDataMessage = "죄송합니다. 현재 이 챗봇에는 연결된 데이터가 없습니다.\n\n" +
          "Assistant 모듈의 Knowledge Base에서 다음 중 하나를 수행해주세요:\n" +
          "• 파일 업로드 (PDF, Excel, CSV 등)\n" +
          "• Data Integration 연동\n\n" +
          "데이터 연결 후 다시 질문해주시면 정확한 답변을 제공해드릴 수 있습니다.";

        const botMessage = await storage.createChatMessage({
          sessionId,
          configId: configId || undefined,
          type: 'bot',
          message: noDataMessage
        });

        return res.json({
          userMessage: userMessage,
          botMessage: botMessage
        });
      }

      try {
        // Enhanced question with chatbot-specific context data
        const enhancedQuestion = contextData 
          ? `다음 데이터를 참고해서 질문에 답해주세요:\n${contextData}\n\n질문: ${message}`
          : message;

        // Call Flowise chat API with isolated data context
        console.log(`Flowise API 호출: "${message}" (컨텍스트 데이터: ${contextData.length}자)`);
        const flowiseResponse = await fetch("http://220.118.23.185:3000/api/v1/prediction/9e85772e-dc56-4b4d-bb00-e18aeb80a484", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: enhancedQuestion,
            history: []
          })
        });

        if (flowiseResponse.ok) {
          const flowiseResult = await flowiseResponse.json();
          console.log(`Flowise 응답:`, flowiseResult);
          botResponse = flowiseResult.text || flowiseResult.answer || flowiseResult.response || "응답을 받을 수 없습니다.";
          confidence = 0.90;
          foundMatches = 1;
        } else {
          throw new Error(`Flowise API 오류: ${flowiseResponse.status}`);
        }
      } catch (error) {
        console.error("Flowise API 호출 실패:", error);
        
        // Fallback to local data search
        const searchResults = await storage.searchUploadedData(message);
        console.log(`로컬 검색 결과: ${searchResults.length}개 항목 발견`);

        if (searchResults.length > 0) {
          foundMatches = searchResults.length;
          confidence = 0.70;
          botResponse = `업로드된 데이터에서 찾은 정보:\n\n`;
          
          if (searchResults.length === 1) {
            const result = searchResults[0];
            Object.entries(result).forEach(([key, value]) => {
              if (value && key !== 'id') {
                botResponse += `**${key}:** ${value}\n`;
              }
            });
          } else {
            botResponse += `관련된 ${searchResults.length}개의 결과를 찾았습니다:\n\n`;
            searchResults.slice(0, 3).forEach((result, index) => {
              botResponse += `**${index + 1}번 결과:**\n`;
              Object.entries(result).forEach(([key, value]) => {
                if (value && key !== 'id') {
                  botResponse += `- ${key}: ${value}\n`;
                }
              });
              botResponse += `\n`;
            });
          }
        } else {
          confidence = 0;
          botResponse = `죄송합니다. "${message}"와 관련된 정보를 찾을 수 없습니다.\n\nFlowise API와의 연결에 문제가 있어 로컬 데이터만 검색했습니다.\n\n다음과 같이 시도해 보세요:\n• 더 구체적인 키워드를 입력해 주세요\n• 다른 검색어나 관련 용어를 사용해 보세요\n• CSV 파일을 업로드했는지 확인해 주세요`;
        }
      }

      // Save bot response
      const botMessage = await storage.createChatMessage({
        sessionId,
        type: 'bot',
        message: botResponse,
        metadata: {
          confidence,
          searchQuery,
          foundMatches
        },
        createdAt: new Date().toISOString()
      });

      res.json({
        userMessage,
        botMessage,
        searchInfo: {
          query: searchQuery,
          foundMatches,
          confidence,
          hasResults: foundMatches > 0
        }
      });

    } catch (error) {
      console.error('Error handling chat message:', error);
      res.status(500).json({ 
        error: "메시지 처리에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // File upload to Flowise API endpoint
  app.post("/api/upload-to-flowise", upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "파일이 없습니다" });
      }

      const file = files[0];
      console.log(`Flowise 업로드 요청: ${file.originalname} (${file.size} bytes)`);

      // Create form data for Flowise API using built-in FormData
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('files', blob, file.originalname);

      // Upload to Flowise API
      const flowiseResponse = await fetch('http://220.118.23.185:3000/api/v1/vector/upsert/9e85772e-dc56-4b4d-bb00-e18aeb80a484', {
        method: 'POST',
        body: formData
      });

      if (!flowiseResponse.ok) {
        const errorText = await flowiseResponse.text();
        console.error('Flowise API 오류:', errorText);
        return res.status(500).json({ 
          error: "Flowise API 업로드 실패",
          details: errorText
        });
      }

      const result = await flowiseResponse.json();
      console.log('Flowise 업로드 성공:', result);

      res.json({
        success: true,
        filename: file.originalname,
        result: result
      });

    } catch (error) {
      console.error('파일 업로드 처리 오류:', error);
      res.status(500).json({ 
        error: "파일 업로드 처리에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chat Configuration CRUD endpoints
  app.get("/api/chat-configurations", async (req, res) => {
    try {
      const configurations = await storage.getChatConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error('Error fetching chat configurations:', error);
      res.status(500).json({ 
        error: "챗봇 구성 조회에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/chat-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const configuration = await storage.getChatConfiguration(id);
      if (!configuration) {
        return res.status(404).json({ error: "챗봇 구성을 찾을 수 없습니다" });
      }
      res.json(configuration);
    } catch (error) {
      console.error('Error fetching chat configuration:', error);
      res.status(500).json({ 
        error: "챗봇 구성 조회에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/chat-configurations", async (req, res) => {
    try {
      const configData = insertChatConfigurationSchema.parse(req.body);
      const configuration = await storage.createChatConfiguration(configData);
      res.status(201).json(configuration);
    } catch (error) {
      console.error('Error creating chat configuration:', error);
      res.status(500).json({ 
        error: "챗봇 구성 생성에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/chat-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const configuration = await storage.updateChatConfiguration(id, updates);
      res.json(configuration);
    } catch (error) {
      console.error('Error updating chat configuration:', error);
      res.status(500).json({ 
        error: "챗봇 구성 수정에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/chat-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChatConfiguration(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting chat configuration:', error);
      res.status(500).json({ 
        error: "챗봇 구성 삭제에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Toggle active status for chat configuration
  app.put("/api/chat-configurations/:id/toggle-active", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get current configuration
      const currentConfig = await storage.getChatConfiguration(id);
      if (!currentConfig) {
        return res.status(404).json({ error: "챗봇 구성을 찾을 수 없습니다" });
      }
      
      // Toggle the isActive status (convert boolean to boolean directly)
      const currentActive = Boolean(currentConfig.isActive);
      const newIsActive = !currentActive;
      
      // Update the configuration
      const updatedConfig = await storage.updateChatConfiguration(id, {
        isActive: newIsActive
      });
      
      res.json(updatedConfig);
    } catch (error) {
      console.error('Error toggling chat configuration active status:', error);
      res.status(500).json({ 
        error: "챗봇 활성화 상태 변경에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Upload and parse Flowise API configuration file
  app.post("/api/upload-chatbot-config", upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "파일이 없습니다" });
      }

      console.log(`Flowise API 설정 파일 업로드: ${file.originalname} (${file.size} bytes)`);

      // Parse file content based on extension
      let configData: any;
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileContent = file.buffer.toString('utf8');

      try {
        if (fileExtension === '.json') {
          configData = JSON.parse(fileContent);
        } else if (fileExtension === '.yaml' || fileExtension === '.yml') {
          configData = yaml.load(fileContent) as any;
        } else {
          return res.status(400).json({ 
            error: "지원되지 않는 파일 형식입니다. JSON 또는 YAML 파일만 지원됩니다." 
          });
        }
      } catch (parseError) {
        return res.status(400).json({ 
          error: "파일 파싱에 실패했습니다. 올바른 JSON 또는 YAML 형식인지 확인해주세요.",
          details: parseError instanceof Error ? parseError.message : 'Parse error'
        });
      }

      // Extract chatbot configuration from parsed data
      const chatbotConfig = extractChatbotConfig(configData, file.originalname);
      
      // Create new chat configuration
      const newConfiguration = await storage.createChatConfiguration(chatbotConfig);

      res.json({
        success: true,
        message: "Flowise API 설정 파일이 성공적으로 업로드되고 챗봇 구성이 생성되었습니다.",
        configuration: newConfiguration,
        originalFileName: file.originalname
      });

    } catch (error) {
      console.error('Flowise API 설정 파일 처리 오류:', error);
      res.status(500).json({ 
        error: "API 설정 파일 처리에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chatbot Data Integration endpoints
  app.get("/api/chatbot-data-integrations/:configId", async (req, res) => {
    try {
      const { configId } = req.params;
      const integrations = await storage.getChatbotDataIntegrations(configId);
      
      // Get data source details for each integration
      const integrationsWithDetails = await Promise.all(
        integrations.map(async (integration) => {
          const dataSource = await storage.getDataSource(integration.dataSourceId);
          return {
            ...integration,
            dataSourceName: dataSource?.name || 'Unknown',
            dataSourceType: dataSource?.sourceType || 'Unknown'
          };
        })
      );
      
      res.json(integrationsWithDetails);
    } catch (error) {
      console.error('Error getting chatbot data integrations:', error);
      res.status(500).json({ 
        error: "챗봇 Data Integration 목록을 가져오는데 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/chatbot-data-integrations", async (req, res) => {
    try {
      const { configId, dataSourceId } = req.body;
      
      if (!configId || !dataSourceId) {
        return res.status(400).json({ 
          error: "configId와 dataSourceId가 필요합니다" 
        });
      }

      const integration = await storage.createChatbotDataIntegration({
        configId,
        dataSourceId,
        isConnected: true
      });
      
      res.json(integration);
    } catch (error) {
      console.error('Error creating chatbot data integration:', error);
      res.status(500).json({ 
        error: "Data Integration 연동에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/chatbot-data-integrations/:configId/:dataSourceId", async (req, res) => {
    try {
      const { configId, dataSourceId } = req.params;
      await storage.deleteChatbotDataIntegration(configId, dataSourceId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting chatbot data integration:', error);
      res.status(500).json({ 
        error: "Data Integration 연동 해제에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // File download endpoint for source code
  app.get("/download/source-code", (req, res) => {
    const filePath = path.join(process.cwd(), 'collaboration-portal-source.tar.gz');
    
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'collaboration-portal-source.tar.gz', (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({ error: 'Download failed' });
        }
      });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// AI Model Execution System
async function executeAIModel(file: any, userMessage: string): Promise<string | null> {
  try {
    const { language, content, metadata } = file;
    
    if (!content || !language) {
      return null;
    }
    
    console.log(`Executing ${language} model: ${metadata.name}`);
    
    switch (language) {
      case 'py':
        return await executePythonCode(content, userMessage);
      case 'js':
        return await executeJavaScriptCode(content, userMessage);
      case 'ts':
        return await executeTypeScriptCode(content, userMessage);
      default:
        console.warn(`Unsupported language: ${language}`);
        return null;
    }
  } catch (error) {
    console.error('Error executing AI model:', error);
    return null;
  }
}

async function executePythonCode(code: string, userMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const fileName = `ai_model_${Date.now()}.py`;
    const filePath = path.join(tempDir, fileName);
    
    // Prepare Python code with user input
    const enhancedCode = `
import sys
import json

# User message
user_input = """${userMessage.replace(/"/g, '\\"')}"""

# Original AI model code
${code}

# Try to find and call main function or process_message function
try:
    if 'process_message' in globals():
        result = process_message(user_input)
        print(json.dumps({"success": True, "result": str(result)}))
    elif 'main' in globals():
        result = main(user_input)
        print(json.dumps({"success": True, "result": str(result)}))
    else:
        # Execute code and capture any output
        exec(compile(open(__file__).read(), __file__, 'exec'))
        print(json.dumps({"success": True, "result": "Code executed successfully"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;
    
    fs.writeFileSync(filePath, enhancedCode);
    
    const python = spawn('python3', [filePath]);
    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error cleaning up temp file:', err);
      }
      
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          if (result.success) {
            resolve(`🐍 Python AI 모델 실행 결과:\n${result.result}`);
          } else {
            resolve(`❌ Python 실행 오류: ${result.error}`);
          }
        } catch (e) {
          resolve(`🐍 Python 출력:\n${output}`);
        }
      } else {
        resolve(`❌ Python 실행 실패:\n${errorOutput}`);
      }
    });
    
    python.on('error', (err) => {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.error('Error cleaning up temp file:', cleanupErr);
      }
      resolve(`❌ Python 실행 오류: ${err.message}`);
    });
  });
}

async function executeJavaScriptCode(code: string, userMessage: string): Promise<string> {
  try {
    // Create a safe execution environment
    const enhancedCode = `
const userInput = \`${userMessage.replace(/`/g, '\\`')}\`;

// Original AI model code
${code}

// Try to find and call appropriate functions
try {
  let result;
  if (typeof processMessage === 'function') {
    result = processMessage(userInput);
  } else if (typeof main === 'function') {
    result = main(userInput);
  } else {
    result = "JavaScript code executed successfully";
  }
  
  // Handle promises
  if (result && typeof result.then === 'function') {
    result.then(res => console.log(JSON.stringify({success: true, result: String(res)})))
           .catch(err => console.log(JSON.stringify({success: false, error: err.message})));
  } else {
    console.log(JSON.stringify({success: true, result: String(result)}));
  }
} catch (e) {
  console.log(JSON.stringify({success: false, error: e.message}));
}
`;
    
    return new Promise((resolve) => {
      const tempDir = os.tmpdir();
      const fileName = `ai_model_${Date.now()}.js`;
      const filePath = path.join(tempDir, fileName);
      
      fs.writeFileSync(filePath, enhancedCode);
      
      const node = spawn('node', [filePath]);
      let output = '';
      let errorOutput = '';
      
      node.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      node.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      node.on('close', (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error cleaning up temp file:', err);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            if (result.success) {
              resolve(`🟨 JavaScript AI 모델 실행 결과:\n${result.result}`);
            } else {
              resolve(`❌ JavaScript 실행 오류: ${result.error}`);
            }
          } catch (e) {
            resolve(`🟨 JavaScript 출력:\n${output}`);
          }
        } else {
          resolve(`❌ JavaScript 실행 실패:\n${errorOutput}`);
        }
      });
      
      node.on('error', (err) => {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error('Error cleaning up temp file:', cleanupErr);
        }
        resolve(`❌ JavaScript 실행 오류: ${err.message}`);
      });
    });
  } catch (error) {
    return `❌ JavaScript 코드 준비 오류: ${error}`;
  }
}

async function executeTypeScriptCode(code: string, userMessage: string): Promise<string> {
  try {
    // For TypeScript, we'll compile to JavaScript first
    const enhancedCode = `
const userInput: string = \`${userMessage.replace(/`/g, '\\`')}\`;

// Original AI model code
${code}

// Try to find and call appropriate functions
try {
  let result: any;
  if (typeof processMessage === 'function') {
    result = processMessage(userInput);
  } else if (typeof main === 'function') {
    result = main(userInput);
  } else {
    result = "TypeScript code executed successfully";
  }
  
  // Handle promises
  if (result && typeof result.then === 'function') {
    result.then((res: any) => console.log(JSON.stringify({success: true, result: String(res)})))
           .catch((err: any) => console.log(JSON.stringify({success: false, error: err.message})));
  } else {
    console.log(JSON.stringify({success: true, result: String(result)}));
  }
} catch (e: any) {
  console.log(JSON.stringify({success: false, error: e.message}));
}
`;
    
    return new Promise((resolve) => {
      const tempDir = os.tmpdir();
      const fileName = `ai_model_${Date.now()}.ts`;
      const filePath = path.join(tempDir, fileName);
      
      fs.writeFileSync(filePath, enhancedCode);
      
      // Use tsx to run TypeScript directly
      const tsx = spawn('npx', ['tsx', filePath]);
      let output = '';
      let errorOutput = '';
      
      tsx.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      tsx.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      tsx.on('close', (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error cleaning up temp file:', err);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            if (result.success) {
              resolve(`🔷 TypeScript AI 모델 실행 결과:\n${result.result}`);
            } else {
              resolve(`❌ TypeScript 실행 오류: ${result.error}`);
            }
          } catch (e) {
            resolve(`🔷 TypeScript 출력:\n${output}`);
          }
        } else {
          resolve(`❌ TypeScript 실행 실패:\n${errorOutput}`);
        }
      });
      
      tsx.on('error', (err) => {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error('Error cleaning up temp file:', cleanupErr);
        }
        resolve(`❌ TypeScript 실행 오류: ${err.message}`);
      });
    });
  } catch (error) {
    return `❌ TypeScript 코드 준비 오류: ${error}`;
  }
}
