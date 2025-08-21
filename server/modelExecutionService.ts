import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

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
      // Validate model file exists
      await this.validateModelFile(config.modelPath);
      
      // Prepare configuration for Python script
      const pythonConfig = {
        model_path: config.modelPath,
        input_data: config.inputData,
        input_specs: config.inputSpecs,
        output_specs: config.outputSpecs
      };

      // Execute Python script
      const result = await this.runPythonScript(JSON.stringify(pythonConfig));
      
      const executionTime = Date.now() - startTime;
      
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
}

export const modelExecutionService = new ModelExecutionService();