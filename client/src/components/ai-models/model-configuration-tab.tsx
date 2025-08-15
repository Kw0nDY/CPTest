import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Folder, 
  FolderOpen, 
  Settings, 
  Play,
  Save,
  Download,
  Upload,
  Trash2,
  Eye,
  Search,
  MoreHorizontal,
  Zap,
  Database,
  Workflow,
  Brain,
  ChevronLeft,
  MoreVertical,
  Circle,
  ChevronRight,
  X,
  Info,
  ArrowRight,
  Link2
} from 'lucide-react';

interface ModelNode {
  id: string;
  type: 'ai-model' | 'data-input' | 'automation-input';
  name: string;
  position: { x: number; y: number };
  inputs: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'array' | 'object' | 'image' | 'boolean';
    connected: boolean;
    value?: any;
  }>;
  outputs: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'array' | 'object' | 'image' | 'boolean';
  }>;
  modelId?: string; // Reference to uploaded model
  status: 'ready' | 'error' | 'running';
  width: number;
  height: number;
}

interface Connection {
  id: string;
  fromNodeId: string;
  fromOutputId: string;
  toNodeId: string;
  toInputId: string;
  type: string;
}

interface ConfigurationFolder {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  configCount: number;
}

interface Configuration {
  id: string;
  name: string;
  description: string;
  folderId: string;
  nodes: ModelNode[];
  connections: Connection[];
  createdAt: string;
  lastModified: string;
  status: 'draft' | 'published' | 'running';
}

// Sample data
const sampleFolders: ConfigurationFolder[] = [
  { id: 'quality-workflows', name: 'Quality Control Workflows', description: 'AI workflows for quality assurance', createdAt: '2024-01-10', configCount: 3 },
  { id: 'maintenance-workflows', name: 'Maintenance Workflows', description: 'Predictive maintenance AI chains', createdAt: '2024-01-08', configCount: 2 },
  { id: 'production-workflows', name: 'Production Optimization', description: 'Production line optimization workflows', createdAt: '2024-01-05', configCount: 1 },
];

const sampleConfigurations: Configuration[] = [
  {
    id: 'config-1',
    name: 'Quality Control Pipeline',
    description: 'Complete quality control workflow with defect detection',
    folderId: 'quality-workflows',
    nodes: [],
    connections: [],
    createdAt: '2024-01-15',
    lastModified: '2024-01-16',
    status: 'published'
  },
  {
    id: 'config-2',
    name: 'Maintenance Prediction Chain',
    description: 'Equipment failure prediction workflow',
    folderId: 'maintenance-workflows',
    nodes: [],
    connections: [],
    createdAt: '2024-01-14',
    lastModified: '2024-01-15',
    status: 'draft'
  }
];

// AI model folders and models
const modelFolders = [
  { id: 'quality-models', name: 'Quality Control Models', description: 'Models for quality inspection and defect detection' },
  { id: 'maintenance-models', name: 'Maintenance Models', description: 'Predictive maintenance and failure detection models' },
  { id: 'production-models', name: 'Production Optimization', description: 'Models for production efficiency and optimization' }
];

// Sample AI models with input/output schemas organized by folders
const availableAIModels = [
  {
    id: '1',
    name: 'Assembly Line Quality Classifier',
    folderId: 'quality-models',
    inputs: [
      { id: 'temperature', name: 'Temperature', type: 'number' as const },
      { id: 'pressure', name: 'Pressure', type: 'number' as const },
      { id: 'image', name: 'Product Image', type: 'image' as const }
    ],
    outputs: [
      { id: 'quality_score', name: 'Quality Score', type: 'number' as const },
      { id: 'defect_type', name: 'Defect Type', type: 'string' as const }
    ]
  },
  {
    id: '2',
    name: 'Surface Defect Detector',
    folderId: 'quality-models',
    inputs: [
      { id: 'surface_image', name: 'Surface Image', type: 'image' as const },
      { id: 'material_type', name: 'Material Type', type: 'string' as const }
    ],
    outputs: [
      { id: 'defect_detected', name: 'Defect Detected', type: 'boolean' as const },
      { id: 'defect_location', name: 'Defect Location', type: 'array' as const }
    ]
  },
  {
    id: '3',
    name: 'Equipment Health Monitor',
    folderId: 'maintenance-models',
    inputs: [
      { id: 'vibration_data', name: 'Vibration Data', type: 'array' as const },
      { id: 'temperature', name: 'Temperature', type: 'number' as const },
      { id: 'operating_hours', name: 'Operating Hours', type: 'number' as const }
    ],
    outputs: [
      { id: 'health_score', name: 'Health Score', type: 'number' as const },
      { id: 'failure_probability', name: 'Failure Probability', type: 'number' as const },
      { id: 'maintenance_recommendation', name: 'Maintenance Recommendation', type: 'string' as const }
    ]
  },
  {
    id: '4',
    name: 'Production Efficiency Optimizer',
    folderId: 'production-models',
    inputs: [
      { id: 'machine_speed', name: 'Machine Speed', type: 'number' as const },
      { id: 'material_flow', name: 'Material Flow', type: 'number' as const },
      { id: 'worker_count', name: 'Worker Count', type: 'number' as const }
    ],
    outputs: [
      { id: 'optimal_speed', name: 'Optimal Speed', type: 'number' as const },
      { id: 'efficiency_score', name: 'Efficiency Score', type: 'number' as const }
    ]
  }
];

