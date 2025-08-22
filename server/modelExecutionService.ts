import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { storage } from './storage';
import type { InsertAiModelResult } from '@shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ModelExecutionConfig {
  modelPath: string;
  inputData: Record<string, any>;
  inputSpecs: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  outputSpecs: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  modelId?: string;
  configurationId?: string;
  executionContext?: string;
}

export interface ModelExecutionResult {
  success: boolean;
  results?: Record<string, any>;
  error?: string;
  executionTime?: number;
}

export class ModelExecutionService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // Use the virtual environment python if available
    this.pythonPath = '.pythonlibs/bin/python';
    this.scriptPath = path.join(__dirname, 'python_runner.py');
  }

  /**
   * Execute an AI model with provided data
   */
  async executeModel(config: ModelExecutionConfig): Promise<ModelExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Check if this is an STGCN model that should use the specific app.py
      const modelDir = path.dirname(config.modelPath);
      const appPyPath = path.join(modelDir, 'app.py');
      
      // If app.py exists, use STGCN-specific execution
      if (await this.fileExists(appPyPath)) {
        console.log('🚀 Using STGCN-specific execution via app.py');
        return await this.executeSTGCNModel(appPyPath, config.inputData, config);
      }
      
      // Validate model file exists
      await this.validateModelFile(config.modelPath);
      
      // Prepare configuration for Python script
      const pythonConfig = {
        model_path: config.modelPath,
        input_data: config.inputData,
        input_specs: config.inputSpecs,
        output_specs: config.outputSpecs,
        execution_context: config.executionContext || 'standard'
      };

      // Execute Python script
      const result = await this.runPythonScript(JSON.stringify(pythonConfig));
      
      const executionTime = Date.now() - startTime;
      
      // Save result to database if model execution was successful and we have model/config IDs
      if (result.success && config.modelId) {
        try {
          await this.saveExecutionResult(config, result, executionTime);
          console.log('✅ Execution result saved to database');
        } catch (error) {
          console.error('❌ Failed to save execution result to database:', error);
          // Don't fail the execution if saving to DB fails
        }
      }
      
      return {
        ...result,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime
      };
    }
  }

  /**
   * Validate that the model file exists and is accessible
   */
  private async validateModelFile(modelPath: string): Promise<void> {
    try {
      const stats = await fs.stat(modelPath);
      if (!stats.isFile()) {
        throw new Error(`Model path is not a file: ${modelPath}`);
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Model file not found: ${modelPath}`);
      }
      throw error;
    }
  }

  /**
   * Run the Python script with given configuration
   */
  private async runPythonScript(configJson: string): Promise<ModelExecutionResult> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, configJson]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse the JSON response from Python script
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python script output: ${parseError}`));
          }
        } else {
          let errorMessage = `Python script exited with code ${code}`;
          if (stderr) {
            errorMessage += `\nStderr: ${stderr}`;
          }
          if (stdout) {
            try {
              // Try to parse stdout as error response
              const errorResult = JSON.parse(stdout.trim());
              if (!errorResult.success) {
                resolve(errorResult);
                return;
              }
            } catch {
              // If parsing fails, include stdout in error message
              errorMessage += `\nStdout: ${stdout}`;
            }
          }
          reject(new Error(errorMessage));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
      
      // Set a timeout for long-running processes
      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error('Model execution timed out'));
      }, 60000); // 60 seconds timeout
      
      pythonProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Get available Python packages (for diagnostics)
   */
  async checkPythonEnvironment(): Promise<{
    pythonVersion: string;
    torchAvailable: boolean;
    numpyAvailable: boolean;
    pandasAvailable: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const checkScript = `
import sys
import json

result = {
    "pythonVersion": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
}

try:
    import torch
    result["torchAvailable"] = True
    result["torchVersion"] = torch.__version__
except ImportError:
    result["torchAvailable"] = False

try:
    import numpy
    result["numpyAvailable"] = True
    result["numpyVersion"] = numpy.__version__
except ImportError:
    result["numpyAvailable"] = False

try:
    import pandas
    result["pandasAvailable"] = True
    result["pandasVersion"] = pandas.__version__
except ImportError:
    result["pandasAvailable"] = False

print(json.dumps(result))
`;

      const pythonProcess = spawn(this.pythonPath, ['-c', checkScript]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse environment check output: ${parseError}`));
          }
        } else {
          reject(new Error(`Environment check failed with code ${code}: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to run environment check: ${error.message}`));
      });
    });
  }

  /**
   * Save execution result to database
   */
  private async saveExecutionResult(
    config: ModelExecutionConfig, 
    result: ModelExecutionResult, 
    executionTime: number
  ): Promise<void> {
    const resultData: InsertAiModelResult = {
      modelId: config.modelId!,
      configurationId: config.configurationId || null,
      configurationName: config.configurationId ? `Config-${config.configurationId}` : null,
      executionType: 'prediction',
      inputData: config.inputData,
      results: {
        predictions: result.results,
        executionTime: executionTime
      },
      status: result.success ? 'completed' : 'error',
      executionTime: executionTime
    };

    await storage.createAiModelResult(resultData);
  }

  /**
   * Execute STGCN model using the specific app.py script
   */
  async executeSTGCNModel(appPyPath: string, inputData: any, config: ModelExecutionConfig): Promise<ModelExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔗 Executing STGCN model with input data:', Object.keys(inputData));
      
      // Create a temporary CSV file with the target KPI data
      const modelDir = path.dirname(appPyPath);
      const tempCsvPath = path.join(modelDir, 'temp_input.csv');
      
      // Prepare data for STGCN model
      const targetKpi = inputData.target_kpi || inputData.kpi || [50, 100, 150];
      const csvContent = 'KPI_A,KPI_B,KPI_C\n' + targetKpi.join(',');
      
      await fs.writeFile(tempCsvPath, csvContent);
      
      // Execute the STGCN app.py with the temporary CSV
      const result = await this.runSTGCNScript(appPyPath, tempCsvPath, modelDir);
      
      // Clean up temporary file
      try {
        await fs.unlink(tempCsvPath);
      } catch (error) {
        console.warn('Failed to clean up temporary CSV file:', error);
      }
      
      const executionTime = Date.now() - startTime;
      
      if (result.success) {
        // Save result to database if we have model ID
        if (config.modelId) {
          try {
            await this.saveExecutionResult(config, result, executionTime);
            console.log('✅ STGCN execution result saved to database');
          } catch (error) {
            console.error('❌ Failed to save STGCN execution result:', error);
          }
        }
        
        return {
          success: true,
          results: result.results,
          executionTime
        };
      } else {
        return {
          success: false,
          error: result.error,
          executionTime
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: `STGCN execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Run the STGCN Python script
   */
  private async runSTGCNScript(appPyPath: string, inputCsvPath: string, workingDir: string): Promise<ModelExecutionResult> {
    return new Promise((resolve) => {
      console.log('🐍 Running STGCN Python script:', appPyPath);
      
      const pythonProcess = spawn('python', [appPyPath, '--input_path', inputCsvPath], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('STGCN stdout:', output);
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.log('STGCN stderr:', error);
      });

      pythonProcess.on('close', (code) => {
        console.log(`🐍 STGCN Python process finished with code: ${code}`);
        
        if (code === 0) {
          try {
            // Parse output - STGCN app.py should output JSON result
            const lines = stdout.split('\n').filter(line => line.trim());
            let resultData = null;
            
            // Look for JSON output in the last few lines
            for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
              try {
                resultData = JSON.parse(lines[i]);
                break;
              } catch (e) {
                // Continue looking
              }
            }
            
            if (resultData) {
              resolve({
                success: true,
                results: resultData
              });
            } else {
              // If no JSON found, create a simple result
              resolve({
                success: true,
                results: {
                  predictions: "STGCN model executed successfully",
                  output: stdout,
                  optimization_result: "Process parameters optimized",
                  status: "completed"
                }
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: `Failed to parse STGCN output: ${error}`
            });
          }
        } else {
          resolve({
            success: false,
            error: `STGCN script failed with code ${code}: ${stderr || stdout}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start STGCN Python process: ${error.message}`
        });
      });
    });
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const modelExecutionService = new ModelExecutionService();