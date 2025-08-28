// Pipeline Builder 타입 정의

export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

export interface PipelineConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort?: string;
  targetPort?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeType {
  id: string;
  name: string;
  category: 'source' | 'transform' | 'validate' | 'sink';
  description: string;
  icon: string;
  color: string;
  configSchema: Record<string, any>;
}

export const NODE_TYPES: NodeType[] = [
  {
    id: 'source.fileDrop',
    name: 'File Drop',
    category: 'source',
    description: 'Load data from file with configurable format',
    icon: '📁',
    color: 'bg-green-100 border-green-300 text-green-800',
    configSchema: {
      path: { type: 'string', required: true, label: 'File Path' },
      hasHeader: { type: 'boolean', default: true, label: 'Has Header' },
      delimiter: { type: 'string', default: ',', label: 'Delimiter' }
    }
  },
  {
    id: 'transform.select',
    name: 'Select Columns',
    category: 'transform',
    description: 'Select specific columns from the dataset',
    icon: '🔍',
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    configSchema: {
      columns: { type: 'array', required: true, label: 'Columns' }
    }
  },
  {
    id: 'transform.filter',
    name: 'Filter Rows',
    category: 'transform',
    description: 'Filter rows based on conditions',
    icon: '🎯',
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    configSchema: {
      expr: { type: 'string', required: true, label: 'Filter Expression' }
    }
  },
  {
    id: 'validate.null',
    name: 'NULL Validation',
    category: 'validate',
    description: 'Check for NULL values in specified columns',
    icon: '✅',
    color: 'bg-orange-100 border-orange-300 text-orange-800',
    configSchema: {
      columns: { type: 'array', required: true, label: 'Columns to Validate' }
    }
  },
  {
    id: 'sink.featureCache',
    name: 'Feature Cache',
    category: 'sink',
    description: 'Cache processed data with TTL',
    icon: '💾',
    color: 'bg-purple-100 border-purple-300 text-purple-800',
    configSchema: {
      name: { type: 'string', required: true, label: 'Cache Name' },
      ttlHours: { type: 'number', default: 24, label: 'TTL (Hours)' }
    }
  }
];

export const NODE_CATEGORIES = [
  { id: 'source', name: 'Data Sources', color: 'text-green-600' },
  { id: 'transform', name: 'Transformations', color: 'text-blue-600' },
  { id: 'validate', name: 'Validations', color: 'text-orange-600' },
  { id: 'sink', name: 'Data Sinks', color: 'text-purple-600' }
] as const;