// Real data sources from actual database schema
const dataIntegrationSources = [
  // SAP ERP Data Sources (from schema.ts)
  { 
    id: 'sap-customers', 
    name: 'SAP Customer Master', 
    type: 'table',
    category: 'ERP',
    tableName: 'sap_customers',
    description: 'Customer master data from SAP ERP system',
    fields: [
      { name: 'customer_id', type: 'string', description: 'Customer ID' },
      { name: 'customer_name', type: 'string', description: 'Customer Name' },
      { name: 'country', type: 'string', description: 'Country' },
      { name: 'credit_limit', type: 'number', description: 'Credit Limit' },
      { name: 'created_date', type: 'string', description: 'Created Date' }
    ]
  },
  { 
    id: 'sap-orders', 
    name: 'SAP Sales Orders', 
    type: 'table',
    category: 'ERP',
    tableName: 'sap_orders',
    description: 'Sales orders from SAP ERP system',
    fields: [
      { name: 'order_id', type: 'string', description: 'Order ID' },
      { name: 'customer_id', type: 'string', description: 'Customer ID' },
      { name: 'order_date', type: 'string', description: 'Order Date' },
      { name: 'total_amount', type: 'number', description: 'Total Amount' },
      { name: 'status', type: 'string', description: 'Order Status' }
    ]
  },
  // Salesforce CRM Data Sources (from schema.ts)
  { 
    id: 'salesforce-accounts', 
    name: 'Salesforce Accounts', 
    type: 'table',
    category: 'CRM',
    tableName: 'salesforce_accounts',
    description: 'Account data from Salesforce CRM',
    fields: [
      { name: 'sf_id', type: 'string', description: 'Salesforce ID' },
      { name: 'name', type: 'string', description: 'Account Name' },
      { name: 'industry', type: 'string', description: 'Industry' },
      { name: 'annual_revenue', type: 'number', description: 'Annual Revenue' },
      { name: 'number_of_employees', type: 'number', description: 'Number of Employees' }
    ]
  },
  { 
    id: 'salesforce-opportunities', 
    name: 'Salesforce Opportunities', 
    type: 'table',
    category: 'CRM',
    tableName: 'salesforce_opportunities',
    description: 'Sales opportunities from Salesforce',
    fields: [
      { name: 'sf_id', type: 'string', description: 'Opportunity Salesforce ID' },
      { name: 'name', type: 'string', description: 'Opportunity Name' },
      { name: 'account_id', type: 'string', description: 'Account ID' },
      { name: 'amount', type: 'number', description: 'Opportunity Amount' },
      { name: 'stage_name', type: 'string', description: 'Sales Stage' },
      { name: 'close_date', type: 'string', description: 'Expected Close Date' }
    ]
  },
  // AVEVA PI Industrial Data Sources (from schema.ts)
  { 
    id: 'pi-asset-hierarchy', 
    name: 'AVEVA PI Asset Hierarchy', 
    type: 'table',
    category: 'Industrial',
    tableName: 'pi_asset_hierarchy',
    description: 'Asset hierarchy from AVEVA PI System',
    fields: [
      { name: 'asset_name', type: 'string', description: 'Asset Name' },
      { name: 'asset_path', type: 'string', description: 'Asset Path' },
      { name: 'asset_type', type: 'string', description: 'Asset Type' },
      { name: 'location', type: 'string', description: 'Location' },
      { name: 'operational_status', type: 'string', description: 'Operational Status' }
    ]
  },
  { 
    id: 'pi-drilling-operations', 
    name: 'AVEVA PI Drilling Operations', 
    type: 'table',
    category: 'Industrial',
    tableName: 'pi_drilling_operations',
    description: 'Real-time drilling operations data',
    fields: [
      { name: 'well_pad_id', type: 'string', description: 'Well Pad ID' },
      { name: 'bit_weight', type: 'number', description: 'Bit Weight' },
      { name: 'block_height', type: 'number', description: 'Block Height' },
      { name: 'diff_press', type: 'number', description: 'Differential Pressure' },
      { name: 'flow_in_rate', type: 'number', description: 'Flow In Rate' },
      { name: 'hole_depth', type: 'number', description: 'Hole Depth' },
      { name: 'hook_load', type: 'number', description: 'Hook Load' },
      { name: 'pump_pressure', type: 'number', description: 'Pump Pressure' },
      { name: 'top_drive_rpm', type: 'number', description: 'Top Drive RPM' },
      { name: 'top_drive_torque', type: 'number', description: 'Top Drive Torque' },
      { name: 'timestamp', type: 'string', description: 'Timestamp' }
    ]
  },
  // Manufacturing Data Sources
  { 
    id: 'production-data', 
    name: 'Production Line Data', 
    type: 'table',
    category: 'Manufacturing',
    tableName: 'production_data',
    description: 'Real-time production line metrics',
    fields: [
      { name: 'line_id', type: 'string', description: 'Production Line ID' },
      { name: 'product_id', type: 'string', description: 'Product ID' },
      { name: 'quantity_produced', type: 'number', description: 'Quantity Produced' },
      { name: 'efficiency_rate', type: 'number', description: 'Efficiency Rate' },
      { name: 'temperature', type: 'number', description: 'Temperature' },
      { name: 'pressure', type: 'number', description: 'Pressure' },
      { name: 'vibration', type: 'array', description: 'Vibration Data' }
    ]
  },
  // Quality Control Data
  { 
    id: 'quality-inspections', 
    name: 'Quality Inspections', 
    type: 'table',
    category: 'Quality',
    tableName: 'quality_inspections',
    description: 'Quality control inspection results',
    fields: [
      { name: 'inspection_id', type: 'string', description: 'Inspection ID' },
      { name: 'product_batch', type: 'string', description: 'Product Batch' },
      { name: 'defect_count', type: 'number', description: 'Defect Count' },
      { name: 'pass_rate', type: 'number', description: 'Pass Rate' },
      { name: 'inspector_id', type: 'string', description: 'Inspector ID' },
      { name: 'inspection_result', type: 'boolean', description: 'Inspection Result' }
    ]
  }
];

