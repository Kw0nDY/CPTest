export interface DataField {
  name: string;
  type: string;
  description?: string;
  sampleData?: string;
}

export interface SystemSource {
  id: string;
  name: string;
  type: 'erp' | 'crm' | 'database' | 'file';
  icon: string;
  color: string;
  description: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  name: string;
  icon: string;
  position: { x: number; y: number };
  config?: any;
}

export interface WorkflowConnection {
  from: string;
  to: string;
}

export interface ModelTestInput {
  [key: string]: any;
}

export interface ModelTestOutput {
  [key: string]: any;
}

export interface BOIMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
}
