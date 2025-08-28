// Model Configuration Service for handling YAML/JSON config files
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ModelConfigYAML {
  model: {
    name: string;
    framework: string;
    artifact_uri: string;
    runtime: string;
    entrypoint: string;
    resources: {
      gpu?: number;
      cpu?: string;
      mem?: string;
    };
  };
  signature: {
    inputs: Array<{
      name: string;
      dtype: string;
      shape: (number | null)[];
      required?: boolean;
    }>;
    outputs: Array<{
      name: string;
      dtype: string;
      shape: (number | null)[];
    }>;
  };
  preprocess?: Array<{
    type: 'sql_query' | 'normalize' | 'denormalize' | 'transform';
    connection?: string;
    sql?: string;
    params?: Record<string, any>;
  }>;
  postprocess?: Array<{
    type: 'sql_query' | 'normalize' | 'denormalize' | 'transform';
    connection?: string;
    sql?: string;
    params?: Record<string, any>;
  }>;
  connectors?: Array<{
    name: string;
    kind: 'postgres' | 'redis' | 'mysql' | 'mongodb' | 's3';
    dsn?: string;
    uri?: string;
  }>;
}

export class ModelConfigService {
  private configDir = path.join(process.cwd(), 'uploads', 'configs');

  constructor() {
    this.ensureConfigDir();
  }

  private async ensureConfigDir() {
    try {
      await fs.access(this.configDir);
    } catch {
      await fs.mkdir(this.configDir, { recursive: true });
    }
  }

  // Generate YAML config from model data
  async generateConfig(modelData: {
    id: string;
    name: string;
    framework?: string;
    filePath: string;
    inputSpecs: any[];
    outputSpecs: any[];
    configuration?: any;
  }): Promise<ModelConfigYAML> {
    const config: ModelConfigYAML = {
      model: {
        name: modelData.name.toLowerCase().replace(/\s+/g, '_'),
        framework: modelData.framework || 'pytorch',
        artifact_uri: `file://${modelData.filePath}`,
        runtime: `python:3.11-${modelData.framework === 'tensorflow' ? 'tf' : 'cuda12.1'}`,
        entrypoint: 'app:predict',
        resources: {
          gpu: 1,
          cpu: '2',
          mem: '6Gi'
        }
      },
      signature: {
        inputs: modelData.inputSpecs.map(input => ({
          name: input.name,
          dtype: this.mapDtypeToStandard(input.dtype || input.type),
          shape: input.shape || [null],
          required: true
        })),
        outputs: modelData.outputSpecs.map(output => ({
          name: output.name,
          dtype: this.mapDtypeToStandard(output.dtype || output.type),
          shape: output.shape || [null]
        }))
      }
    };

    // Add preprocessing/postprocessing if available
    if (modelData.configuration?.preprocess) {
      config.preprocess = modelData.configuration.preprocess;
    }

    if (modelData.configuration?.postprocess) {
      config.postprocess = modelData.configuration.postprocess;
    }

    if (modelData.configuration?.connectors) {
      config.connectors = modelData.configuration.connectors;
    }

    return config;
  }

  // Save config as YAML file
  async saveConfigFile(modelId: string, config: ModelConfigYAML): Promise<string> {
    await this.ensureConfigDir();
    
    const fileName = `${modelId}_config.yml`;
    const filePath = path.join(this.configDir, fileName);
    
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    await fs.writeFile(filePath, yamlContent, 'utf8');
    
    return filePath;
  }

  // Load config from YAML file
  async loadConfigFile(filePath: string): Promise<ModelConfigYAML> {
    const yamlContent = await fs.readFile(filePath, 'utf8');
    return yaml.load(yamlContent) as ModelConfigYAML;
  }

  // Update existing config file
  async updateConfigFile(filePath: string, updates: Partial<ModelConfigYAML>): Promise<void> {
    const existingConfig = await this.loadConfigFile(filePath);
    const updatedConfig = this.mergeConfigs(existingConfig, updates);
    
    const yamlContent = yaml.dump(updatedConfig, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    await fs.writeFile(filePath, yamlContent, 'utf8');
  }

  // Parse uploaded config file (YAML or JSON)
  async parseUploadedConfig(filePath: string): Promise<ModelConfigYAML> {
    const content = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yml' || ext === '.yaml') {
      return yaml.load(content) as ModelConfigYAML;
    } else {
      throw new Error('Unsupported config file format. Only JSON and YAML are supported.');
    }
  }

  private mapDtypeToStandard(dtype: string): string {
    const mapping: Record<string, string> = {
      'number': 'float32',
      'float': 'float32',
      'integer': 'int32',
      'int': 'int32',
      'string': 'string',
      'boolean': 'bool',
      'image': 'uint8',
      'tensor': 'float32'
    };
    
    return mapping[dtype.toLowerCase()] || 'float32';
  }

  private mergeConfigs(existing: ModelConfigYAML, updates: Partial<ModelConfigYAML>): ModelConfigYAML {
    return {
      ...existing,
      ...updates,
      model: {
        ...existing.model,
        ...updates.model
      },
      signature: {
        ...existing.signature,
        ...updates.signature
      }
    };
  }

  // Validate config structure
  validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.model) {
      errors.push('Missing model section');
    } else {
      if (!config.model.name) errors.push('Missing model.name');
      if (!config.model.framework) errors.push('Missing model.framework');
      if (!config.model.artifact_uri) errors.push('Missing model.artifact_uri');
    }

    if (!config.signature) {
      errors.push('Missing signature section');
    } else {
      if (!Array.isArray(config.signature.inputs)) {
        errors.push('signature.inputs must be an array');
      }
      if (!Array.isArray(config.signature.outputs)) {
        errors.push('signature.outputs must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const modelConfigService = new ModelConfigService();