// Real automation triggers from the system
const automationTriggers = [
  // Schedule-based triggers
  { 
    id: 'schedule-hourly', 
    name: 'Hourly Schedule', 
    type: 'object',
    category: 'Schedule',
    outputs: [
      { name: 'timestamp', type: 'string', description: 'Trigger Timestamp' },
      { name: 'interval', type: 'string', description: 'Schedule Interval' }
    ]
  },
  { 
    id: 'schedule-daily', 
    name: 'Daily Schedule', 
    type: 'object',
    category: 'Schedule',
    outputs: [
      { name: 'timestamp', type: 'string', description: 'Trigger Timestamp' },
      { name: 'date', type: 'string', description: 'Date' }
    ]
  },
  // Event-based triggers
  { 
    id: 'data-change-trigger', 
    name: 'Data Change Event', 
    type: 'object',
    category: 'Event',
    outputs: [
      { name: 'sourceId', type: 'string', description: 'Data Source ID' },
      { name: 'changeType', type: 'string', description: 'Change Type' },
      { name: 'newValue', type: 'object', description: 'New Value' },
      { name: 'oldValue', type: 'object', description: 'Previous Value' }
    ]
  },
  { 
    id: 'threshold-trigger', 
    name: 'Threshold Alert', 
    type: 'object',
    category: 'Event',
    outputs: [
      { name: 'metric', type: 'string', description: 'Metric Name' },
      { name: 'value', type: 'number', description: 'Current Value' },
      { name: 'threshold', type: 'number', description: 'Threshold Value' },
      { name: 'alertLevel', type: 'string', description: 'Alert Level' }
    ]
  },
  // API triggers
  { 
    id: 'webhook-trigger', 
    name: 'Webhook Trigger', 
    type: 'object',
    category: 'API',
    outputs: [
      { name: 'payload', type: 'object', description: 'Webhook Payload' },
      { name: 'headers', type: 'object', description: 'Request Headers' },
      { name: 'method', type: 'string', description: 'HTTP Method' }
    ]
  },
  { 
    id: 'api-call-trigger', 
    name: 'API Call Result', 
    type: 'object',
    category: 'API',
    outputs: [
      { name: 'response', type: 'object', description: 'API Response' },
      { name: 'statusCode', type: 'number', description: 'Status Code' },
      { name: 'timestamp', type: 'string', description: 'Call Timestamp' }
    ]
  }
];

