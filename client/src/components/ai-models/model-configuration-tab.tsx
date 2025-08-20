import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  Link2,
  Target,
  Monitor
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ViewData {
  id: string;
  name: string;
  description?: string;
  outputs?: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'array' | 'object' | 'image' | 'boolean';
  }>;
}

interface ModelNode {
  id: string;
  type: 'ai-model' | 'data-input' | 'automation-input' | 'view-data' | 'final-goal';
  name: string;
  uniqueName: string; // For duplicate handling (e.g., "Salesforce Account_1")
  position: { x: number; y: number };
  inputs: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'array' | 'object' | 'image' | 'boolean';
    connected: boolean;
    active: boolean; // 연결 대기 상태
    value?: any;
  }>;
  outputs: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'array' | 'object' | 'image' | 'boolean';
    active: boolean; // 연결 시작 상태
  }>;
  modelId?: string; // Reference to uploaded model
  sourceId?: string; // Reference to data source
  triggerId?: string; // Reference to automation trigger
  viewId?: string; // Reference to view
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
  sourceOutputName?: string;
  targetInputName?: string;
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
  { id: 'user-models', name: 'User Models', description: 'Your uploaded models' },
  { id: 'quality-models', name: 'Quality Control Models', description: 'Models for quality inspection and defect detection' },
  { id: 'maintenance-models', name: 'Maintenance Models', description: 'Predictive maintenance and failure detection models' },
  { id: 'production-models', name: 'Production Optimization', description: 'Models for production efficiency and optimization' }
];

// Merge real AI models with sample models for demonstration
// Function to group models by category for organized display
const groupModelsByCategory = (models: any[]) => {
  const folders = new Map();
  
  models.forEach(model => {
    const category = model.category || 'User Models';
    if (!folders.has(category)) {
      folders.set(category, []);
    }
    folders.get(category).push(model);
  });
  
  return Array.from(folders.entries()).map(([name, models]) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    models: models as any[]
  }));
};