export default function ModelConfigurationTab() {
  const [viewMode, setViewMode] = useState<'folders' | 'editor'>('folders');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<Configuration | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewConfigDialog, setShowNewConfigDialog] = useState(false);
  const [nodes, setNodes] = useState<ModelNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<ModelNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<ModelNode | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<{ nodeId: string; outputId: string; type: string } | null>(null);
  const [showAddNodeMenu, setShowAddNodeMenu] = useState(false);
  const [addNodePosition, setAddNodePosition] = useState({ x: 0, y: 0 });
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [selectedModelForDetails, setSelectedModelForDetails] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['quality-models']));
  const [activeLeftTab, setActiveLeftTab] = useState<'models' | 'data' | 'automation'>('models');
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [newFolder, setNewFolder] = useState({ name: '', description: '' });
  const [newConfig, setNewConfig] = useState({ name: '', description: '', folderId: '' });

  // Get color for data type
  const getTypeColor = (type: string) => {
    const colors = {
      string: '#22c55e',    // green
      number: '#3b82f6',    // blue  
      array: '#f59e0b',     // amber
      object: '#8b5cf6',    // violet
      image: '#ef4444',     // red
      boolean: '#06b6d4'    // cyan
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  };

  // Filter models based on search and category
  const filteredAIModels = availableAIModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredDataSources = dataIntegrationSources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || source.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAutomationTriggers = automationTriggers.filter(trigger => {
    const matchesSearch = trigger.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || trigger.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get possible connections for an input
  const getPossibleConnections = (inputType: string) => {
    const connections: Array<{
      type: string;
      source: string;
      field: string;
      description: string;
    }> = [];
    
    // AI Model outputs
    availableAIModels.forEach(model => {
      model.outputs.forEach(output => {
        if (output.type === inputType) {
          connections.push({
            type: 'ai-model',
            source: model.name,
            field: output.name,
            description: `Output from ${model.name}`
          });
        }
      });
    });
    
    // Data Integration sources
    dataIntegrationSources.forEach(source => {
      source.fields?.forEach(field => {
        if (field.type === inputType) {
          connections.push({
            type: 'data-integration',
            source: source.name,
            field: field.name,
            description: `${field.description} from ${source.name}`
          });
        }
      });
    });
    
    // Automation triggers
    automationTriggers.forEach(trigger => {
      trigger.outputs?.forEach(output => {
        if (output.type === inputType) {
          connections.push({
            type: 'automation',
            source: trigger.name,
            field: output.name,
            description: `${output.description} from ${trigger.name}`
          });
        }
      });
    });
    
    return connections;
  };

  // Create new node
  const createNode = (type: 'ai-model' | 'data-input' | 'automation-input', data?: any) => {
    const id = `node-${Date.now()}`;
    let newNode: ModelNode;

    switch (type) {
      case 'ai-model':
        const modelData = availableAIModels.find(m => m.id === data?.modelId);
        newNode = {
          id,
          type,
          name: data?.name || 'AI Model',
          position: addNodePosition,
          inputs: modelData?.inputs.map(input => ({
            id: `${id}-input-${input.id}`,
            name: input.name,
            type: input.type,
            connected: false
          })) || [],
          outputs: modelData?.outputs.map(output => ({
            id: `${id}-output-${output.id}`,
            name: output.name,
            type: output.type
          })) || [],
          modelId: data?.modelId,
          status: 'ready',
          width: 200,
          height: Math.max(120, (modelData?.inputs.length || 0) * 25 + (modelData?.outputs.length || 0) * 25 + 60)
        };
        break;
      
      case 'data-input':
        const dataSource = dataIntegrationSources.find(ds => ds.id === data?.sourceId);
        newNode = {
          id,
          type,
          name: data?.name || 'Data Input',
          position: addNodePosition,
          inputs: [],
          outputs: dataSource?.fields?.map((field, index) => ({
            id: `${id}-output-${field.name}`,
            name: field.description || field.name,
            type: field.type
          })) || [{
            id: `${id}-output-data`,
            name: 'Data Output',
            type: data?.type || 'object'
          }],
          modelId: data?.sourceId,
          status: 'ready',
          width: Math.max(180, (dataSource?.fields?.length || 1) * 25 + 80),
          height: Math.max(100, (dataSource?.fields?.length || 1) * 25 + 60)
        };
        break;

      case 'automation-input':
        const triggerData = automationTriggers.find(t => t.id === data?.triggerId);
        newNode = {
          id,
          type,
          name: data?.name || 'Automation Trigger',
          position: addNodePosition,
          inputs: [],
          outputs: triggerData?.outputs?.map((output, index) => ({
            id: `${id}-output-${output.name}`,
            name: output.description || output.name,
            type: output.type
          })) || [{
            id: `${id}-output-trigger`,
            name: 'Trigger Output',
            type: data?.type || 'object'
          }],
          modelId: data?.triggerId,
          status: 'ready',
          width: Math.max(180, (triggerData?.outputs?.length || 1) * 25 + 80),
          height: Math.max(100, (triggerData?.outputs?.length || 1) * 25 + 60)
        };
        break;
    }

    setNodes(prev => [...prev, newNode]);
    setShowAddNodeMenu(false);
  };

  // Handle node drag
  const handleNodeMouseDown = (e: React.MouseEvent, node: ModelNode) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNode(node);
    setDragOffset({
      x: e.clientX - rect.left - node.position.x,
      y: e.clientY - rect.top - node.position.y
    });
  };

  // Delete node
  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => 
      conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId
    ));
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Connect two nodes
  const connectNodes = (fromNodeId: string, fromOutputId: string, toNodeId: string, toInputId: string) => {
    const newConnection = {
      id: `conn-${Date.now()}`,
      fromNodeId,
      fromOutputId,
      toNodeId,
      toInputId,
      type: 'data' as const
    };
    
    setConnections(prev => [...prev, newConnection]);
    
    // Update the input as connected
    setNodes(prev => prev.map(node => {
      if (node.id === toNodeId) {
        return {
          ...node,
          inputs: node.inputs.map(input => 
            input.id === toInputId 
              ? { ...input, connected: true }
              : input
          )
        };
      }
      return node;
    }));

    toast({
      title: "Connection Created",
      description: "Nodes have been connected successfully.",
    });
  };

  // Get available output nodes that are currently on canvas
  const getAvailableOutputNodes = (inputType: string): Array<{
    type: string;
    nodeId: string;
    nodeName: string;
    outputId: string;
    outputName: string;
    description: string;
  }> => {
    const outputs: Array<{
      type: string;
      nodeId: string;
      nodeName: string;
      outputId: string;
      outputName: string;
      description: string;
    }> = [];
    
    // AI Model outputs from nodes on canvas (including self-referencing)
    nodes.filter(node => node.type === 'ai-model').forEach(node => {
      const model = availableAIModels.find(m => m.id === node.modelId);
      if (model) {
        // All AI model outputs can be connected regardless of type
        model.outputs.forEach(output => {
          outputs.push({
            type: 'ai-model',
            nodeId: node.id,
            nodeName: node.name,
            outputId: output.id,
            outputName: output.name,
            description: `${output.name} from ${node.name}`
          });
        });
      }
    });
    
    // Data Integration outputs from nodes on canvas
    nodes.filter(node => node.type === 'data-input').forEach(node => {
      if ('sourceId' in node) {
        const source = dataIntegrationSources.find(s => s.id === node.sourceId);
        if (source) {
          // All fields from data sources can be connected regardless of type
          source.fields?.forEach(field => {
            outputs.push({
              type: 'data-integration',
              nodeId: node.id,
              nodeName: node.name,
              outputId: field.name,
              outputName: field.description,
              description: `${field.description} from ${source.tableName || source.name}`
            });
          });
        }
      }
    });
    
    // Automation outputs from nodes on canvas
    nodes.filter(node => node.type === 'automation-input').forEach(node => {
      if ('triggerId' in node) {
        const trigger = automationTriggers.find(t => t.id === node.triggerId);
        if (trigger) {
          // All automation outputs can be connected regardless of type
          trigger.outputs?.forEach(output => {
            outputs.push({
              type: 'automation',
              nodeId: node.id,
              nodeName: node.name,
              outputId: output.name,
              outputName: output.description,
              description: `${output.description} from ${node.name}`
            });
          });
        }
      }
    });
    
    return outputs.filter(output => 
      output.nodeName.toLowerCase().includes(connectionSearchQuery.toLowerCase()) ||
      output.outputName.toLowerCase().includes(connectionSearchQuery.toLowerCase())
    );
  };

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedNode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newPosition = {
      x: e.clientX - rect.left - dragOffset.x,
      y: e.clientY - rect.top - dragOffset.y
    };

    setNodes(prev => prev.map(node => 
      node.id === draggedNode.id 
        ? { ...node, position: newPosition }
        : node
    ));
  }, [draggedNode, dragOffset]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Add event listeners
  useEffect(() => {
    if (draggedNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNode, handleMouseMove, handleMouseUp]);

  // Handle canvas right click
  const handleCanvasRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setAddNodePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setShowAddNodeMenu(true);
  };

  // Handle connection start
  const handleConnectionStart = (nodeId: string, outputId: string, type: string) => {
    setConnecting({ nodeId, outputId, type });
  };

  // Handle connection end
  const handleConnectionEnd = (nodeId: string, inputId: string, inputType: string) => {
    if (!connecting) return;
    
    // Check type compatibility
    if (connecting.type !== inputType) {
      toast({
        title: "Connection Error",
        description: "Input and output types must match",
        variant: "destructive"
      });
      setConnecting(null);
      return;
    }

    const connectionId = `conn-${Date.now()}`;
    const newConnection: Connection = {
      id: connectionId,
      fromNodeId: connecting.nodeId,
      fromOutputId: connecting.outputId,
      toNodeId: nodeId,
      toInputId: inputId,
      type: connecting.type
    };

    setConnections(prev => [...prev, newConnection]);
    
    // Mark input as connected
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? {
            ...node,
            inputs: node.inputs.map(input =>
              input.id === inputId ? { ...input, connected: true } : input
            )
          }
        : node
    ));

    setConnecting(null);
  };

  // Save configuration
  const saveConfiguration = () => {
    if (!currentConfig) return;
    
    const updatedConfig = {
      ...currentConfig,
      nodes,
      connections,
      lastModified: new Date().toISOString()
    };
    
    // In real implementation, save to backend
    toast({
      title: "Configuration Saved",
      description: `${currentConfig.name} has been saved successfully`
    });
  };

  const getFilteredConfigs = (folderId: string) => {
    return sampleConfigurations.filter(config => config.folderId === folderId);
  };

  const handleOpenEditor = (config: Configuration) => {
    setCurrentConfig(config);
    setNodes(config.nodes);
    setConnections(config.connections);
    setViewMode('editor');
  };

  const handleBackToFolders = () => {
    setViewMode('folders');
    setCurrentConfig(null);
    setSelectedFolder(null);
    setNodes([]);
    setConnections([]);
  };

  if (viewMode === 'editor') {
    return (
      <div className="h-full flex flex-col">
        {/* Editor Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBackToFolders}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Configurations
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentConfig?.name}</h1>
                <p className="text-sm text-gray-600">{currentConfig?.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveConfiguration}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button>
                <Play className="w-4 h-4 mr-2" />
                Test Configuration
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - AI Models */}
          <div className={`${isLeftPanelCollapsed ? 'w-12' : 'w-80'} bg-gray-100 border-r border-gray-300 flex flex-col transition-all duration-300`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              {!isLeftPanelCollapsed && (
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Models</h3>
                  <p className="text-sm text-gray-600">Drag models to canvas</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                className="flex-shrink-0"
              >
                {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>

            {!isLeftPanelCollapsed && (
              <>
                {/* Search and Filter */}
                <div className="p-4 border-b border-gray-200 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search resources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Tab Navigation */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      className={`flex-1 text-xs py-2 px-3 rounded-md transition-colors ${
                        activeLeftTab === 'models' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={() => setActiveLeftTab('models')}
                    >
                      <Brain className="w-3 h-3 inline mr-1" />
                      Models
                    </button>
                    <button
                      className={`flex-1 text-xs py-2 px-3 rounded-md transition-colors ${
                        activeLeftTab === 'data' 
                          ? 'bg-white text-green-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={() => setActiveLeftTab('data')}
                    >
                      <Database className="w-3 h-3 inline mr-1" />
                      Data
                    </button>
                    <button
                      className={`flex-1 text-xs py-2 px-3 rounded-md transition-colors ${
                        activeLeftTab === 'automation' 
                          ? 'bg-white text-purple-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={() => setActiveLeftTab('automation')}
                    >
                      <Zap className="w-3 h-3 inline mr-1" />
                      Auto
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {!isLeftPanelCollapsed && (
              <div className="flex-1 overflow-y-auto p-4">
                {/* AI Models Tab */}
                {activeLeftTab === 'models' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-600" />
                      Uploaded Models ({filteredAIModels.length})
                    </h4>
                    
                    <div className="space-y-3">
                      {modelFolders.map((folder) => {
                        const folderModels = filteredAIModels.filter(model => model.folderId === folder.id);
                        if (folderModels.length === 0) return null;
                        
                        const isExpanded = expandedFolders.has(folder.id);
                        
                        return (
                          <div key={folder.id}>
                            <div 
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleFolder(folder.id)}
                            >
                              <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <Folder className="w-3 h-3 text-blue-500" />
                              <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                              <Badge variant="secondary" className="text-xs">{folderModels.length}</Badge>
                            </div>
                            
                            {isExpanded && (
                              <div className="ml-4 mt-2 space-y-2">
                                {folderModels.map((model) => (
                                  <div
                                    key={model.id}
                                    className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow relative group"
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('application/json', JSON.stringify({
                                        type: 'ai-model',
                                        modelId: model.id,
                                        name: model.name
                                      }));
                                    }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-medium text-gray-900 truncate">{model.name}</h5>
                                        <div className="text-xs text-gray-500 mt-1">
                                          Inputs: {model.inputs.length} • Outputs: {model.outputs.length}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {model.inputs.slice(0, 2).map((input) => (
                                            <span
                                              key={input.id}
                                              className="inline-block px-1.5 py-0.5 text-xs rounded"
                                              style={{ 
                                                backgroundColor: `${getTypeColor(input.type)}20`,
                                                color: getTypeColor(input.type)
                                              }}
                                            >
                                              {input.name}
                                            </span>
                                          ))}
                                          {model.inputs.length > 2 && (
                                            <span className="text-xs text-gray-400">+{model.inputs.length - 2}</span>
                                          )}
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex gap-1 mt-3">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAddNodePosition({ x: 100, y: 100 });
                                              createNode('ai-model', { modelId: model.id, name: model.name });
                                            }}
                                          >
                                            Add to Canvas
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs px-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedModelForDetails(model);
                                              setIsRightPanelOpen(true);
                                            }}
                                          >
                                            <Info className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data Integration Tab */}
                {activeLeftTab === 'data' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4 text-green-600" />
                      Data Sources ({filteredDataSources.length})
                    </h4>
                    <div className="space-y-3">
                      {['ERP', 'CRM', 'Industrial', 'Database', 'Manufacturing', 'Quality'].map(category => {
                        const sources = filteredDataSources.filter(s => s.category === category);
                        if (sources.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <div className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
                              <span>{category}</span>
                              <Badge variant="outline" className="text-xs">{sources.length}</Badge>
                            </div>
                            <div className="space-y-1">
                              {sources.map(source => (
                                <div
                                  key={source.id}
                                  className="p-2 bg-white border border-gray-200 rounded hover:shadow-sm transition-shadow group"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      type: 'data-input',
                                      sourceId: source.id,
                                      name: source.name
                                    }));
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-900 truncate">{source.name}</div>
                                        <div className="text-xs text-gray-500">
                                          {source.tableName && <span className="font-mono bg-gray-100 px-1 rounded mr-1">{source.tableName}</span>}
                                          {source.fields?.length || 0} fields
                                        </div>
                                        {source.description && (
                                          <div className="text-xs text-gray-400 truncate mt-1">{source.description}</div>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddNodePosition({ x: 100, y: 200 });
                                        createNode('data-input', { 
                                          name: source.name, 
                                          type: source.type,
                                          sourceId: source.id
                                        });
                                      }}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Automation Tab */}
                {activeLeftTab === 'automation' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      Automation ({filteredAutomationTriggers.length})
                    </h4>
                    <div className="space-y-3">
                      {['Schedule', 'Event', 'API'].map(category => {
                        const triggers = filteredAutomationTriggers.filter(t => t.category === category);
                        if (triggers.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <div className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
                              <span>{category}</span>
                              <Badge variant="outline" className="text-xs">{triggers.length}</Badge>
                            </div>
                            <div className="space-y-1">
                              {triggers.map(trigger => (
                                <div
                                  key={trigger.id}
                                  className="p-2 bg-white border border-gray-200 rounded hover:shadow-sm transition-shadow group"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      type: 'automation-input',
                                      triggerId: trigger.id,
                                      name: trigger.name
                                    }));
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-900 truncate">{trigger.name}</div>
                                        <div className="text-xs text-gray-500">{trigger.outputs?.length || 0} outputs</div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddNodePosition({ x: 100, y: 300 });
                                        createNode('automation-input', { 
                                          name: trigger.name, 
                                          type: trigger.type,
                                          triggerId: trigger.id
                                        });
                                      }}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>



          {/* Canvas Area */}
          <div className={`${isRightPanelOpen ? 'flex-1' : 'flex-1'} relative overflow-hidden bg-gray-900`}>
          <div
            ref={canvasRef}
            className="w-full h-full relative cursor-crosshair"
            onContextMenu={handleCanvasRightClick}
            onClick={() => setShowAddNodeMenu(false)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;

              const dropPosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              };

              try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                setAddNodePosition(dropPosition);
                
                if (data.type === 'ai-model') {
                  createNode('ai-model', { modelId: data.modelId, name: data.name });
                } else if (data.type === 'data-input') {
                  createNode('data-input', { 
                    name: data.name, 
                    sourceId: data.sourceId 
                  });
                } else if (data.type === 'automation-input') {
                  createNode('automation-input', { 
                    name: data.name, 
                    triggerId: data.triggerId 
                  });
                }
              } catch (error) {
                console.error('Error parsing drop data:', error);
              }
            }}
          >
            {/* Grid Background */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />

            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map(connection => {
                const fromNode = nodes.find(n => n.id === connection.fromNodeId);
                const toNode = nodes.find(n => n.id === connection.toNodeId);
                const fromOutput = fromNode?.outputs.find(o => o.id === connection.fromOutputId);
                const toInput = toNode?.inputs.find(i => i.id === connection.toInputId);
                
                if (!fromNode || !toNode || !fromOutput || !toInput) return null;

                const fromX = fromNode.position.x + fromNode.width;
                const fromY = fromNode.position.y + 60 + fromNode.outputs.indexOf(fromOutput) * 25 + 12;
                const toX = toNode.position.x;
                const toY = toNode.position.y + 60 + toNode.inputs.indexOf(toInput) * 25 + 12;

                const midX = (fromX + toX) / 2;
                
                return (
                  <path
                    key={connection.id}
                    d={`M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`}
                    stroke={getTypeColor(connection.type)}
                    strokeWidth="2"
                    fill="none"
                    className="drop-shadow-sm"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                className="absolute bg-gray-800 border border-gray-600 rounded-lg shadow-lg cursor-move"
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: node.width,
                  minHeight: node.height
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Node Header */}
                <div className={`px-3 py-2 rounded-t-lg text-white text-sm font-medium ${
                  node.type === 'ai-model' ? 'bg-blue-600' :
                  node.type === 'data-input' ? 'bg-green-600' :
                  'bg-purple-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate">{node.name}</span>
                    <div className="flex items-center gap-1">
                      {node.type === 'ai-model' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              const model = availableAIModels.find(m => m.id === node.modelId);
                              if (model) {
                                setSelectedModelForDetails(model);
                                setIsRightPanelOpen(true);
                              }
                            }}
                          >
                            <Info className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-200 hover:text-red-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete "${node.name}" from canvas?`)) {
                                deleteNode(node.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Circle className={`w-3 h-3 ${
                        node.status === 'ready' ? 'text-green-400' :
                        node.status === 'running' ? 'text-yellow-400' :
                        'text-red-400'
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Node Body */}
                <div className="p-3 space-y-1">
                  {/* Node Info */}
                  {node.type !== 'ai-model' && (
                    <div className="text-xs text-gray-500 mb-2 border-b border-gray-600 pb-1">
                      {node.type === 'data-input' ? 'Data Source' : 'Automation Trigger'}
                    </div>
                  )}
                  
                  {/* Inputs */}
                  {node.inputs.map((input, index) => (
                    <div key={input.id} className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform"
                          style={{ 
                            backgroundColor: input.connected ? getTypeColor(input.type) : 'transparent',
                            borderColor: getTypeColor(input.type)
                          }}
                          onClick={() => {
                            if (connecting && connecting.type === input.type) {
                              handleConnectionEnd(node.id, input.id, input.type);
                            }
                          }}
                          title={`${input.name} (${input.type})`}
                        />
                        <span className="text-gray-300 truncate max-w-28">{input.name}</span>
                      </div>
                      <span className="text-gray-500 text-xs">{input.type}</span>
                    </div>
                  ))}

                  {/* Separator if both inputs and outputs exist */}
                  {node.inputs.length > 0 && node.outputs.length > 0 && (
                    <div className="border-t border-gray-600 my-2"></div>
                  )}

                  {/* Outputs */}
                  {node.outputs.map((output, index) => (
                    <div key={output.id} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500 text-xs">{output.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 truncate max-w-28">{output.name}</span>
                        <div
                          className="w-3 h-3 rounded-full cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: getTypeColor(output.type) }}
                          onClick={() => handleConnectionStart(node.id, output.id, output.type)}
                          title={`${output.name} (${output.type})`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add Node Menu */}
            {showAddNodeMenu && (
              <div
                className="absolute bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-48"
                style={{
                  left: addNodePosition.x,
                  top: addNodePosition.y
                }}
              >
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-400 mb-2">Add Node</div>
                  
                  {/* AI Models */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">AI Models</div>
                    {availableAIModels.map(model => (
                      <button
                        key={model.id}
                        className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                        onClick={() => createNode('ai-model', { modelId: model.id, name: model.name })}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>

                  {/* Data Sources by Category */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Data Integration</div>
                    {['ERP', 'CRM', 'Industrial', 'Database', 'Manufacturing', 'Quality'].map(category => {
                      const sources = dataIntegrationSources.filter(s => s.category === category);
                      if (sources.length === 0) return null;
                      
                      return (
                        <div key={category} className="mb-1">
                          <div className="text-xs text-gray-600 px-2 py-1">{category}</div>
                          {sources.map(source => (
                            <button
                              key={source.id}
                              className="w-full text-left px-4 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                              onClick={() => createNode('data-input', { 
                                name: source.name, 
                                type: source.type,
                                sourceId: source.id
                              })}
                            >
                              {source.name}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* Automation by Category */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Automation</div>
                    {['Schedule', 'Event', 'API'].map(category => {
                      const triggers = automationTriggers.filter(t => t.category === category);
                      if (triggers.length === 0) return null;
                      
                      return (
                        <div key={category} className="mb-1">
                          <div className="text-xs text-gray-600 px-2 py-1">{category}</div>
                          {triggers.map(trigger => (
                            <button
                              key={trigger.id}
                              className="w-full text-left px-4 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                              onClick={() => createNode('automation-input', { 
                                name: trigger.name, 
                                type: trigger.type,
                                triggerId: trigger.id
                              })}
                            >
                              {trigger.name}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Right Panel - Model Details */}
          {isRightPanelOpen && selectedModelForDetails && (
            <div className="w-96 bg-white border-l border-gray-300 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Model Details</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm(`Delete model "${selectedModelForDetails.name}"?`)) {
                        toast({
                          title: "Model Deleted",
                          description: `${selectedModelForDetails.name} has been deleted.`,
                          variant: "destructive"
                        });
                        setIsRightPanelOpen(false);
                        setSelectedModelForDetails(null);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRightPanelOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Model Info */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">{selectedModelForDetails.name}</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Model ID: {selectedModelForDetails.id}</div>
                    <div>Inputs: {selectedModelForDetails.inputs.length}</div>
                    <div>Outputs: {selectedModelForDetails.outputs.length}</div>
                  </div>
                </div>

                {/* Outputs Section */}
                <div>
                  <h5 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-green-600" />
                    Outputs
                  </h5>
                  <div className="space-y-3">
                    {selectedModelForDetails.outputs.map((output: any) => (
                      <div key={output.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{output.name}</span>
                          <span 
                            className="px-2 py-1 text-xs rounded-full text-white"
                            style={{ backgroundColor: getTypeColor(output.type) }}
                          >
                            {output.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          This output can be connected to inputs of the same type in other models
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inputs Section */}
                <div>
                  <h5 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-600 transform rotate-180" />
                    Inputs
                  </h5>
                  <div className="space-y-3">
                    {selectedModelForDetails.inputs.map((input: any) => (
                      <div key={input.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{input.name}</span>
                          <span 
                            className="px-2 py-1 text-xs rounded-full text-white"
                            style={{ backgroundColor: getTypeColor(input.type) }}
                          >
                            {input.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Required input for model processing
                        </p>
                        
                        {/* Possible Connections Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <Link2 className="w-3 h-3 mr-1" />
                              View Possible Connections
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Connect to "{input.name}" ({input.type})</DialogTitle>
                              <DialogDescription>
                                Select an output from the nodes currently on your canvas to connect to this input.
                              </DialogDescription>
                            </DialogHeader>
                            
                            {/* Search for connections */}
                            <div className="mb-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  placeholder="Search available outputs..."
                                  value={connectionSearchQuery}
                                  onChange={(e) => setConnectionSearchQuery(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                              {getAvailableOutputNodes(input.type).length === 0 ? (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                  <div className="mb-2">No compatible outputs found on canvas</div>
                                  <div className="text-sm">Add nodes with "{input.type}" outputs to connect to this input</div>
                                </div>
                              ) : (
                                getAvailableOutputNodes(input.type).map((output, index) => (
                                  <div 
                                    key={index} 
                                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                      const targetNode = nodes.find(n => n.id === selectedModelForDetails.id);
                                      if (targetNode) {
                                        connectNodes(
                                          output.nodeId, 
                                          output.outputId, 
                                          targetNode.id, 
                                          input.id
                                        );
                                      }
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div 
                                        className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                                        style={{ 
                                          backgroundColor: 
                                            output.type === 'ai-model' ? '#3b82f6' :
                                            output.type === 'data-integration' ? '#22c55e' :
                                            '#8b5cf6'
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-sm text-gray-900">{output.nodeName}</span>
                                          <Badge 
                                            variant="outline" 
                                            className="text-xs"
                                            style={{
                                              borderColor: 
                                                output.type === 'ai-model' ? '#3b82f6' :
                                                output.type === 'data-integration' ? '#22c55e' :
                                                '#8b5cf6',
                                              color:
                                                output.type === 'ai-model' ? '#3b82f6' :
                                                output.type === 'data-integration' ? '#22c55e' :
                                                '#8b5cf6'
                                            }}
                                          >
                                            {output.type === 'ai-model' ? 'AI Model' :
                                             output.type === 'data-integration' ? 'Data Source' :
                                             'Automation'}
                                          </Badge>
                                        </div>
                                        <div className="text-sm text-gray-700 mb-1">→ {output.outputName}</div>
                                        <div className="text-xs text-gray-500">{output.description}</div>
                                        <div className="mt-2 flex items-center gap-1">
                                          <span 
                                            className="inline-block w-2 h-2 rounded-full"
                                            style={{ backgroundColor: getTypeColor(input.type) }}
                                          />
                                          <span className="text-xs text-gray-500">{input.type} type</span>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        className="flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const targetNode = nodes.find(n => n.type === 'ai-model' && 
                                            availableAIModels.find(m => m.id === n.modelId)?.id === selectedModelForDetails.id
                                          );
                                          if (targetNode) {
                                            connectNodes(
                                              output.nodeId, 
                                              output.outputId, 
                                              targetNode.id, 
                                              input.id
                                            );
                                          }
                                        }}
                                      >
                                        Connect
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Folders view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Configuration</h1>
          <p className="text-gray-600">Create and manage AI model workflows</p>
        </div>
        <Button onClick={() => setShowNewFolderDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      {!selectedFolder ? (
        // Folder grid view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleFolders.map((folder) => (
            <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">{folder.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{folder.configCount} configs</Badge>
                </div>
                <p className="text-sm text-gray-600">{folder.description}</p>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-500 mb-4">
                  Created: {new Date(folder.createdAt).toLocaleDateString()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  Open Folder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Configuration list view
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedFolder(null)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Folders
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {sampleFolders.find(f => f.id === selectedFolder)?.name}
              </h2>
              <p className="text-gray-600">
                {sampleFolders.find(f => f.id === selectedFolder)?.description}
              </p>
            </div>
            <Button 
              onClick={() => {
                setNewConfig({ ...newConfig, folderId: selectedFolder });
                setShowNewConfigDialog(true);
              }}
              className="ml-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Configuration
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredConfigs(selectedFolder).map((config) => (
              <Card key={config.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Workflow className="w-5 h-5 text-purple-600" />
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                    </div>
                    <Badge className={
                      config.status === 'published' ? 'bg-green-100 text-green-800' :
                      config.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {config.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-gray-500">
                    <div>Created: {new Date(config.createdAt).toLocaleDateString()}</div>
                    <div>Modified: {new Date(config.lastModified).toLocaleDateString()}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEditor(config)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolder.name}
                onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <Label htmlFor="folder-description">Description</Label>
              <Input
                id="folder-description"
                value={newFolder.description}
                onChange={(e) => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter folder description"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => {
                  toast({ title: "Success", description: "Folder created successfully" });
                  setShowNewFolderDialog(false);
                  setNewFolder({ name: '', description: '' });
                }}
                disabled={!newFolder.name}
                className="flex-1"
              >
                Create Folder
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowNewFolderDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Configuration Dialog */}
      <Dialog open={showNewConfigDialog} onOpenChange={setShowNewConfigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="config-name">Configuration Name</Label>
              <Input
                id="config-name"
                value={newConfig.name}
                onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter configuration name"
              />
            </div>
            <div>
              <Label htmlFor="config-description">Description</Label>
              <Input
                id="config-description"
                value={newConfig.description}
                onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter configuration description"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => {
                  const newConfigData: Configuration = {
                    id: `config-${Date.now()}`,
                    name: newConfig.name,
                    description: newConfig.description,
                    folderId: newConfig.folderId,
                    nodes: [],
                    connections: [],
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    status: 'draft'
                  };
                  handleOpenEditor(newConfigData);
                  setShowNewConfigDialog(false);
                  setNewConfig({ name: '', description: '', folderId: '' });
                }}
                disabled={!newConfig.name}
                className="flex-1"
              >
                Create & Edit
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowNewConfigDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}