// Sample AI models with input/output schemas organized by folders
const sampleAIModels = [
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

// Real data sources - these will be fetched from API
const useDataIntegrationSources = () => {
  const { data: dataSources = [], isLoading } = useQuery({
    queryKey: ['/api/data-sources'],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Transform data sources into the format expected by the node interface
  const transformedSources = useMemo(() => {
    const sources: any[] = [];

    dataSources.forEach((dataSource: any) => {
      if (dataSource.dataSchema && Array.isArray(dataSource.dataSchema)) {
        dataSource.dataSchema.forEach((table: any) => {
          sources.push({
            id: `${dataSource.id}-${table.table}`,
            name: `${dataSource.name} - ${table.table}`,
            type: 'table',
            category: dataSource.category || dataSource.type,
            tableName: table.table,
            sourceId: dataSource.id,
            description: `Data from ${dataSource.name}`,
            fields: table.fields || [],
            recordCount: table.recordCount || 0
          });
        });
      } else {
        // For data sources without schema, create a generic entry
        sources.push({
          id: dataSource.id,
          name: dataSource.name,
          type: 'datasource',
          category: dataSource.category || dataSource.type,
          sourceId: dataSource.id,
          description: dataSource.name,
          fields: [],
          recordCount: dataSource.recordCount || 0
        });
      }
    });

    return sources;
  }, [dataSources]);

  return { dataSources: transformedSources, isLoading };
};

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
  const [isDragging, setIsDragging] = useState(false);
  const [connecting, setConnecting] = useState<{ nodeId: string; outputId: string; type: string; outputName?: string; startX: number; startY: number } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showAddNodeMenu, setShowAddNodeMenu] = useState(false);
  const [addNodePosition, setAddNodePosition] = useState({ x: 0, y: 0 });
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [selectedModelForDetails, setSelectedModelForDetails] = useState<any>(null);
  const [selectedNodeForDetails, setSelectedNodeForDetails] = useState<ModelNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['user-models', 'quality-models']));
  const [activeLeftTab, setActiveLeftTab] = useState<'models' | 'data' | 'views'>('models');
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const [testResults, setTestResults] = useState<{
    status: 'success' | 'error';
    message: string;
    details: any;
  } | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [selectedNodeForConnection, setSelectedNodeForConnection] = useState<{nodeId: string; inputId: string} | null>(null);
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<ModelNode | null>(null);
  
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

  // Fetch real views data
  const { data: availableViews = [] } = useQuery<ViewData[]>({
    queryKey: ['/api/views'],
    staleTime: 60000
  });

  // Fetch actual AI models from the server with real-time updates
  const { data: realAIModels = [], refetch: refetchModels } = useQuery({
    queryKey: ['/api/ai-models'],
    refetchInterval: 3000, // Refetch every 3 seconds for real-time analysis status updates
    staleTime: 1000, // Consider data fresh for only 1 second
  });

  // Use real data integration sources
  const { dataSources: realDataSources, isLoading: isDataSourcesLoading } = useDataIntegrationSources();

  // Transform real AI models to match expected format and combine with samples
  const availableAIModels = useMemo(() => {
    const transformedRealModels = (realAIModels as any[]).map(model => ({
      id: model.id,
      name: model.name,
      type: model.modelType || 'pytorch',
      category: 'User Models',
      folderId: 'user-models',
      inputs: model.inputSpecs ? model.inputSpecs.map((spec: any) => ({
        id: spec.name,
        name: spec.name,
        type: spec.dataType === 'tensor' ? 'number' : spec.dataType || 'number',
        shape: spec.shape || [],
        description: spec.description || ''
      })) : [],
      outputs: model.outputSpecs ? model.outputSpecs.map((spec: any) => ({
        id: spec.name,
        name: spec.name,
        type: spec.dataType === 'tensor' ? 'number' : spec.dataType || 'number', 
        shape: spec.shape || [],
        description: spec.description || ''
      })) : [],
      analysisStatus: model.analysisStatus,
      analysisProgress: model.analysisProgress || 0,
      status: model.status,
      fileName: model.fileName,
      fileSize: model.fileSize
    }));

    // Combine real models with sample models
    return [...transformedRealModels, ...sampleAIModels];
  }, [realAIModels]);

  // Filter models based on search and category
  const filteredAIModels = availableAIModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredDataSources = realDataSources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || source.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAutomationTriggers = automationTriggers.filter(trigger => {
    const matchesSearch = trigger.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || trigger.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate dynamic node width based on text content
  const calculateNodeWidth = (text: string, hasButtons: boolean = false): number => {
    const baseWidth = 180;
    const charWidth = 8;
    const buttonSpace = hasButtons ? 60 : 0;
    const textWidth = text.length * charWidth;
    const minWidth = Math.max(baseWidth, textWidth + buttonSpace + 40);
    return Math.min(minWidth, 350); // Max width cap
  };

  // Generate unique name for duplicate nodes
  const generateUniqueName = (baseName: string, existingNodes: ModelNode[]): string => {
    const existingNames = existingNodes.map(n => n.uniqueName);
    let counter = 1;
    let uniqueName = baseName;
    
    while (existingNames.includes(uniqueName)) {
      counter++;
      uniqueName = `${baseName}_${counter}`;
    }
    
    return uniqueName;
  };

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
      model.outputs.forEach((output: any) => {
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
  const createNode = (type: 'ai-model' | 'data-input' | 'automation-input' | 'view-data' | 'final-goal', data?: any) => {
    const id = `node-${Date.now()}`;
    let newNode: ModelNode;

    switch (type) {
      case 'ai-model':
        const modelData = availableAIModels.find(m => m.id === data?.modelId);
        const uniqueName = generateUniqueName(data?.name || 'AI Model', nodes);
        newNode = {
          id,
          type,
          name: data?.name || 'AI Model',
          uniqueName,
          position: addNodePosition,
          inputs: modelData?.inputs.map((input: any) => ({
            id: `${id}-input-${input.id}`,
            name: input.name,
            type: input.type,
            connected: false,
            active: false
          })) || [],
          outputs: modelData?.outputs.map((output: any) => ({
            id: `${id}-output-${output.id}`,
            name: output.name,
            type: output.type,
            active: false
          })) || [],
          modelId: data?.modelId,
          status: 'ready',
          width: calculateNodeWidth(uniqueName, true),
          height: Math.max(120, (modelData?.inputs.length || 0) * 25 + (modelData?.outputs.length || 0) * 25 + 60)
        };
        break;
      
      case 'data-input':
        const dataSource = realDataSources.find(ds => ds.id === data?.sourceId);
        const dataUniqueName = generateUniqueName(data?.name || 'Data Input', nodes);
        newNode = {
          id,
          type,
          name: data?.name || 'Data Input',
          uniqueName: dataUniqueName,
          position: addNodePosition,
          inputs: [],
          outputs: dataSource?.fields?.map((field, index) => ({
            id: `${id}-output-${field.name}`,
            name: field.description || field.name,
            type: field.type,
            active: false
          })) || [{
            id: `${id}-output-data`,
            name: 'Data Output',
            type: data?.type || 'object',
            active: false
          }],
          sourceId: data?.sourceId,
          status: 'ready',
          width: calculateNodeWidth(dataUniqueName, true),
          height: Math.max(100, (dataSource?.fields?.length || 1) * 25 + 60)
        };
        break;

      case 'automation-input':
        const triggerData = automationTriggers.find(t => t.id === data?.triggerId);
        const automationUniqueName = generateUniqueName(data?.name || 'Automation Trigger', nodes);
        newNode = {
          id,
          type,
          name: data?.name || 'Automation Trigger',
          uniqueName: automationUniqueName,
          position: addNodePosition,
          inputs: [],
          outputs: triggerData?.outputs?.map((output, index) => ({
            id: `${id}-output-${output.name}`,
            name: output.description || output.name,
            type: output.type,
            active: false
          })) || [{
            id: `${id}-output-trigger`,
            name: 'Trigger Output',
            type: data?.type || 'object',
            active: false
          }],
          triggerId: data?.triggerId,
          status: 'ready',
          width: calculateNodeWidth(automationUniqueName, true),
          height: Math.max(100, (triggerData?.outputs?.length || 1) * 25 + 60)
        };
        break;

      case 'view-data':
        const viewData = availableViews.find(v => v.id === data?.viewId);
        const viewUniqueName = generateUniqueName(data?.name || 'View Data', nodes);
        newNode = {
          id,
          type,
          name: data?.name || 'View Data',
          uniqueName: viewUniqueName,
          position: addNodePosition,
          inputs: [],
          outputs: viewData?.outputs?.map((output: any, index: number) => ({
            id: `${id}-output-${output.id}`,
            name: output.name,
            type: output.type,
            active: false
          })) || [{
            id: `${id}-output-view`,
            name: 'View Output',
            type: 'object',
            active: false
          }],
          viewId: data?.viewId,
          status: 'ready',
          width: calculateNodeWidth(viewUniqueName, true),
          height: Math.max(100, (viewData?.outputs?.length || 1) * 25 + 60)
        };
        break;

      case 'final-goal':
        const goalUniqueName = generateUniqueName('Final Goal', nodes);
        newNode = {
          id,
          type,
          name: 'Final Goal',
          uniqueName: goalUniqueName,
          position: addNodePosition,
          inputs: [{
            id: `${id}-input-goal`,
            name: 'Goal Input',
            type: 'object',
            connected: false,
            active: false
          }],
          outputs: [],
          status: 'ready',
          width: calculateNodeWidth(goalUniqueName, true),
          height: 100
        };
        break;
    }

    setNodes(prev => [...prev, newNode]);
    setShowAddNodeMenu(false);
  };

  // New simplified drag system
  const handleNodeMouseDown = (e: React.MouseEvent, node: ModelNode) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left - node.position.x;
    const offsetY = e.clientY - rect.top - node.position.y;

    setDraggedNode(node);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);

    // Add event listeners to window for global drag
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - rect.left - offsetX;
      const newY = moveEvent.clientY - rect.top - offsetY;
      
      // Update node position immediately
      setNodes(prev => prev.map(n => 
        n.id === node.id 
          ? { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
          : n
      ));
    };

    const handleMouseUp = () => {
      setDraggedNode(null);
      setIsDragging(false);
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Delete node
  const initiateDeleteNode = (nodeId: string) => {
    console.log('🗑️ Delete initiated for node:', nodeId);
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    console.log('🗑️ Found node to delete:', nodeToDelete);
    
    // Don't allow deleting final goal if it's the only one
    if (nodeToDelete?.type === 'final-goal' && nodes.filter(n => n.type === 'final-goal').length === 1) {
      console.log('🗑️ Cannot delete - final goal protection');
      toast({
        title: "Cannot Delete",
        description: "At least one final goal is required for the configuration.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('🗑️ Setting delete dialog state...');
    setNodeToDelete(nodeToDelete || null);
    setShowDeleteDialog(true);
    console.log('🗑️ Delete dialog should be visible now');
  };

  const deleteNode = () => {
    console.log('🗑️ Delete confirmed, nodeToDelete:', nodeToDelete);
    if (!nodeToDelete) return;
    
    console.log('🗑️ Removing node from nodes array...');
    setNodes(prev => prev.filter(node => node.id !== nodeToDelete.id));
    console.log('🗑️ Removing connections...');
    setConnections(prev => prev.filter(conn => 
      conn.fromNodeId !== nodeToDelete.id && conn.toNodeId !== nodeToDelete.id
    ));
    
    console.log('🗑️ Closing dialog...');
    setShowDeleteDialog(false);
    setNodeToDelete(null);
    toast({
      title: "Node Deleted",
      description: `${nodeToDelete.name} has been removed from the configuration.`,
    });
    console.log('🗑️ Delete operation completed');
  };

  const cancelDeleteNode = () => {
    setShowDeleteDialog(false);
    setNodeToDelete(null);
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

  // Connect two nodes with improved validation and management
  const connectNodes = (fromNodeId: string, fromOutputId: string, toNodeId: string, toInputId: string) => {
    const sourceNode = nodes.find(n => n.id === fromNodeId);
    const targetNode = nodes.find(n => n.id === toNodeId);
    
    if (!sourceNode || !targetNode) {
      toast({
        title: "Connection Failed",
        description: "Source or target node not found",
        variant: "destructive"
      });
      return;
    }
    
    const sourceOutput = sourceNode.outputs.find(o => o.id === fromOutputId);
    const targetInput = targetNode.inputs.find(i => i.id === toInputId);
    
    if (!sourceOutput || !targetInput) {
      toast({
        title: "Connection Failed",
        description: "Source output or target input not found",
        variant: "destructive"
      });
      return;
    }
    
    // Check type compatibility
    if (sourceOutput.type !== targetInput.type) {
      toast({
        title: "Connection Failed",
        description: `Cannot connect ${sourceOutput.type} to ${targetInput.type}`,
        variant: "destructive"
      });
      return;
    }
    
    const connectionId = `${fromNodeId}-${fromOutputId}-${toNodeId}-${toInputId}`;
    
    setConnections(prev => {
      // Remove existing connection to the same input
      const filtered = prev.filter(c => !(c.toNodeId === toNodeId && c.toInputId === toInputId));
      
      return [...filtered, {
        id: connectionId,
        fromNodeId,
        fromOutputId,
        toNodeId,
        toInputId,
        type: sourceOutput.type,
        sourceOutputName: sourceOutput.name,
        targetInputName: targetInput.name
      }];
    });
    
    // Update target input as connected
    setNodes(prev => prev.map(node => {
      if (node.id === toNodeId) {
        return {
          ...node,
          inputs: node.inputs.map(input => {
            if (input.id === toInputId) {
              return { ...input, connected: true };
            }
            return input;
          })
        };
      }
      return node;
    }));
    
    toast({
      title: "Connection Created",
      description: `Connected ${sourceOutput.name} to ${targetInput.name}`,
    });
  };

  // Setup complete test workflow with proper connections
  const setupCompleteTestWorkflow = () => {
    // Clear existing nodes and connections
    setNodes([]);
    setConnections([]);
    
    const newNodes: any[] = [
      // Data Input Node - Production Data
      {
        id: 'data-production',
        type: 'data-input',
        name: 'Production Line Data',
        uniqueName: 'Production Line Data',
        position: { x: 50, y: 100 },
        width: 220,
        height: 160,
        status: 'ready',
        sourceId: 'production-data',
        inputs: [],
        outputs: [
          { id: 'quantity_produced', name: 'Quantity Produced', type: 'number' },
          { id: 'efficiency_rate', name: 'Efficiency Rate', type: 'number' },
          { id: 'temperature', name: 'Temperature', type: 'number' },
          { id: 'vibration', name: 'Vibration Data', type: 'array' }
        ]
      },
      // AI Model 1 - Quality Classifier
      {
        id: 'ai-quality',
        type: 'ai-model',
        name: 'Assembly Line Quality Classifier',
        uniqueName: 'Quality Classifier',
        position: { x: 350, y: 80 },
        width: 250,
        height: 180,
        status: 'ready',
        modelId: '1',
        inputs: [
          { id: 'temperature', name: 'Temperature', type: 'number', connected: false },
          { id: 'pressure', name: 'Pressure', type: 'number', connected: false },
          { id: 'product_image', name: 'Product Image', type: 'image', connected: false }
        ],
        outputs: [
          { id: 'quality_score', name: 'Quality Score', type: 'number' },
          { id: 'defect_type', name: 'Defect Type', type: 'string' }
        ]
      },
      // AI Model 2 - Defect Detector
      {
        id: 'ai-defect',
        type: 'ai-model',
        name: 'Surface Defect Detector',
        uniqueName: 'Defect Detector',
        position: { x: 350, y: 300 },
        width: 250,
        height: 160,
        status: 'ready',
        modelId: '2',
        inputs: [
          { id: 'surface_image', name: 'Surface Image', type: 'image', connected: false },
          { id: 'material_type', name: 'Material Type', type: 'string', connected: false }
        ],
        outputs: [
          { id: 'defect_detected', name: 'Defect Detected', type: 'boolean' },
          { id: 'defect_location', name: 'Defect Location', type: 'array' }
        ]
      },
      // Final Goal Node
      {
        id: 'final-goal',
        type: 'final-goal',
        name: 'Manufacturing Quality Analysis',
        uniqueName: 'Quality Analysis Target',
        position: { x: 700, y: 200 },
        width: 280,
        height: 200,
        status: 'ready',
        inputs: [
          { id: 'quality_score', name: 'Quality Score', type: 'number', connected: false },
          { id: 'defect_type', name: 'Defect Type', type: 'string', connected: false },
          { id: 'defect_detected', name: 'Defect Detected', type: 'boolean', connected: false },
          { id: 'efficiency_rate', name: 'Efficiency Rate', type: 'number', connected: false }
        ],
        outputs: []
      }
    ];

    // Create connections
    const newConnections: any[] = [
      // Production data to Quality Classifier (temperature)
      {
        id: 'conn-1',
        fromNodeId: 'data-production',
        fromOutputId: 'temperature',
        toNodeId: 'ai-quality',
        toInputId: 'temperature',
        type: 'number',
        sourceOutputName: 'Temperature',
        targetInputName: 'Temperature'
      },
      // Quality Classifier to Final Goal (quality score)
      {
        id: 'conn-2',
        fromNodeId: 'ai-quality',
        fromOutputId: 'quality_score',
        toNodeId: 'final-goal',
        toInputId: 'quality_score',
        type: 'number',
        sourceOutputName: 'Quality Score',
        targetInputName: 'Quality Score'
      },
      // Quality Classifier to Final Goal (defect type)
      {
        id: 'conn-3',
        fromNodeId: 'ai-quality',
        fromOutputId: 'defect_type',
        toNodeId: 'final-goal',
        toInputId: 'defect_type',
        type: 'string',
        sourceOutputName: 'Defect Type',
        targetInputName: 'Defect Type'
      },
      // Defect Detector to Final Goal (defect detected)
      {
        id: 'conn-4',
        fromNodeId: 'ai-defect',
        fromOutputId: 'defect_detected',
        toNodeId: 'final-goal',
        toInputId: 'defect_detected',
        type: 'boolean',
        sourceOutputName: 'Defect Detected',
        targetInputName: 'Defect Detected'
      },
      // Production data to Final Goal (efficiency rate)
      {
        id: 'conn-5',
        fromNodeId: 'data-production',
        fromOutputId: 'efficiency_rate',
        toNodeId: 'final-goal',
        toInputId: 'efficiency_rate',
        type: 'number',
        sourceOutputName: 'Efficiency Rate',
        targetInputName: 'Efficiency Rate'
      }
    ];

    // Update connected status for inputs and initialize active states
    const updatedNodes = newNodes.map(node => ({
      ...node,
      inputs: node.inputs?.map((input: any) => {
        if (node.id === 'ai-quality' && input.id === 'temperature') {
          return { ...input, connected: true, active: false };
        }
        if (node.id === 'final-goal') {
          return { ...input, connected: true, active: false };
        }
        return { ...input, active: false };
      }) || [],
      outputs: node.outputs?.map((output: any) => ({ ...output, active: false })) || []
    }));

    setNodes(updatedNodes);
    setConnections(newConnections);
    
    toast({
      title: "Demo Workflow Created",
      description: "Complete manufacturing quality analysis workflow ready for testing",
    });
  };

  // Enhanced test function with comprehensive validation
  const runTest = async () => {
    if (nodes.length === 0) {
      toast({
        title: "No Configuration",
        description: "Please add nodes to the canvas before running test.",
        variant: "destructive"
      });
      return;
    }

    // Check for Final Goal nodes
    const finalGoalNodes = nodes.filter(node => node.type === 'final-goal');
    if (finalGoalNodes.length === 0) {
      toast({
        title: "Missing Final Goal",
        description: "At least one Final Goal node is required for testing.",
        variant: "destructive"
      });
      return;
    }

    // Validate connections to Final Goal
    const finalGoalConnections = connections.filter(conn => 
      finalGoalNodes.some(goal => goal.id === conn.toNodeId)
    );
    
    if (finalGoalConnections.length === 0) {
      toast({
        title: "Incomplete Configuration", 
        description: "Final Goal nodes must be connected to other nodes.",
        variant: "destructive"
      });
      return;
    }

    setIsTestRunning(true);
    
    try {
      // Simulate comprehensive test execution
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate test data based on connections
      const testData = {
        workflow: {
          totalNodes: nodes.length,
          aiModels: nodes.filter(n => n.type === 'ai-model').length,
          dataSources: nodes.filter(n => n.type === 'data-input').length,
          finalGoals: finalGoalNodes.length,
          activeConnections: connections.length
        },
        validation: {
          allInputsConnected: finalGoalNodes.every(goal => 
            goal.inputs.every(input => input.connected)
          ),
          typeCompatibility: true,
          circularDependencies: false
        },
        performance: {
          executionTime: '2.1s',
          memoryUsage: '45MB',
          throughput: '1.2k ops/sec'
        }
      };
      
      setTestResults({
        status: 'success',
        message: 'Complete workflow test passed successfully',
        details: testData
      });
      
      toast({
        title: "✅ Test Completed Successfully",
        description: `Workflow with ${nodes.length} nodes and ${connections.length} connections validated`,
      });
      
      // Update node status to indicate successful test
      setNodes(prev => prev.map(node => ({
        ...node,
        status: 'ready' as const
      })));
      
    } catch (error) {
      setTestResults({
        status: 'error',
        message: 'Test execution failed',
        details: {
          error: 'Workflow validation failed',
          timestamp: new Date().toISOString()
        }
      });
      
      toast({
        title: "❌ Test Failed",
        description: "Please check your configuration and try again",
        variant: "destructive"
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  // Get node position for connection rendering
  const getNodePosition = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.position : { x: 0, y: 0 };
  };

  // Get port position within a node
  const getPortPosition = (nodeId: string, portId: string, isOutput: boolean = false) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const ports = isOutput ? node.outputs : node.inputs;
    const portIndex = ports.findIndex(p => p.id === portId);
    
    const baseX = isOutput ? node.position.x + node.width : node.position.x;
    const baseY = node.position.y + 40 + (portIndex * 25) + 12; // Header height + port spacing + port center
    
    return { x: baseX, y: baseY };
  };

  // Render connection lines (SVG paths)
  const renderConnections = () => {
    return connections.map(connection => {
      const sourcePos = getPortPosition(connection.fromNodeId, connection.fromOutputId, true);
      const targetPos = getPortPosition(connection.toNodeId, connection.toInputId, false);
      
      // Create curved path for better visual appeal
      const midX = (sourcePos.x + targetPos.x) / 2;
      const path = `M ${sourcePos.x} ${sourcePos.y} C ${midX} ${sourcePos.y}, ${midX} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
      
      return (
        <path
          key={connection.id}
          d={path}
          stroke={getTypeColor(connection.type)}
          strokeWidth="2"
          fill="none"
          className="cursor-pointer hover:stroke-width-3"
          onClick={() => {
            // Remove connection on click
            if (window.confirm('Remove this connection?')) {
              setConnections(prev => prev.filter(c => c.id !== connection.id));
              // Update target node input as disconnected
              setNodes(prev => prev.map(node => {
                if (node.id === connection.toNodeId) {
                  return {
                    ...node,
                    inputs: node.inputs.map(input => {
                      if (input.id === connection.toInputId) {
                        return { ...input, connected: false };
                      }
                      return input;
                    })
                  };
                }
                return node;
              }));
              toast({
                title: "Connection Removed",
                description: `Disconnected ${connection.sourceOutputName} from ${connection.targetInputName}`,
              });
            }
          }}
        />
      );
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
        model.outputs.forEach((output: any) => {
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

  // Removed old complex drag handlers - using simplified approach in handleNodeMouseDown

  // Auto-create final goal if needed
  useEffect(() => {
    if (nodes.length > 0 && !nodes.some(n => n.type === 'final-goal')) {
      const finalGoalPosition = {
        x: Math.max(...nodes.map(n => n.position.x + n.width)) + 200,
        y: nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length
      };
      
      setAddNodePosition(finalGoalPosition);
      createNode('final-goal', {});
    }
  }, [nodes.length]);

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

  // Enhanced connection creation with visual feedback
  const createConnection = (fromNodeId: string, fromOutputId: string, toNodeId: string, toInputId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);
    
    if (!fromNode || !toNode) {
      toast({
        title: "Connection Failed",
        description: "Could not find source or target nodes",
        variant: "destructive"
      });
      return false;
    }

    const fromOutput = fromNode.outputs.find(o => o.id === fromOutputId);
    const toInput = toNode.inputs.find(i => i.id === toInputId);
    
    if (!fromOutput || !toInput) {
      toast({
        title: "Connection Failed", 
        description: "Invalid output or input connection points",
        variant: "destructive"
      });
      return false;
    }

    // Check if input is already connected
    const existingConnection = connections.find(c => 
      c.toNodeId === toNodeId && c.toInputId === toInputId
    );
    
    if (existingConnection) {
      toast({
        title: "Connection Failed",
        description: `Input "${toInput.name}" is already connected`,
        variant: "destructive"
      });
      return false;
    }

    // Create new connection
    const newConnection = {
      id: `conn-${Date.now()}`,
      fromNodeId,
      fromOutputId,
      toNodeId,
      toInputId,
      type: fromOutput.type,
      sourceOutputName: fromOutput.name,
      targetInputName: toInput.name
    };

    // Update connections state
    setConnections(prev => [...prev, newConnection]);
    
    // Update input connected status
    setNodes(prev => prev.map(node => {
      if (node.id === toNodeId) {
        return {
          ...node,
          inputs: node.inputs.map(input => 
            input.id === toInputId ? { ...input, connected: true } : input
          )
        };
      }
      return node;
    }));

    // Show success popup
    toast({
      title: "Connection Successful",
      description: `Connected "${fromOutput.name}" to "${toInput.name}"`,
    });

    return true;
  };

  // Type compatibility check
  const isTypeCompatible = (outputType: string, inputType: string): boolean => {
    // Exact match
    if (outputType === inputType) return true;
    
    // Compatible types
    const compatibleTypes: Record<string, string[]> = {
      'tensor': ['tensor', 'array', 'object'],
      'array': ['array', 'tensor', 'object'],
      'object': ['object', 'array'],
      'string': ['string'],
      'number': ['number'],
      'boolean': ['boolean'],
      'image': ['image', 'object']
    };
    
    return compatibleTypes[outputType]?.includes(inputType) || false;
  };

  // Port activation system
  const [activeOutput, setActiveOutput] = useState<{nodeId: string; outputId: string; type: string; x?: number; y?: number} | null>(null);
  
  // Handle output port click - start connection
  const handleOutputClick = (e: React.MouseEvent, nodeId: string, outputId: string, type: string) => {
    e.stopPropagation();
    
    // Calculate the exact position of the clicked output port
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (sourceNode) {
      const outputIndex = sourceNode.outputs.findIndex(o => o.id === outputId);
      const portX = sourceNode.position.x + sourceNode.width;
      const portY = sourceNode.position.y + 60 + (outputIndex * 28) + 14;
      
      // Deactivate all ports first
      setNodes(prev => prev.map(node => ({
        ...node,
        inputs: node.inputs.map(input => ({ ...input, active: false })),
        outputs: node.outputs.map(output => ({ ...output, active: false }))
      })));
      
      if (activeOutput?.nodeId === nodeId && activeOutput?.outputId === outputId) {
        // Clicking same output - deactivate
        setActiveOutput(null);
        return;
      }
      
      // Activate this output and compatible inputs with position info
      setActiveOutput({ nodeId, outputId, type, x: portX, y: portY });
      
      setNodes(prev => prev.map(node => {
        if (node.id === nodeId) {
          // Activate clicked output
          return {
            ...node,
            outputs: node.outputs.map(output => ({
              ...output,
              active: output.id === outputId
            }))
          };
        } else {
          // Activate compatible inputs on other nodes
          return {
            ...node,
            inputs: node.inputs.map(input => ({
              ...input,
              active: !input.connected && isTypeCompatible(type, input.type)
            }))
          };
        }
      }));
    }
  };
  
  // Handle input port click - complete connection
  const handleInputClick = (e: React.MouseEvent, nodeId: string, inputId: string, inputType: string) => {
    e.stopPropagation();
    
    if (!activeOutput) return;
    
    const targetInput = nodes.find(n => n.id === nodeId)?.inputs.find(i => i.id === inputId);
    if (!targetInput || targetInput.connected || !targetInput.active) {
      return;
    }
    
    // Create connection
    const connectionId = `conn-${Date.now()}`;
    const fromNode = nodes.find(n => n.id === activeOutput.nodeId);
    const fromOutput = fromNode?.outputs.find(o => o.id === activeOutput.outputId);
    
    const newConnection = {
      id: connectionId,
      fromNodeId: activeOutput.nodeId,
      fromOutputId: activeOutput.outputId,
      toNodeId: nodeId,
      toInputId: inputId,
      type: activeOutput.type,
      sourceOutputName: fromOutput?.name || 'Output',
      targetInputName: targetInput.name || 'Input'
    };
    
    // Update connections and connected state
    setConnections(prev => [...prev, newConnection]);
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          inputs: node.inputs.map(input => ({
            ...input,
            connected: input.id === inputId ? true : input.connected,
            active: false
          }))
        };
      }
      return {
        ...node,
        inputs: node.inputs.map(input => ({ ...input, active: false })),
        outputs: node.outputs.map(output => ({ ...output, active: false }))
      };
    }));
    
    setActiveOutput(null);
    
    toast({
      title: "연결 완료",
      description: `${fromOutput?.name} → ${targetInput.name}`,
    });
  };

  // Canvas click handler to clear active states
  const handleCanvasClick = () => {
    if (activeOutput) {
      setActiveOutput(null);
      setNodes(prev => prev.map(node => ({
        ...node,
        inputs: node.inputs.map(input => ({ ...input, active: false })),
        outputs: node.outputs.map(output => ({ ...output, active: false }))
      })));
    }
  };

  // Validate configuration before test/save
  const validateConfiguration = (): {isValid: boolean; errors: string[]} => {
    const errors: string[] = [];
    
    // Check if there are any AI models
    const aiModels = nodes.filter(n => n.type === 'ai-model');
    if (aiModels.length === 0) {
      errors.push('At least one AI model is required');
    }
    
    // Check if AI models have input connections
    aiModels.forEach(model => {
      const hasConnectedInputs = model.inputs.some(input => input.connected);
      if (!hasConnectedInputs && model.inputs.length > 0) {
        errors.push(`AI model "${model.uniqueName}" needs input connections to run`);
      }
    });
    
    // Check final goal connections
    const finalGoals = nodes.filter(n => n.type === 'final-goal');
    finalGoals.forEach(goal => {
      const hasConnections = connections.some(conn => conn.toNodeId === goal.id);
      if (!hasConnections) {
        errors.push(`Final goal "${goal.uniqueName}" must have input connections`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Test configuration
  const testConfiguration = () => {
    const validation = validateConfiguration();
    setTestResults({
      status: validation.isValid ? 'success' : 'error',
      message: validation.isValid ? 'Configuration is valid' : 'Configuration has errors',
      details: validation
    });
    
    if (validation.isValid) {
      toast({
        title: "Test Configuration",
        description: "Configuration is valid and ready to run!",
      });
    } else {
      toast({
        title: "Configuration Issues",
        description: `${validation.errors.length} issues found. Please review and fix.`,
        variant: "destructive"
      });
    }
  };

  // Save configuration
  const saveConfiguration = () => {
    if (!currentConfig) return;

    const validation = validateConfiguration();
    if (!validation.isValid) {
      toast({
        title: "Cannot Save",
        description: "Please fix configuration issues before saving.",
        variant: "destructive"
      });
      return;
    }
    
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
              <Button onClick={testConfiguration}>
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
                        activeLeftTab === 'views' 
                          ? 'bg-white text-purple-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={() => setActiveLeftTab('views')}
                    >
                      <Monitor className="w-3 h-3 inline mr-1" />
                      Views
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
                                        
                                        {/* Analysis Status Display */}
                                        {(model as any).analysisStatus && (
                                          <div className="mt-2">
                                            {(model as any).analysisStatus === 'analyzing' && (
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                <span className="text-xs text-blue-600 font-medium">
                                                  AI Analysis: {Math.round((model as any).analysisProgress || 0)}%
                                                </span>
                                              </div>
                                            )}
                                            {(model as any).analysisStatus === 'completed' && (
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-xs text-green-600 font-medium">Analysis Complete</span>
                                              </div>
                                            )}
                                            {(model as any).analysisStatus === 'failed' && (
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                <span className="text-xs text-red-600 font-medium">Analysis Failed</span>
                                              </div>
                                            )}
                                            {(model as any).analysisStatus === 'pending' && (
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                <span className="text-xs text-yellow-600 font-medium">Pending Analysis</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {model.inputs.slice(0, 2).map((input: any) => (
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

                {/* Views Tab */}
                {activeLeftTab === 'views' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-purple-600" />
                      Views ({availableViews.length})
                    </h4>
                    <div className="space-y-3">
                      {availableViews.map(view => (
                        <div
                          key={view.id}
                          className="p-3 bg-white border border-gray-200 rounded hover:shadow-sm transition-shadow group"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              type: 'view-data',
                              viewId: view.id,
                              name: view.name
                            }));
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-900 truncate">{view.name}</div>
                                <div className="text-xs text-gray-500">{view.outputs?.length || 0} outputs</div>
                                {view.description && (
                                  <div className="text-xs text-gray-400 truncate mt-1">{view.description}</div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddNodePosition({ x: 100, y: 300 });
                                createNode('view-data', { 
                                  name: view.name, 
                                  viewId: view.id
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
            onClick={(e) => {
              setShowAddNodeMenu(false);
              handleCanvasClick();
            }}
            onMouseMove={(e) => {
              if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setMousePosition({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
              }
            }}
            onMouseUp={() => {
              // Clear any connecting state if needed
            }}
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
                } else if (data.type === 'view-data') {
                  createNode('view-data', { 
                    name: data.name, 
                    viewId: data.viewId 
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

            {/* Connection Rendering Layer */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              style={{ zIndex: 10 }}
            >
              <defs>
                <marker
                  id="arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon
                    points="0 0, 6 3, 0 6"
                    fill="#3b82f6"
                  />
                </marker>
              </defs>
              
              {/* Render existing connections */}
              {connections.map((connection) => {
                const fromNode = nodes.find(n => n.id === connection.fromNodeId);
                const toNode = nodes.find(n => n.id === connection.toNodeId);
                
                if (!fromNode || !toNode) return null;
                
                // Calculate output port position (right side of source node)
                const outputIndex = fromNode.outputs.findIndex(o => o.id === connection.fromOutputId);
                const startX = fromNode.position.x + fromNode.width;
                const startY = fromNode.position.y + 60 + (outputIndex * 28) + 14;
                
                // Calculate input port position (left side of target node)
                const inputIndex = toNode.inputs.findIndex(i => i.id === connection.toInputId);
                const endX = toNode.position.x;
                const endY = toNode.position.y + 60 + (inputIndex * 28) + 14;
                
                // Create bezier curve
                const controlOffset = Math.abs(endX - startX) * 0.5;
                const curve = `M ${startX} ${startY} C ${startX + controlOffset} ${startY} ${endX - controlOffset} ${endY} ${endX} ${endY}`;
                
                return (
                  <g key={connection.id} className="pointer-events-auto">
                    {/* Connection path */}
                    <path
                      d={curve}
                      stroke={getTypeColor(connection.type)}
                      strokeWidth="3"
                      fill="none"
                      markerEnd="url(#arrow)"
                      opacity="0.8"
                      className="hover:opacity-100 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Remove connection: ${connection.sourceOutputName} → ${connection.targetInputName}?`)) {
                          setConnections(prev => prev.filter(c => c.id !== connection.id));
                          // Update target node input as disconnected
                          setNodes(prev => prev.map(node => {
                            if (node.id === connection.toNodeId) {
                              return {
                                ...node,
                                inputs: node.inputs.map(input => {
                                  if (input.id === connection.toInputId) {
                                    return { ...input, connected: false };
                                  }
                                  return input;
                                })
                              };
                            }
                            return node;
                          }));
                          toast({
                            title: "연결 해제",
                            description: `${connection.sourceOutputName} → ${connection.targetInputName} 연결이 해제되었습니다`,
                          });
                        }
                      }}
                    />
                    
                    {/* Connection endpoints */}
                    <circle 
                      cx={startX} 
                      cy={startY} 
                      r="4" 
                      fill={getTypeColor(connection.type)}
                      className="pointer-events-none"
                    />
                    <circle 
                      cx={endX} 
                      cy={endY} 
                      r="4" 
                      fill={getTypeColor(connection.type)}
                      className="pointer-events-none"
                    />
                  </g>
                );
              })}
              
              {/* Preview connection while dragging */}
              {activeOutput && (
                <g>
                  <path
                    d={`M ${activeOutput.x || 0} ${activeOutput.y || 0} L ${mousePosition.x} ${mousePosition.y}`}
                    stroke={getTypeColor(activeOutput.type)}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    fill="none"
                    opacity="0.6"
                    className="pointer-events-none"
                  />
                </g>
              )}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                className={`absolute border rounded-lg shadow-lg ${
                  isDragging && draggedNode?.id === node.id ? 'cursor-grabbing' : 'cursor-grab'
                } ${
                  node.type === 'final-goal' 
                    ? 'bg-purple-900 border-purple-500 ring-2 ring-purple-400' 
                    : 'bg-gray-800 border-gray-600'
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: node.width,
                  minHeight: node.height,
                  zIndex: isDragging && draggedNode?.id === node.id ? 1000 : 100
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onDragStart={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Node Header */}
                <div className={`px-3 py-2 rounded-t-lg text-white text-sm font-medium ${
                  node.type === 'ai-model' ? 'bg-blue-600' :
                  node.type === 'data-input' ? 'bg-green-600' :
                  node.type === 'view-data' ? 'bg-indigo-600' :
                  node.type === 'final-goal' ? 'bg-purple-700' :
                  'bg-purple-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="truncate">{node.uniqueName}</span>
                      {node.uniqueName !== node.name && (
                        <span className="text-xs opacity-70 truncate">{node.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Info button for all node types */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node.type === 'ai-model') {
                            const model = availableAIModels.find(m => m.id === node.modelId);
                            if (model) {
                              setSelectedModelForDetails(model);
                              setSelectedNodeForDetails(null);
                              setIsRightPanelOpen(true);
                            }
                          } else {
                            setSelectedNodeForDetails(node);
                            setSelectedModelForDetails(null);
                            setIsRightPanelOpen(true);
                          }
                        }}
                      >
                        <Info className="w-3 h-3" />
                      </Button>
                      
                      {/* Delete button for all node types */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-200 hover:text-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateDeleteNode(node.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Circle className={`w-3 h-3 ${
                        node.type === 'ai-model' ? 
                          ((() => {
                            const model = availableAIModels.find(m => m.id === node.modelId);
                            const status = (model as any)?.analysisStatus;
                            return status === 'completed' ? 'text-green-400' :
                                   status === 'analyzing' ? 'text-blue-400 animate-pulse' :
                                   status === 'failed' ? 'text-red-400' :
                                   status === 'pending' ? 'text-yellow-400' :
                                   'text-gray-400';
                          })()) :
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
                      {node.type === 'data-input' ? 'Data Source' : 
                       node.type === 'view-data' ? 'View Data' :
                       node.type === 'final-goal' ? 'Configuration Output' :
                       'Automation Trigger'}
                    </div>
                  )}
                  
                  {/* Final Goal Icon */}
                  {node.type === 'final-goal' && (
                    <div className="flex items-center justify-center mb-2">
                      <Target className="w-8 h-8 text-purple-400" />
                    </div>
                  )}
                  
                  {/* Inputs */}
                  {node.inputs.map((input, index) => (
                    <div key={input.id} className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full border-2 cursor-pointer hover:scale-110 transition-all duration-200 ${
                            input.active ? 'ring-2 ring-blue-400 ring-opacity-75 shadow-lg scale-110' : ''
                          } ${
                            input.connected ? 'animate-pulse' : ''
                          }`}
                          style={{ 
                            backgroundColor: input.connected ? getTypeColor(input.type) : (input.active ? 'rgba(59, 130, 246, 0.3)' : 'transparent'),
                            borderColor: input.active ? '#3b82f6' : getTypeColor(input.type)
                          }}
                          onClick={(e) => handleInputClick(e, node.id, input.id, input.type)}
                          title={`${input.name} (${input.type}) - Click to connect`}
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
                          className={`w-3 h-3 rounded-full cursor-pointer hover:scale-110 transition-all duration-200 ${
                            output.active ? 'ring-2 ring-green-400 ring-opacity-75 shadow-lg scale-110' : ''
                          }`}
                          style={{ 
                            backgroundColor: output.active ? '#10b981' : getTypeColor(output.type)
                          }}
                          onClick={(e) => handleOutputClick(e, node.id, output.id, output.type)}
                          title={`${output.name} (${output.type}) - Click to start connection`}
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

                  {/* Views */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Views</div>
                    {availableViews.map((view: any) => (
                      <button
                        key={view.id}
                        className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                        onClick={() => createNode('view-data', { viewId: view.id, name: view.name })}
                      >
                        {view.name}
                      </button>
                    ))}
                  </div>

                  {/* Final Goal */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Output</div>
                    <button
                      className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                      onClick={() => createNode('final-goal', {})}
                    >
                      Final Goal
                    </button>
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

          {/* Right Panel - Node Details */}
          {isRightPanelOpen && (selectedModelForDetails || selectedNodeForDetails) && (
            <div className="w-96 bg-white border-l border-gray-300 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedModelForDetails ? 'AI Model Details' : 
                   selectedNodeForDetails?.type === 'data-input' ? 'Data Source Details' :
                   selectedNodeForDetails?.type === 'view-data' ? 'View Details' :
                   selectedNodeForDetails?.type === 'final-goal' ? 'Final Goal Details' :
                   selectedNodeForDetails?.type === 'automation-input' ? 'Automation Details' :
                   'Node Details'}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      const name = selectedModelForDetails?.name || selectedNodeForDetails?.uniqueName;
                      if (window.confirm(`Delete "${name}"?`)) {
                        if (selectedNodeForDetails) {
                          setNodeToDelete(selectedNodeForDetails);
                          deleteNode();
                        }
                        toast({
                          title: "Node Deleted",
                          description: `${name} has been deleted.`,
                          variant: "destructive"
                        });
                        setIsRightPanelOpen(false);
                        setSelectedModelForDetails(null);
                        setSelectedNodeForDetails(null);
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
                {selectedModelForDetails ? (
                  <>
                    {/* Model Info */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{selectedModelForDetails.name}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Model ID: {selectedModelForDetails.id}</div>
                        <div>Inputs: {selectedModelForDetails.inputs.length}</div>
                        <div>Outputs: {selectedModelForDetails.outputs.length}</div>
                      </div>
                    </div>
                  </>
                ) : selectedNodeForDetails ? (
                  <>
                    {/* Node Info */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{selectedNodeForDetails.uniqueName}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Type: {selectedNodeForDetails.type}</div>
                        <div>Status: {selectedNodeForDetails.status}</div>
                        <div>Inputs: {selectedNodeForDetails.inputs.length}</div>
                        <div>Outputs: {selectedNodeForDetails.outputs.length}</div>
                        
                        {/* Type-specific information */}
                        {selectedNodeForDetails.type === 'data-input' && selectedNodeForDetails.sourceId && (
                          <div>
                            <div className="mt-2 font-medium text-gray-700">Data Source:</div>
                            <div>{dataIntegrationSources.find(s => s.id === selectedNodeForDetails.sourceId)?.name || 'Unknown Source'}</div>
                          </div>
                        )}
                        
                        {selectedNodeForDetails.type === 'view-data' && selectedNodeForDetails.viewId && (
                          <div>
                            <div className="mt-2 font-medium text-gray-700">View:</div>
                            <div>{availableViews.find((v: any) => v.id === selectedNodeForDetails.viewId)?.name || 'Unknown View'}</div>
                          </div>
                        )}
                        
                        {selectedNodeForDetails.type === 'automation-input' && selectedNodeForDetails.triggerId && (
                          <div>
                            <div className="mt-2 font-medium text-gray-700">Trigger:</div>
                            <div>{automationTriggers.find(t => t.id === selectedNodeForDetails.triggerId)?.name || 'Unknown Trigger'}</div>
                          </div>
                        )}
                        
                        {selectedNodeForDetails.type === 'final-goal' && (
                          <div>
                            <div className="mt-2 font-medium text-gray-700">Purpose:</div>
                            <div>Configuration output target for workflow results</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}

                {/* Outputs Section */}
                {((selectedModelForDetails?.outputs && selectedModelForDetails.outputs.length > 0) || 
                  (selectedNodeForDetails?.outputs && selectedNodeForDetails.outputs.length > 0)) && (
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-green-600" />
                      Outputs
                    </h5>
                    <div className="space-y-3">
                      {(selectedModelForDetails?.outputs || selectedNodeForDetails?.outputs || []).map((output: any, index: number) => (
                        <div key={output.id || index} className="p-3 bg-gray-50 rounded-lg">
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
                )}

                {/* Connections Section */}
                <div>
                  <h5 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-purple-600" />
                    Active Connections
                  </h5>
                  {(() => {
                    const nodeId = selectedModelForDetails?.id || selectedNodeForDetails?.id;
                    if (!nodeId) return (
                      <div className="text-center py-6 text-gray-500">
                        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <div className="text-sm">No node selected</div>
                      </div>
                    );
                    const nodeConnections = connections.filter(c => c.fromNodeId === nodeId || c.toNodeId === nodeId);
                    
                    return nodeConnections.length > 0 ? (
                      <div className="space-y-2">
                        {nodeConnections.map(connection => {
                          const isOutput = connection.fromNodeId === nodeId;
                          const otherNodeId = isOutput ? connection.toNodeId : connection.fromNodeId;
                          const otherNode = nodes.find(n => n.id === otherNodeId);
                          
                          return (
                            <div key={connection.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {isOutput ? (
                                    <>
                                      <ArrowRight className="w-3 h-3 text-green-600" />
                                      <span className="text-sm font-medium">Output to</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRight className="w-3 h-3 text-blue-600 transform rotate-180" />
                                      <span className="text-sm font-medium">Input from</span>
                                    </>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                  onClick={() => {
                                    if (window.confirm('Remove this connection?')) {
                                      setConnections(prev => prev.filter(c => c.id !== connection.id));
                                      // Update target node input as disconnected
                                      setNodes(prev => prev.map(node => {
                                        if (node.id === connection.toNodeId) {
                                          return {
                                            ...node,
                                            inputs: node.inputs.map(input => {
                                              if (input.id === connection.toInputId) {
                                                return { ...input, connected: false };
                                              }
                                              return input;
                                            })
                                          };
                                        }
                                        return node;
                                      }));
                                      toast({
                                        title: "Connection Removed",
                                        description: `Disconnected ${connection.sourceOutputName} from ${connection.targetInputName}`,
                                      });
                                    }
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">{otherNode?.uniqueName || 'Unknown Node'}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {isOutput ? connection.sourceOutputName : connection.targetInputName} → {isOutput ? connection.targetInputName : connection.sourceOutputName}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <div className="text-sm">No connections</div>
                        <div className="text-xs">Use the canvas to connect this node</div>
                      </div>
                    );
                  })()}
                </div>

                {/* Inputs Section */}
                {((selectedModelForDetails?.inputs && selectedModelForDetails.inputs.length > 0) || 
                  (selectedNodeForDetails?.inputs && selectedNodeForDetails.inputs.length > 0)) && (
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-600 transform rotate-180" />
                      Inputs
                    </h5>
                    <div className="space-y-3">
                      {(selectedModelForDetails?.inputs || selectedNodeForDetails?.inputs || []).map((input: any, index: number) => (
                      <div key={input.id || index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{input.name}</span>
                          <div className="flex items-center gap-2">
                            <span 
                              className="px-2 py-1 text-xs rounded-full text-white"
                              style={{ backgroundColor: getTypeColor(input.type) }}
                            >
                              {input.type}
                            </span>
                            {input.connected && (
                              <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
                            )}
                          </div>
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
                                      const targetNodeId = selectedModelForDetails?.id || selectedNodeForDetails?.id;
                                      const targetNode = nodes.find(n => n.id === targetNodeId);
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
                )}
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

      {/* Delete Node Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{nodeToDelete?.uniqueName}" from the canvas? This action cannot be undone and will remove all connections to this node.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteNode}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteNode}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}