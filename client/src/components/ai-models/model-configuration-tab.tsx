import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Monitor,
  Check,
  PlayCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    tableData?: any[]; // Sample data for data nodes
    tableName?: string; // Table name for data nodes
    fieldName?: string; // Field name for data nodes
  }>;
  modelId?: string; // Reference to uploaded model
  sourceId?: string; // Reference to data source
  triggerId?: string; // Reference to automation trigger
  viewId?: string; // Reference to view
  status: 'ready' | 'error' | 'running';
  width: number;
  height: number;
  sampleData?: any; // Sample data for data input nodes
  dataSchema?: any[]; // Data schema for data input nodes
  goalInput?: string; // Goal input text for final-goal nodes
}

interface Connection {
  id: string;
  fromNodeId: string;
  fromOutputId?: string; // Optional for block connections
  toNodeId: string;
  toInputId?: string; // Optional for block connections
  type: 'parameter' | 'block'; // New connection type
  sourceOutputName?: string;
  targetInputName?: string;
  mappings?: Array<{ // Field mappings for block connections
    sourceField: string;
    targetField: string;
    sourceType: string;
    targetType: string;
  }>;
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

    (dataSources as any[]).forEach((dataSource: any) => {
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

interface ModelConfigurationTabProps {
  selectedModel?: AiModel;
}

interface AiModel {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  modelType: string;
  status: string;
  folderId?: string;
  uploadedAt: string;
  analysisStatus: string;
}

export default function ModelConfigurationTab({ selectedModel }: ModelConfigurationTabProps = {}) {
  const [viewMode, setViewMode] = useState<'folders' | 'editor'>('folders');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<Configuration | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewConfigDialog, setShowNewConfigDialog] = useState(false);
  const [nodes, setNodes] = useState<ModelNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeForConnection, setSelectedNodeForConnection] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<{nodeId: string, portId: string, portType: 'input' | 'output'} | null>(null);
  const [draggedNode, setDraggedNode] = useState<ModelNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['user-models', 'quality-models', 'unorganized']));
  const [activeLeftTab, setActiveLeftTab] = useState<'models' | 'data' | 'views'>('models');
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const [connectionDialogOpen, setConnectionDialogOpen] = useState<{[key: string]: boolean}>({});
  const [testResults, setTestResults] = useState<{
    status: 'success' | 'error';
    message: string;
    details: any;
  } | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  
  // Click-based connection states  
  const [clickConnectionMode, setClickConnectionMode] = useState(false);
  const [selectedSourceNode, setSelectedSourceNode] = useState<string | null>(null);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<ModelNode | null>(null);
  
  // Node selection state for general selections
  const [selectedNode, setSelectedNode] = useState<ModelNode | null>(null);
  
  // Port connection states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<{
    nodeId: string;
    portId: string;
    portType: 'input' | 'output';
    dataType: string;
    position: { x: number; y: number };
  } | null>(null);
  const [previewConnection, setPreviewConnection] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Auto-save functionality
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [newFolder, setNewFolder] = useState({ name: '', description: '' });
  const [newConfig, setNewConfig] = useState({ name: '', description: '', folderId: '' });

  // Auto-save debounced function
  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (hasUnsavedChanges && currentConfig && !isSaving) {
        await performAutoSave();
      }
    }, 2000); // Auto-save 2 seconds after last change
  }, [hasUnsavedChanges, currentConfig, isSaving]);

  // Perform the actual auto-save
  const performAutoSave = async () => {
    if (!currentConfig || isSaving) return;
    
    setIsSaving(true);
    try {
      const configurationData = {
        name: currentConfig.name,
        description: currentConfig.description,
        folderId: currentConfig.folderId,
        modelId: currentConfig.modelId,
        nodes: JSON.stringify(nodes),
        connections: JSON.stringify(connections),
        status: 'draft' as const,
        updatedAt: new Date().toISOString()
      };

      await fetch(`/api/model-configurations/${currentConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(configurationData)
      });

      setHasUnsavedChanges(false);
      
      // Silently update cache
      queryClient.invalidateQueries({ queryKey: ['/api/model-configurations'] });
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't show toast for auto-save failures to avoid interrupting user
    } finally {
      setIsSaving(false);
    }
  };

  // Mark changes for auto-save
  const markChanges = useCallback(() => {
    setHasUnsavedChanges(true);
    debouncedAutoSave();
  }, [debouncedAutoSave]);

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

  // Helper functions for node type checking
  const getNodeOutputType = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.outputs?.[0]?.type || 'string';
  };

  const getNodeInputType = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.inputs?.[0]?.type || 'string';
  };

  // Port connection handlers
  const handlePortClick = (nodeId: string, portId: string, portType: 'input' | 'output', dataType: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (!isConnecting) {
      // Start connection
      setIsConnecting(true);
      setConnectionSource({ nodeId, portId, portType, dataType, position });
      setPreviewConnection({ from: position, to: position });
    } else if (connectionSource) {
      // Complete connection
      if (canCreateConnection(connectionSource, { nodeId, portId, portType, dataType })) {
        createPortConnection(connectionSource, { nodeId, portId, portType, dataType });
      }
      // Reset connection state
      setIsConnecting(false);
      setConnectionSource(null);
      setPreviewConnection(null);
    }
  };

  const canCreateConnection = (source: any, target: any) => {
    // Can't connect to same node
    if (source.nodeId === target.nodeId) return false;
    
    // Must connect output to input or input to output
    if (source.portType === target.portType) return false;
    
    // Check data type compatibility
    return isDataTypeCompatible(source.dataType, target.dataType);
  };

  const isDataTypeCompatible = (sourceType: string, targetType: string) => {
    // Exact match
    if (sourceType === targetType) return true;
    
    // Compatible types
    const compatibilityMap: Record<string, string[]> = {
      'number': ['string', 'number'],
      'string': ['string', 'number', 'object'],
      'array': ['array', 'object'],
      'object': ['object', 'string'],
      'boolean': ['boolean', 'string'],
      'image': ['image', 'string']
    };
    
    return compatibilityMap[sourceType]?.includes(targetType) || false;
  };

  const createPortConnection = (source: any, target: any) => {
    // Determine which is output and which is input
    const fromNode = source.portType === 'output' ? source : target;
    const toNode = source.portType === 'output' ? target : source;
    
    const fromNodeData = nodes.find(n => n.id === fromNode.nodeId);
    const toNodeData = nodes.find(n => n.id === toNode.nodeId);
    
    if (!fromNodeData || !toNodeData) return;
    
    const outputPort = fromNodeData.outputs.find(o => o.id === fromNode.portId);
    const inputPort = toNodeData.inputs.find(i => i.id === toNode.portId);
    
    if (!outputPort || !inputPort) return;

    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      fromNodeId: fromNode.nodeId,
      toNodeId: toNode.nodeId,
      fromOutputId: fromNode.portId,
      toInputId: toNode.portId,
      type: source.dataType,
      sourceOutputName: outputPort.name,
      targetInputName: inputPort.name
    };

    setConnections(prev => [...prev, newConnection]);
    
    // Update node connection status
    setNodes(prev => prev.map(node => {
      if (node.id === fromNode.nodeId) {
        return {
          ...node,
          outputs: node.outputs.map(output => 
            output.id === fromNode.portId 
              ? { ...output, connected: true }
              : output
          )
        };
      }
      if (node.id === toNode.nodeId) {
        return {
          ...node,
          inputs: node.inputs.map(input => 
            input.id === toNode.portId 
              ? { ...input, connected: true }
              : input
          )
        };
      }
      return node;
    }));

    // Trigger auto-save
    markChanges();

    toast({
      title: "Port Connection Created",
      description: `${outputPort.name} → ${inputPort.name}`,
    });
  };

  const handleCanvasMouseMove = (event: React.MouseEvent) => {
    if (isConnecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      
      setPreviewConnection(prev => prev ? { ...prev, to: position } : null);
    }
  };

  const handleCanvasClick = () => {
    if (isConnecting) {
      // Cancel connection
      setIsConnecting(false);
      setConnectionSource(null);
      setPreviewConnection(null);
    }
  };

  // Auto-connect Model_Target data to model inputs
  const autoConnectModelTarget = useCallback(() => {
    const modelTargetNode = nodes.find(n => n.type === 'data-input' && n.name === 'Model_Target');
    const aiModelNodes = nodes.filter(n => n.type === 'ai-model');
    
    if (!modelTargetNode || aiModelNodes.length === 0) return;

    aiModelNodes.forEach(aiModel => {
      // Find compatible inputs that aren't already connected
      const compatibleInputs = aiModel.inputs.filter(input => 
        !input.connected && 
        modelTargetNode.outputs.some(output => 
          isDataTypeCompatible(output.type, input.type)
        )
      );

      compatibleInputs.forEach(input => {
        // Find matching output from Model_Target
        const matchingOutput = modelTargetNode.outputs.find(output =>
          isDataTypeCompatible(output.type, input.type) &&
          (output.name.toLowerCase().includes(input.name.toLowerCase()) ||
           input.name.toLowerCase().includes(output.name.toLowerCase()) ||
           output.type === input.type)
        );

        if (matchingOutput) {
          // Create automatic connection
          const newConnection: Connection = {
            id: `auto-conn-${Date.now()}-${Math.random()}`,
            sourceNodeId: modelTargetNode.id,
            targetNodeId: aiModel.id,
            sourcePortId: matchingOutput.id,
            targetPortId: input.id,
            dataType: matchingOutput.type
          };

          setConnections(prev => {
            // Check if connection already exists
            const exists = prev.some(c => 
              c.sourceNodeId === newConnection.sourceNodeId &&
              c.targetNodeId === newConnection.targetNodeId &&
              c.sourcePortId === newConnection.sourcePortId &&
              c.targetPortId === newConnection.targetPortId
            );
            
            if (!exists) {
              return [...prev, newConnection];
            }
            return prev;
          });

          // Update node connection status
          setNodes(prev => prev.map(node => {
            if (node.id === modelTargetNode.id) {
              return {
                ...node,
                outputs: node.outputs.map(output => 
                  output.id === matchingOutput.id 
                    ? { ...output, connected: true }
                    : output
                )
              };
            }
            if (node.id === aiModel.id) {
              return {
                ...node,
                inputs: node.inputs.map(inputItem => 
                  inputItem.id === input.id 
                    ? { ...inputItem, connected: true }
                    : inputItem
                )
              };
            }
            return node;
          }));
        }
      });
    });
  }, [nodes, isDataTypeCompatible]);

  // Run auto-connection when Model_Target or AI models are added
  useEffect(() => {
    const modelTargetExists = nodes.some(n => n.type === 'data-input' && n.name === 'Model_Target');
    const aiModelsExist = nodes.some(n => n.type === 'ai-model');
    
    if (modelTargetExists && aiModelsExist) {
      // Delay to ensure nodes are fully rendered
      const timeout = setTimeout(autoConnectModelTarget, 500);
      return () => clearTimeout(timeout);
    }
  }, [nodes.length, autoConnectModelTarget]);

  // Fetch real views data
  const { data: availableViews = [] } = useQuery<ViewData[]>({
    queryKey: ['/api/views'],
    staleTime: 60000
  });

  // Fetch actual AI models from the server with real-time updates
  const { data: realAIModels = [], refetch: refetchModels } = useQuery({
    queryKey: ['/api/ai-models'],
  });

  // Fetch Model Configuration folders (separate from AI Model folders)
  const { data: modelConfigFolders = [], refetch: refetchFolders } = useQuery({
    queryKey: ['/api/model-configuration-folders'],
    staleTime: 30000,
  });

  // Fetch AI Model folders to display available models in the editor
  const { data: aiModelFolders = [] } = useQuery({
    queryKey: ['/api/ai-model-folders'],
    staleTime: 30000,
  });

  // Fetch model configurations
  const { data: modelConfigurations = [], refetch: refetchConfigurations } = useQuery({
    queryKey: ['/api/model-configurations'],
    staleTime: 30000,
  });

  // Create model configuration folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: { name: string; description: string; color?: string; icon?: string }) => {
      const response = await fetch('/api/model-configuration-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: folderData.name,
          description: folderData.description,
          color: folderData.color || '#3b82f6',
          icon: folderData.icon || 'FolderOpen'
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create folder');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/model-configuration-folders'] });
      refetchFolders();
    },
  });

  // Fetch real data integration sources directly
  const { data: realDataSources = [], isLoading: isDataSourcesLoading } = useQuery({
    queryKey: ['/api/data-sources'],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Transform real AI models to match expected format - ONLY use real models, no samples
  const availableAIModels = useMemo(() => {
    const transformedRealModels = (realAIModels as any[]).map(model => ({
      id: model.id,
      name: model.name,
      type: model.modelType || 'pytorch',
      category: 'User Models',
      folderId: model.folderId || null, // Use actual folder ID from database
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

    // Return ONLY real models - no sample/hardcoded models
    return transformedRealModels;
  }, [realAIModels]);

  // Helper function to determine category from source type
  const getCategoryFromType = (type: string): string => {
    if (type?.toLowerCase().includes('sap')) return 'ERP';
    if (type?.toLowerCase().includes('salesforce')) return 'CRM';
    if (type?.toLowerCase().includes('oracle')) return 'Database';
    if (type?.toLowerCase().includes('pi')) return 'Industrial';
    if (type?.toLowerCase().includes('manufacturing')) return 'Manufacturing';
    if (type?.toLowerCase().includes('quality')) return 'Quality';
    return 'Database';
  };

  // Filter models based on search and category
  const filteredAIModels = availableAIModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Transform real data sources - ONLY use real data, no samples
  const availableDataSources = useMemo(() => {
    return (realDataSources as any[]).map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      category: getCategoryFromType(source.type),
      status: source.status || 'connected',
      recordCount: source.recordCount || 0,
      lastSync: source.lastSync || new Date().toISOString(),
      fields: source.fields || [],
      tables: source.tables || [],
      sampleData: source.sampleData || {}
    }));
  }, [realDataSources]);

  // Filter data sources based on search
  const filteredDataSources = availableDataSources.filter(source => {
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
    availableDataSources.forEach((source: any) => {
      source.fields?.forEach((field: any) => {
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
        const dataSource = (realDataSources as any[]).find((ds: any) => ds.id === data?.sourceId);
        const dataUniqueName = generateUniqueName(data?.name || 'Data Input', nodes);
        
        // Create outputs from all tables and fields in the data source
        let outputs: any[] = [];
        if (dataSource?.dataSchema && dataSource.dataSchema.length > 0) {
          // Create outputs for each table's fields
          dataSource.dataSchema.forEach((table: any) => {
            table.fields?.forEach((field: any) => {
              outputs.push({
                id: `${id}-output-${table.table}-${field.name}`,
                name: `${table.table.split(' - ')[1] || table.table}: ${field.name}`,
                type: field.type.toLowerCase(),
                active: false,
                tableData: dataSource.sampleData?.[table.table] || [],
                tableName: table.table,
                fieldName: field.name
              });
            });
          });
        } else if (dataSource?.fields) {
          // Fallback to legacy fields structure
          outputs = dataSource.fields.map((field: any, index: number) => ({
            id: `${id}-output-${field.name}`,
            name: field.description || field.name,
            type: field.type.toLowerCase(),
            active: false
          }));
        } else {
          // Default output
          outputs = [{
            id: `${id}-output-data`,
            name: 'Data Output',
            type: data?.type || 'object',
            active: false
          }];
        }

        newNode = {
          id,
          type,
          name: data?.name || 'Data Input',
          uniqueName: dataUniqueName,
          position: addNodePosition,
          inputs: [],
          outputs,
          sourceId: data?.sourceId,
          status: 'ready',
          width: calculateNodeWidth(dataUniqueName, true),
          height: Math.max(100, outputs.length * 25 + 60),
          // Store sample data for preview
          sampleData: dataSource?.sampleData || {},
          dataSchema: dataSource?.dataSchema || []
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
            active: false
          }],
          outputs: [{
            id: `${id}-output-result`,
            name: 'Goal Result',
            type: 'object',
            active: false
          }],
          status: 'ready',
          width: Math.max(250, calculateNodeWidth(goalUniqueName, true)),
          height: 120,
          goalInput: '' // Initialize with empty string
        };
        break;
    }

    setNodes(prev => [...prev, newNode]);
    setShowAddNodeMenu(false);
    
    // Trigger auto-save
    markChanges();
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
      
      // Trigger auto-save after drag
      markChanges();
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

  const deleteNodeDirectly = (nodeToDelete: ModelNode) => {
    if (!nodeToDelete) return;
    
    const nodeIdToDelete = nodeToDelete.id;
    const nodeName = nodeToDelete.name || nodeToDelete.uniqueName;
    
    // Update both nodes and connections
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeIdToDelete));
    setConnections(prevConnections => prevConnections.filter(conn => 
      conn.fromNodeId !== nodeIdToDelete && conn.toNodeId !== nodeIdToDelete
    ));
    
    // Clear any related selections
    if (selectedNode?.id === nodeIdToDelete) {
      setSelectedNode(null);
    }
    
    if (selectedNodeForDetails?.id === nodeIdToDelete) {
      setSelectedNodeForDetails(null);
    }
    
    // Trigger auto-save
    markChanges();
    
    // Show success toast
    toast({
      title: "Node Deleted",
      description: `${nodeName} has been removed from the configuration.`,
    });
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

  // Simple node connection system - remove duplicate, already declared above

  // Handle node click for connection
  const handleNodeClick = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!selectedNodeForConnection) {
      // First click - select source node
      setSelectedNodeForConnection(nodeId);
      setNodes(prev => prev.map(node => ({
        ...node,
        selected: node.id === nodeId
      })));
    } else if (selectedNodeForConnection === nodeId) {
      // Clicking same node - deselect
      cancelConnection();
    } else {
      // Second click - create connection
      connectNodesSimple(selectedNodeForConnection, nodeId);
      cancelConnection();
    }
  };

  // Simple connection function
  const connectNodesSimple = (fromNodeId: string, toNodeId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);
    
    if (!fromNode || !toNode) {
      toast({
        title: "연결 실패",
        description: "유효하지 않은 노드입니다",
        variant: "destructive"
      });
      return;
    }

    // Check if connection already exists
    const existingConnection = connections.find(conn => 
      conn.fromNodeId === fromNodeId && conn.toNodeId === toNodeId
    );
    
    if (existingConnection) {
      toast({
        title: "연결 실패",
        description: "이미 연결된 노드입니다",
        variant: "destructive"
      });
      return;
    }

    // Find first available output from source node
    const availableOutput = fromNode.outputs.find(output => output);
    if (!availableOutput) {
      toast({
        title: "연결 실패", 
        description: `${fromNode.uniqueName}에 사용 가능한 출력이 없습니다`,
        variant: "destructive"
      });
      return;
    }

    // Find first available input on target node
    const availableInput = toNode.inputs.find(input => !input.connected);
    if (!availableInput) {
      toast({
        title: "연결 실패",
        description: `${toNode.uniqueName}에 사용 가능한 입력이 없습니다`,
        variant: "destructive"
      });
      return;
    }

    // Check type compatibility
    if (!isTypeCompatible(availableOutput.type, availableInput.type)) {
      toast({
        title: "연결 실패",
        description: `출력 타입 ${availableOutput.type}과 입력 타입 ${availableInput.type}이 호환되지 않습니다`,
        variant: "destructive"
      });
      return;
    }

    // Create connection
    const connectionId = `conn-${Date.now()}`;
    const newConnection = {
      id: connectionId,
      fromNodeId: fromNode.id,
      fromOutputId: availableOutput.id,
      toNodeId: toNode.id,
      toInputId: availableInput.id,
      type: availableOutput.type,
      sourceOutputName: availableOutput.name,
      targetInputName: availableInput.name
    };

    setConnections(prev => [...prev, newConnection]);
    
    // Mark input as connected
    setNodes(prev => prev.map(node => {
      if (node.id === toNode.id) {
        return {
          ...node,
          inputs: node.inputs.map(input => 
            input.id === availableInput.id 
              ? { ...input, connected: true }
              : input
          )
        };
      }
      return node;
    }));

    // Trigger auto-save
    markChanges();

    toast({
      title: "연결 완료",
      description: `${fromNode.uniqueName} → ${toNode.uniqueName}`,
    });
  };

  // Cancel connection
  const cancelConnection = () => {
    setSelectedNodeForConnection(null);
    setPreviewConnection(null);
    setNodes(prev => prev.map(node => ({
      ...node,
      selected: false
    })));
  };

  // Disconnect nodes function
  const disconnectNodes = (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) return;

    // Remove connection
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    
    // Mark input as disconnected
    setNodes(prev => prev.map(node => {
      if (node.id === connection.toNodeId) {
        return {
          ...node,
          inputs: node.inputs.map(input => 
            input.id === connection.toInputId 
              ? { ...input, connected: false }
              : input
          )
        };
      }
      return node;
    }));

    // Trigger auto-save
    markChanges();

    toast({
      title: "연결 해제됨",
      description: "노드 연결이 성공적으로 해제되었습니다",
    });
  };

  // Canvas click handler to clear active states - merged with existing function above

  // Handle mouse move for preview connection - merged with existing function above

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
      // Collect goal inputs from Final Goal nodes
      const goalInputs = finalGoalNodes.map(goalNode => ({
        nodeId: goalNode.id,
        nodeName: goalNode.name,
        goalRequest: ''
      }));

      console.log('Executing model configuration with:', {
        configurationId: currentConfig?.id,
        nodes: nodes.length,
        connections: connections.length,
        goalInputs: goalInputs.length
      });

      // Call the real API execution endpoint
      const response = await fetch('/api/model-configuration/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configurationId: currentConfig?.id,
          nodes: nodes,
          connections: connections,
          goalInputs: goalInputs
        }),
      });

      if (!response.ok) {
        throw new Error(`API execution failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Model execution result:', result);

      if (result.success) {
        const testResultData = {
          status: 'success' as const,
          message: `${result.results?.length || 0} AI model(s) executed successfully`,
          details: {
            configurationId: result.configurationId,
            executedAt: result.executedAt || new Date().toISOString(),
            results: result.results || [],
            workflow: {
              totalNodes: nodes.length,
              aiModels: nodes.filter(n => n.type === 'ai-model').length,
              dataSources: nodes.filter(n => n.type === 'data-input').length,
              finalGoals: finalGoalNodes.length,
              activeConnections: connections.length
            }
          }
        };
        
        console.log('Setting test results:', testResultData);
        setTestResults(testResultData);
        
        // Force a re-render by scrolling to results
        setTimeout(() => {
          const resultsPanel = document.querySelector('[data-testid="test-results-panel"]');
          if (resultsPanel) {
            resultsPanel.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);

        toast({
          title: "✅ Model Execution Success",
          description: `${result.results?.length || 0} AI model(s) executed successfully. Results displayed below.`,
        });
      } else {
        throw new Error(result.error || 'Unknown execution error');
      }
      
      // Update node status to indicate successful execution
      setNodes(prev => prev.map(node => ({
        ...node,
        status: 'ready' as const
      })));
      
    } catch (error) {
      console.error('Model execution error:', error);
      setTestResults({
        status: 'error',
        message: 'Model execution failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
      
      toast({
        title: "❌ Execution Failed",
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
      // Handle block connections differently
      if (connection.type === 'block') {
        const sourceNode = nodes.find(n => n.id === connection.fromNodeId);
        const targetNode = nodes.find(n => n.id === connection.toNodeId);
        if (!sourceNode || !targetNode) return null;
        
        const sourcePos = { x: sourceNode.position.x + sourceNode.width, y: sourceNode.position.y + sourceNode.height / 2 };
        const targetPos = { x: targetNode.position.x, y: targetNode.position.y + targetNode.height / 2 };
        
        const midX = (sourcePos.x + targetPos.x) / 2;
        const path = `M ${sourcePos.x} ${sourcePos.y} C ${midX} ${sourcePos.y}, ${midX} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
        
        return (
          <g key={connection.id}>
            <path
              d={path}
              stroke="#6366f1"
              strokeWidth="3"
              fill="none"
              strokeDasharray="5,5"
              className="cursor-pointer hover:stroke-width-4"
              onClick={() => {
                setSelectedConnection(connection.id);
                setMappingDialogOpen(true);
              }}
            />
            <text
              x={midX}
              y={(sourcePos.y + targetPos.y) / 2 - 10}
              fill="#6366f1"
              fontSize="12"
              textAnchor="middle"
              className="cursor-pointer font-medium"
              onClick={() => {
                setSelectedConnection(connection.id);
                setMappingDialogOpen(true);
              }}
            >
              Block Connection
            </text>
          </g>
        );
      }
      
      // Handle parameter connections
      const sourcePos = getPortPosition(connection.fromNodeId, connection.fromOutputId!, true);
      const targetPos = getPortPosition(connection.toNodeId, connection.toInputId!, false);
      
      // Create curved path for better visual appeal
      const midX = (sourcePos.x + targetPos.x) / 2;
      const path = `M ${sourcePos.x} ${sourcePos.y} C ${midX} ${sourcePos.y}, ${midX} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
      
      return (
        <path
          key={connection.id}
          d={path}
          stroke="#10b981"
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
    // Removed verbose debug logs for cleaner console output
    
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
      // Use the actual outputs that were created when the node was added to canvas
      node.outputs?.forEach((output: any) => {
        outputs.push({
          type: 'data-integration',
          nodeId: node.id,
          nodeName: node.name || node.uniqueName,
          outputId: output.id,
          outputName: output.name,
          description: `${output.name} from ${node.name || node.uniqueName}`
        });
      });
    });
    
    // Automation outputs from nodes on canvas
    nodes.filter(node => node.type === 'automation-input').forEach(node => {
      // Use the actual outputs that were created when the node was added to canvas
      node.outputs?.forEach((output: any) => {
        outputs.push({
          type: 'automation',
          nodeId: node.id,
          nodeName: node.name || node.uniqueName,
          outputId: output.id,
          outputName: output.name,
          description: `${output.name} from ${node.name || node.uniqueName}`
        });
      });
    });

    // View data outputs from nodes on canvas
    nodes.filter(node => node.type === 'view-data').forEach(node => {
      // Use the actual outputs that were created when the node was added to canvas
      node.outputs?.forEach((output: any) => {
        outputs.push({
          type: 'view-data',
          nodeId: node.id,
          nodeName: node.name || node.uniqueName,
          outputId: output.id,
          outputName: output.name,
          description: `${output.name} from ${node.name || node.uniqueName}`
        });
      });
    });

    // Only show data sources that are actually on the canvas as data-input nodes
    // No need to show all available data sources since they can be added as nodes first

    // Only show views that are actually on the canvas as view-input nodes  
    // No need to show all available views since they can be added as nodes first

    // Only show AI models that are actually on the canvas as ai-model nodes
    // Self-referencing is already handled in the ai-model nodes section above
    
    const filteredOutputs = connectionSearchQuery ? outputs.filter(output => 
      output.nodeName.toLowerCase().includes(connectionSearchQuery.toLowerCase()) ||
      output.outputName.toLowerCase().includes(connectionSearchQuery.toLowerCase())
    ) : outputs;
    
    return filteredOutputs;
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
    console.log('🔗 CreateConnection called with:', { fromNodeId, fromOutputId, toNodeId, toInputId });
    
    // Include AI models and Final Goal nodes in search
    const allNodes = [...nodes];
    
    // Add AI models as virtual nodes if they don't exist
    if (availableAIModels.length > 0) {
      availableAIModels.forEach(model => {
        const modelNodeId = `model-${model.id}`;
        if (!allNodes.find(n => n.id === modelNodeId)) {
          allNodes.push({
            id: modelNodeId,
            type: 'ai-model',
            name: model.name,
            x: 0,
            y: 0,
            inputs: model.inputs || [],
            outputs: model.outputs || []
          });
        }
      });
    }
    
    // Add Final Goal nodes as virtual nodes if they don't exist in allNodes
    const finalGoalNodes = nodes.filter(n => n.type === 'final-goal');
    finalGoalNodes.forEach(goalNode => {
      if (!allNodes.find(n => n.id === goalNode.id)) {
        allNodes.push(goalNode);
      }
    });
    
    console.log('🔗 Available nodes:', allNodes.map(n => ({ 
      id: n.id, 
      type: n.type, 
      name: n.name, 
      outputsCount: n.outputs?.length || 0,
      inputsCount: n.inputs?.length || 0 
    })));
    
    const fromNode = allNodes.find(n => n.id === fromNodeId);
    const toNode = allNodes.find(n => n.id === toNodeId);
    
    console.log('🔗 Found nodes:', { 
      fromNode: fromNode ? `${fromNode.id} (${fromNode.type})` : 'NOT_FOUND', 
      toNode: toNode ? `${toNode.id} (${toNode.type})` : 'NOT_FOUND' 
    });
    
    if (!fromNode || !toNode) {
      console.error('❌ Node not found:', { fromNodeFound: !!fromNode, toNodeFound: !!toNode });
      
      // If it's an AI model or Final Goal connection, just save the connection info
      if ((fromNodeId.startsWith('node-') && toNodeId.startsWith('model-')) ||
          (fromNodeId.startsWith('node-') && toNodeId.startsWith('node-') && toNode?.type === 'final-goal') ||
          (fromNodeId.startsWith('model-') && toNodeId.startsWith('node-') && toNode?.type === 'final-goal')) {
        
        let connectionDescription = '';
        if (toNodeId.startsWith('model-')) {
          connectionDescription = '데이터가 AI 모델에 연결되었습니다';
          console.log('✅ Creating connection for AI model (will be resolved at runtime)');
        } else if (toNode?.type === 'final-goal') {
          connectionDescription = '결과가 Final Goal에 연결되었습니다';
          console.log('✅ Creating connection for Final Goal (will be resolved at runtime)');
        } else {
          connectionDescription = '노드 연결이 생성되었습니다';
          console.log('✅ Creating general node connection (will be resolved at runtime)');
        }
        
        const newConnection = {
          id: `conn-${Date.now()}`,
          fromNodeId,
          fromOutputId,
          toNodeId,
          toInputId,
          type: 'parameter' as const,
          sourceOutputName: fromOutputId.split('-').pop() || 'Data',
          targetInputName: toInputId
        };
        
        setConnections(prev => [...prev, newConnection]);
        
        toast({
          title: "연결 성공",
          description: connectionDescription,
        });
        
        return true;
      }
      
      toast({
        title: "연결 실패",
        description: "소스 또는 대상 노드를 찾을 수 없습니다",
        variant: "destructive"
      });
      return false;
    }

    const fromOutput = fromNode.outputs.find(o => o.id === fromOutputId);
    const toInput = toNode.inputs.find(i => i.id === toInputId);
    
    if (!fromOutput || !toInput) {
      console.error('❌ Output or input not found:', { fromOutput, toInput });
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
      console.warn('⚠️ Input already connected:', existingConnection);
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
      type: 'parameter' as const,
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

  // Validate configuration before test/save
  const validateConfiguration = (): {isValid: boolean; errors: string[]} => {
    const errors: string[] = [];
    
    if (nodes.length === 0) {
      errors.push('No nodes found. Add at least one AI model to create a workflow.');
      return { isValid: false, errors };
    }
    
    // Check if there are any AI models
    const aiModels = nodes.filter(n => n.type === 'ai-model');
    if (aiModels.length === 0) {
      errors.push('At least one AI model is required to create a workflow');
    }
    
    // Check if AI models have sufficient input connections (relaxed validation)
    aiModels.forEach(model => {
      const modelConnections = connections.filter(conn => conn.toNodeId === model.id);
      // Only warn if no connections, don't block execution
      if (modelConnections.length === 0) {
        console.warn(`AI model "${model.uniqueName}" has no input connections. Will use sample data for testing.`);
      }
    });
    
    // Check final goal connections (relaxed - only warn)
    const finalGoals = nodes.filter(n => n.type === 'final-goal');
    if (finalGoals.length === 0) {
      console.warn('No "Final Goal" node found - results will be shown in raw format');
    }
    
    finalGoals.forEach(goal => {
      const hasConnections = connections.some(conn => conn.toNodeId === goal.id);
      if (!hasConnections) {
        console.warn(`Final goal "${goal.uniqueName}" has no input connections`);
      }
    });
    
    // Check for isolated nodes (only warn, don't block)
    const dataNodes = nodes.filter(n => n.type === 'data-input');
    dataNodes.forEach(dataNode => {
      const hasOutputConnections = connections.some(conn => conn.fromNodeId === dataNode.id);
      if (!hasOutputConnections) {
        console.warn(`Data source "${dataNode.uniqueName}" is not connected to any AI models - will use default data`);
      }
    });
    
    // Check for circular dependencies (basic check)
    const hasCircularDependency = () => {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      const hasCycle = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const outgoingConnections = connections.filter(conn => conn.fromNodeId === nodeId);
        for (const conn of outgoingConnections) {
          if (hasCycle(conn.toNodeId)) return true;
        }
        
        recursionStack.delete(nodeId);
        return false;
      };
      
      for (const node of nodes) {
        if (hasCycle(node.id)) return true;
      }
      return false;
    };
    
    if (hasCircularDependency()) {
      errors.push('Circular dependency detected in the workflow. Please check your connections.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Save execution results as data sources
  const saveExecutionResultsAsDataSources = async (results: any[]) => {
    try {
      console.log('saveExecutionResultsAsDataSources called with:', results);
      
      // Prevent duplicate processing by checking execution timestamps
      const processedResults = new Set();
      let savedCount = 0;
      
      for (const result of results) {
        console.log('Processing result:', result);
        
        // Create unique identifier to prevent duplicates
        const resultId = `${result.modelId}_${result.executedAt}`;
        if (processedResults.has(resultId)) {
          console.log('Skipping duplicate result');
          continue;
        }
        processedResults.add(resultId);
        
        // Check multiple possible result structures
        const outputData = result.outputData || result.output || result.predictions || result;
        const modelName = result.modelName || result.model || 'AI_Model';
        
        if (outputData && modelName) {
          const timestamp = Date.now() + savedCount; // Add offset to prevent timestamp collisions
          const dataSourceName = `AI_Result_${modelName}_${timestamp}`;
          
          // Create data source for the execution result
          const dataSourceData = {
            id: `ds-ai-result-${timestamp}`,
            name: dataSourceName,
            type: 'ai-result',
            category: 'ai',
            vendor: 'AI Model',
            status: 'connected',
            config: {
              modelName: modelName,
              executedAt: new Date().toISOString(),
              resultData: outputData,
              sampleData: Array.isArray(outputData.predictions) ? outputData.predictions.slice(0, 5) : [outputData],
              dataSchema: generateSchemaFromResult(outputData)
            }
          };
          
          console.log('Creating data source with data:', dataSourceData);
          
          const response = await fetch('/api/data-sources', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(dataSourceData)
          });

          if (response.ok) {
            console.log(`AI result saved as data source: ${dataSourceName}`);
            savedCount++;
          } else {
            const errorText = await response.text();
            console.error('Failed to save data source:', response.status, errorText);
          }
        } else {
          console.log('Skipping result due to missing data:', { outputData, modelName });
        }
      }
      
      if (savedCount > 0) {
        toast({
          title: "Results Saved",
          description: `${savedCount} AI execution result(s) saved as data sources for View Setting`,
        });
      }
    } catch (error) {
      console.error('Error saving execution results:', error);
      toast({
        title: "Error",
        description: "Failed to save execution results as data sources",
        variant: "destructive"
      });
    }
  };

  // Generate schema from AI result
  const generateSchemaFromResult = (resultData: any) => {
    if (!resultData) return [];
    
    // Handle parameter optimization results structure
    if (resultData.predictions && Array.isArray(resultData.predictions)) {
      const firstPrediction = resultData.predictions[0];
      if (firstPrediction && typeof firstPrediction === 'object') {
        const schema = [];
        
        // Add parameter fields if present
        if (firstPrediction.parameters) {
          Object.keys(firstPrediction.parameters).forEach(param => {
            schema.push({
              name: param,
              type: 'DECIMAL',
              description: `Optimized ${param} parameter value`
            });
          });
        }
        
        // Add predicted KPI fields if present
        if (firstPrediction.predictedKPIs) {
          Object.keys(firstPrediction.predictedKPIs).forEach(kpi => {
            schema.push({
              name: kpi,
              type: 'DECIMAL',
              description: `Predicted ${kpi} value`
            });
          });
        }
        
        // Add other fields
        ['optimizationScore', 'confidence', 'scenario'].forEach(field => {
          if (firstPrediction[field] !== undefined) {
            schema.push({
              name: field,
              type: typeof firstPrediction[field] === 'number' ? 'DECIMAL' : 'STRING',
              description: `${field} from optimization result`
            });
          }
        });
        
        return schema;
      }
    }
    
    // Handle standard array results
    if (Array.isArray(resultData) && resultData.length > 0) {
      const firstItem = resultData[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        return Object.keys(firstItem).map(key => ({
          name: key,
          type: typeof firstItem[key] === 'number' ? 'DECIMAL' : 'STRING',
          description: `${key} field from AI model result`
        }));
      }
    }
    
    return [{
      name: 'result',
      type: typeof resultData === 'number' ? 'DECIMAL' : 'STRING',
      description: 'AI model result'
    }];
  };

  // Test configuration
  const testConfiguration = async () => {
    setIsTestRunning(true);
    
    try {
      // First validate the configuration
      const validation = validateConfiguration();
      if (!validation.isValid) {
        setTestResults({
          status: 'error',
          message: 'Configuration has errors',
          details: validation
        });
        
        toast({
          title: "❌ Configuration Issues",
          description: `${validation.errors.length} issue(s) found. Please fix these before testing.`,
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowValidationDetails(true)}
            >
              View Details
            </Button>
          )
        });
        
        setIsTestRunning(false);
        return;
      }

      // Collect goal inputs from Final Goal nodes
      const finalGoalNodes = nodes.filter(node => node.type === 'final-goal');
      const goalInputs = finalGoalNodes.map(node => ({
        nodeId: node.id,
        goalRequest: node.goalRequest || '',
        nodeName: node.uniqueName
      }));

      // Check if there are connected data sources that require record-based processing
      const hasRecordBasedConnections = connections.some(conn => {
        const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
        return sourceNode?.type === 'data-input';
      });

      console.log('🔍 Checking execution method:', {
        hasRecordBasedConnections,
        connectionsCount: connections.length,
        dataInputNodes: nodes.filter(n => n.type === 'data-input').length
      });

      let response;
      
      // Check if this is an STGCN model configuration
      const hasSTGCNModel = availableAIModels.some(model => 
        model.name.toLowerCase().includes('stgcn') || 
        model.type?.toLowerCase().includes('stgcn')
      );
      
      if (hasSTGCNModel && hasRecordBasedConnections) {
        console.log('🚀 Using STGCN execution with app.py command structure');
        
        // Get the STGCN model
        const stgcnModel = availableAIModels.find(model => 
          model.name.toLowerCase().includes('stgcn') || 
          model.type?.toLowerCase().includes('stgcn')
        );
        
        if (stgcnModel) {
          // Prepare data for STGCN execution
          const connectedData: Record<string, any> = {};
          
          for (const connection of connections) {
            const sourceNode = nodes.find(n => n.id === connection.fromNodeId);
            if (sourceNode?.type === 'data-input') {
              const output = sourceNode.outputs?.find((o: any) => o.id === (connection as any).sourceOutputId);
              if (output?.tableData && Array.isArray(output.tableData)) {
                connectedData[connection.targetInputName] = output.tableData;
              }
            }
          }
          
          console.log('📊 STGCN Connected Data:', connectedData);
          
          // Convert data to STGCN format (KPI_X, KPI_Y, KPI_Z)
          const stgcnInput: any = {};
          
          // Look for KPI data in connected data
          for (const [inputName, data] of Object.entries(connectedData)) {
            if (Array.isArray(data) && data.length > 0) {
              // Take first record as target KPI
              const firstRecord = data[0];
              if (typeof firstRecord === 'object') {
                // Map KPI fields
                if ('KPI_X' in firstRecord) stgcnInput.KPI_X = firstRecord.KPI_X;
                if ('KPI_Y' in firstRecord) stgcnInput.KPI_Y = firstRecord.KPI_Y;
                if ('KPI_Z' in firstRecord) stgcnInput.KPI_Z = firstRecord.KPI_Z;
                
                // Also include raw data for analysis
                stgcnInput._rawData = data;
                stgcnInput._sourceTable = inputName;
              }
            }
          }
          
          console.log('🎯 STGCN Target Input:', stgcnInput);
          
          // Execute STGCN model
          response = await fetch(`/api/ai-models/${stgcnModel.id}/execute-stgcn`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              inputData: stgcnInput,
              executionConfig: {
                steps: 400,
                alpha: 1.0,
                beta: 2.0,
                gamma: 0.1,
                lr: 0.05
              }
            })
          });
        }
      } else if (hasRecordBasedConnections) {
        console.log('🔄 Using record-based sequential processing');
        
        // Collect connected data for record-based processing
        const connectedData: Record<string, any> = {};
        
        for (const connection of connections) {
          const sourceNode = nodes.find(n => n.id === connection.fromNodeId);
          if (sourceNode?.type === 'data-input') {
            const output = sourceNode.outputs?.find((o: any) => o.id === (connection as any).sourceOutputId);
            if (output?.tableData) {
              connectedData[connection.targetInputName] = output.tableData;
              console.log(`📊 Added data source: ${connection.targetInputName}`, {
                recordCount: output.tableData.length,
                fieldName: output.fieldName,
                outputName: output.name,
                sampleRecord: output.tableData[0],
                allRecords: output.tableData.length <= 10 ? output.tableData : 'Too many to show'
              });
            } else {
              console.log(`⚠️ No tableData found for output:`, {
                sourceNodeType: sourceNode.type,
                sourceNodeName: sourceNode.name,
                connectionOutputId: (connection as any).sourceOutputId,
                availableOutputs: sourceNode.outputs?.map((o: any) => ({ id: o.id, name: o.name, hasTableData: !!o.tableData }))
              });
            }
          }
        }
        
        // Get the AI model node for record processing
        const aiModelNode = nodes.find(n => n.type === 'ai-model');
        if (!aiModelNode) {
          throw new Error('No AI model node found for execution');
        }
        
        // Call record-based execution endpoint
        response = await fetch(`/api/ai-models/${aiModelNode.modelId}/execute-with-records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            connectedData,
            connections,
            nodeId: aiModelNode.id
          })
        });
      } else {
        console.log('📊 Using standard model configuration execution');
        
        // Execute the model configuration using standard method
        response = await fetch('/api/model-configuration/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            configurationId: currentConfig?.id,
            nodes: nodes,
            connections: connections,
            goalInputs: goalInputs
          })
        });
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Full execution result:', result);
        
        // Filter results based on Final Goal connections
        const finalGoalConnections = connections.filter(conn => {
          const toNode = nodes.find(n => n.id === conn.toNodeId);
          return toNode?.type === 'final-goal';
        });
        
        console.log('Final Goal connections found:', finalGoalConnections);
        
        // Only save results that are connected to Final Goal nodes
        const finalResults = result.results ? result.results.filter((r: any) => {
          // Check if this result corresponds to a node connected to Final Goal
          const resultNode = nodes.find(n => n.modelId === r.modelId);
          if (!resultNode) return false;
          
          return finalGoalConnections.some(conn => conn.fromNodeId === resultNode.id);
        }) : [];
        
        console.log('Filtered final results for Final Goal:', finalResults);
        
        // Handle different result structures based on execution method
        if (result.executionMethod === 'record_based_sequential' || result.executionMethod === 'stgcn_subprocess') {
          console.log('📊 Processing record-based results:', {
            batchResultsLength: result.batchResults?.length,
            summary: result.summary
          });
          
          const successfulRecords = result.batchResults?.filter((r: any) => !r.error) || [];
          const failedRecords = result.batchResults?.filter((r: any) => r.error) || [];
          
          setTestResults({
            status: 'success',
            message: `레코드 기반 순차 처리 완료! ${result.summary?.successfulRecords || 0}개 성공, ${result.summary?.failedRecords || 0}개 실패`,
            details: {
              isValid: true,
              errors: failedRecords.map((r: any) => `Record ${r.recordIndex}: ${r.error}`),
              results: result.batchResults || [],
              executedAt: new Date().toISOString(),
              executionResults: result.batchResults,
              summary: result.summary,
              executionMethod: 'record_based_sequential'
            }
          });
          
          toast({
            title: "✅ 레코드 기반 실행 완료",
            description: `총 ${result.summary?.totalRecords || 0}개 레코드 처리: ${result.summary?.successfulRecords || 0}개 성공, ${result.summary?.failedRecords || 0}개 실패`,
          });
          
          // Save batch results as data sources only if connected to Final Goal
          console.log('Attempting to save batch results as data sources...');
          if (result.batchResults && result.batchResults.length > 0 && finalGoalConnections.length > 0) {
            const transformedResults = [{
              modelId: result.modelId,
              modelName: result.modelName,
              outputData: {
                batchResults: result.batchResults,
                summary: result.summary
              },
              executedAt: new Date().toISOString(),
              executionMethod: result.executionMethod || 'record_based_sequential',
              finalGoalConnected: true
            }];
            console.log('Calling saveExecutionResultsAsDataSources with batch results (Final Goal connected):', transformedResults);
            await saveExecutionResultsAsDataSources(transformedResults);
          } else if (finalGoalConnections.length === 0) {
            console.log('No Final Goal connections - results not saved as data sources');
            toast({
              title: "결과 저장 안됨",
              description: "Final Goal 노드에 연결된 결과만 Configuration 결과로 저장됩니다",
              variant: "destructive"
            });
          }
        } else {
          // Handle standard execution results
          console.log('Result structure check:', {
            hasResults: !!result.results,
            resultsLength: result.results?.length,
            resultsType: typeof result.results,
            resultKeys: result.results ? Object.keys(result.results) : 'none'
          });
          
          setTestResults({
            status: 'success',
            message: 'Model execution completed successfully!',
            details: {
              isValid: true,
              errors: [],
              results: result.results || [],
              executedAt: new Date().toISOString(),
              executionResults: result.results
            }
          });
          
          toast({
            title: "✅ Model Execution Success",
            description: `${result.results?.length || 0} AI model(s) executed successfully. View results below.`,
          });
          
          // Save execution results as data sources for View Setting only if connected to Final Goal
          console.log('Attempting to save results as data sources...');
          if (finalResults && finalResults.length > 0 && finalGoalConnections.length > 0) {
            console.log('Calling saveExecutionResultsAsDataSources with Final Goal connected results:', finalResults);
            await saveExecutionResultsAsDataSources(finalResults);
          } else if (finalGoalConnections.length === 0) {
            console.log('No Final Goal connections - results not saved as data sources');
            toast({
              title: "결과 저장 안됨", 
              description: "Final Goal 노드에 연결된 결과만 Configuration 결과로 저장됩니다",
              variant: "destructive"
            });
          } else {
            console.log('No results to save or results is empty:', result.results);
          }
        }
      } else {
        setTestResults({
          status: 'error',
          message: result.error || 'Model execution failed',
          details: {
            isValid: false,
            errors: [result.error || 'Unknown error'],
            executionResults: []
          }
        });
        
        toast({
          title: "❌ Execution Failed",
          description: result.error || 'Failed to execute model configuration',
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Error testing configuration:', error);
      
      setTestResults({
        status: 'error',
        message: 'Network or server error during execution',
        details: {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          executionResults: []
        }
      });
      
      toast({
        title: "❌ Network Error",
        description: "Failed to connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  // Save configuration
  const saveConfiguration = async () => {
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
    
    try {
      const updatedConfig = {
        ...currentConfig,
        nodes,
        connections,
        lastModified: new Date().toISOString()
      };
      
      // Save to backend
      const response = await fetch(`/api/model-configurations/${currentConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        // Update local state
        setCurrentConfig(updatedConfig);
        setHasUnsavedChanges(false);
        
        // Invalidate and refetch the configurations list
        queryClient.invalidateQueries({ queryKey: ['/api/model-configurations'] });
        
        toast({
          title: "Configuration Saved",
          description: `${currentConfig.name} has been saved successfully`
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getFilteredConfigs = (folderId: string) => {
    return (modelConfigurations as Configuration[]).filter(config => config.folderId === folderId);
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
              <Button 
                variant="outline" 
                onClick={saveConfiguration}
                disabled={isSaving || !hasUnsavedChanges}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                    Saving...
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Saved
                  </>
                )}
              </Button>
              <Button onClick={testConfiguration} disabled={isTestRunning}>
                {isTestRunning ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Test
                  </>
                )}
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
                      {/* Models organized by AI Model folders (not Model Config folders) */}
                      {(aiModelFolders as any[]).map((folder) => {
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
                      
                      {/* Unorganized models (models without folders) */}
                      {(() => {
                        const unorganizedModels = filteredAIModels.filter(model => !model.folderId);
                        if (unorganizedModels.length === 0) return null;
                        
                        const isExpanded = expandedFolders.has('unorganized');
                        
                        return (
                          <div key="unorganized">
                            <div 
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleFolder('unorganized')}
                            >
                              <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <Folder className="w-3 h-3 text-gray-500" />
                              <span className="text-sm font-medium text-gray-900">Unorganized Models</span>
                              <Badge variant="secondary" className="text-xs">{unorganizedModels.length}</Badge>
                            </div>
                            
                            {isExpanded && (
                              <div className="ml-4 mt-2 space-y-2">
                                {unorganizedModels.map((model) => (
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
                                            <span className="text-xs text-gray-400">+{model.inputs.length - 2} more</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex flex-col gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs px-2"
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
                      })()}
                    </div>
                  </div>
                )}

                {/* Data Integration Tab */}
                {activeLeftTab === 'data' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4 text-green-600" />
                      Data Sources ({filteredDataSources.length})
                      {isDataSourcesLoading && (
                        <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      )}
                    </h4>
                    
                    {/* Debug Information */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mb-3 p-2 bg-gray-100 rounded text-xs">
                        <div>Raw data sources: {Array.isArray(realDataSources) ? realDataSources.length : 0}</div>
                        <div>Available: {availableDataSources.length}</div>
                        <div>Filtered: {filteredDataSources.length}</div>
                        <div>Loading: {isDataSourcesLoading ? 'Yes' : 'No'}</div>
                      </div>
                    )}
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
                                          {source.recordCount && <span className="mr-1">{source.recordCount.toLocaleString()} records</span>}
                                          {source.fields?.length || 0} fields
                                          {source.tables?.length && <span className="ml-1">• {source.tables.length} tables</span>}
                                        </div>
                                        {/* Show actual table data for real sources */}
                                        {source.sampleData && Object.keys(source.sampleData).length > 0 && (
                                          <div className="text-xs text-blue-600 mt-1">
                                            Real data: {Object.keys(source.sampleData).map(table => table.split(' - ')[1] || table).join(', ')}
                                          </div>
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
              handleCanvasMouseMove(e);
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

            {/* Block Connection Mode Overlay */}
            {selectedNodeForConnection && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-blue-900/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-sm font-medium">Connection Mode</div>
                    <div className="text-xs text-blue-200">
                      Click another node to connect
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-200 hover:text-white hover:bg-blue-800"
                    onClick={() => {
                      cancelConnection();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

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
              
              {/* Render existing port connections */}
              {connections.filter(c => c.fromNodeId && c.toNodeId).map((connection) => {
                const sourceNode = nodes.find(n => n.id === connection.fromNodeId);
                const targetNode = nodes.find(n => n.id === connection.toNodeId);
                
                if (!sourceNode || !targetNode) return null;
                
                // Find output port position
                const outputIndex = sourceNode.outputs.findIndex(o => o.id === connection.fromOutputId);
                if (outputIndex === -1) return null;
                
                // Find input port position  
                const inputIndex = targetNode.inputs.findIndex(i => i.id === connection.toInputId);
                if (inputIndex === -1) return null;
                
                // Calculate precise port positions
                const outputPortY = 60 + (sourceNode.type === 'final-goal' ? 140 : 0) + (outputIndex * 24) + 12;
                const inputPortY = 60 + (targetNode.type === 'final-goal' ? 140 : 0) + (inputIndex * 24) + 12;
                
                const startX = sourceNode.position.x + sourceNode.width - 8; // Right edge with port offset
                const startY = sourceNode.position.y + outputPortY;
                
                const endX = targetNode.position.x + 8; // Left edge with port offset  
                const endY = targetNode.position.y + inputPortY;
                
                const controlOffset = Math.max(50, Math.abs(endX - startX) * 0.4);
                const curve = `M ${startX} ${startY} C ${startX + controlOffset} ${startY} ${endX - controlOffset} ${endY} ${endX} ${endY}`;
                
                const connectionColor = getTypeColor(connection.type || 'string');
                
                return (
                  <g key={connection.id} className="pointer-events-auto">
                    {/* Connection path */}
                    <path
                      d={curve}
                      stroke={connectionColor}
                      strokeWidth="2.5"
                      strokeDasharray="none"
                      fill="none"
                      markerEnd="url(#arrow)"
                      opacity="0.85"
                      className="hover:opacity-100 cursor-pointer transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Remove connection: ${connection.sourceOutputName} → ${connection.targetInputName}?`)) {
                          disconnectNodes(connection.id);
                        }
                      }}
                    />
                  </g>
                );
              })}
              
              {/* Preview connection for port-based connection mode */}
              {previewConnection && (
                <g>
                  <path
                    d={`M ${previewConnection.from.x} ${previewConnection.from.y} C ${previewConnection.from.x + 50} ${previewConnection.from.y} ${previewConnection.to.x - 50} ${previewConnection.to.y} ${previewConnection.to.x} ${previewConnection.to.y}`}
                    stroke={connectionSource ? getTypeColor(connectionSource.dataType) : '#3b82f6'}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    fill="none"
                    opacity="0.6"
                    className="pointer-events-none"
                  />
                  <circle
                    cx={previewConnection.from.x}
                    cy={previewConnection.from.y}
                    r="3"
                    fill={connectionSource ? getTypeColor(connectionSource.dataType) : '#3b82f6'}
                    className="pointer-events-none"
                  />
                </g>
              )}
              
              {/* Preview connection for click-based connection mode */}
              {selectedNodeForConnection && (
                <g>
                  {(() => {
                    const sourceNode = nodes.find(n => n.id === selectedNodeForConnection);
                    if (!sourceNode) return null;
                    
                    const startX = sourceNode.position.x + sourceNode.width / 2;
                    const startY = sourceNode.position.y + sourceNode.height / 2;
                    const endX = mousePosition.x;
                    const endY = mousePosition.y;
                    const controlOffset = Math.abs(endX - startX) * 0.5;
                    const curve = `M ${startX} ${startY} C ${startX + controlOffset} ${startY} ${endX - controlOffset} ${endY} ${endX} ${endY}`;
                    
                    return (
                      <path
                        d={curve}
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeDasharray="8,4"
                        fill="none"
                        opacity="0.7"
                        className="pointer-events-none"
                      />
                    );
                  })()}
                </g>
              )}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
                <div
                key={node.id}
                className={`absolute border rounded-lg shadow-lg z-0 ${
                  isDragging && draggedNode?.id === node.id ? 'cursor-grabbing' : 'cursor-grab'
                } ${
                  node.type === 'final-goal' 
                    ? 'bg-purple-900 border-purple-500 ring-2 ring-purple-400' 
                    : 'bg-gray-800 border-gray-600'
                } ${
                  selectedNodeForConnection === node.id
                    ? 'ring-4 ring-blue-400 border-blue-500'
                    : ''
                } ${
                  selectedNodeForConnection && selectedNodeForConnection !== node.id
                    ? 'ring-2 ring-green-400 border-green-500 hover:ring-green-300'
                    : ''
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: Math.max(node.width, 300), // Minimum width to prevent overflow
                  minHeight: node.height,
                  zIndex: isDragging && draggedNode?.id === node.id ? 50 : 10
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onDragStart={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  
                  // Only handle connection mode when connection is in progress
                  if (selectedNodeForConnection) {
                    if (selectedNodeForConnection === node.id) {
                      // Cancel connection mode
                      cancelConnection();
                    } else {
                      // Create connection between selected source and this target node
                      const sourceNode = nodes.find(n => n.id === selectedNodeForConnection);
                      if (sourceNode && sourceNode.id !== node.id) {
                        // Check if connection already exists
                        const existingConnection = connections.find(c => 
                          c.fromNodeId === sourceNode.id && c.toNodeId === node.id
                        );
                        
                        if (existingConnection) {
                          toast({
                            title: "Connection Already Exists",
                            description: `${sourceNode.name} is already connected to ${node.name}`,
                            variant: "destructive"
                          });
                        } else {
                          // Create new connection
                          const connection: Connection = {
                            id: `conn-${Date.now()}`,
                            type: 'data',
                            fromNodeId: sourceNode.id,
                            toNodeId: node.id,
                            sourceOutputName: sourceNode.name,
                            targetInputName: node.name,
                            fromOutputId: sourceNode.outputs[0]?.id || '',
                            toInputId: node.inputs[0]?.id || '',
                            mappings: []
                          };
                          
                          setConnections(prev => [...prev, connection]);
                          cancelConnection();
                          
                          toast({
                            title: "Connection Created",
                            description: `Connected ${sourceNode.name} to ${node.name}`,
                          });
                        }
                      }
                    }
                  }
                  // Remove automatic details display on node click
                }}
              >
                {/* Node Header */}
                <div className={`px-3 py-2 rounded-t-lg text-white text-sm font-medium ${
                  node.type === 'ai-model' ? 'bg-blue-600' :
                  node.type === 'data-input' ? 'bg-green-600' :
                  node.type === 'view-data' ? 'bg-indigo-600' :
                  node.type === 'final-goal' ? 'bg-purple-700' :
                  'bg-purple-600'
                }`}>
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex flex-col min-w-0 flex-1 mr-2">
                      <span className="truncate text-sm font-medium" title={node.uniqueName}>
                        {node.uniqueName}
                      </span>
                      {node.uniqueName !== node.name && (
                        <span className="text-xs opacity-70 truncate" title={node.name}>
                          {node.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Simple Connection Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 hover:bg-white/20 ${
                          selectedNodeForConnection === node.id ? 'bg-blue-500/30 text-blue-300' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedNodeForConnection === node.id) {
                            // Cancel connection mode
                            cancelConnection();
                          } else {
                            // Start connection mode
                            setSelectedNodeForConnection(node.id);
                            toast({
                              title: "Connection Mode",
                              description: "Click another node to connect",
                            });
                          }
                        }}
                        title={selectedNodeForConnection === node.id ? "Cancel connection" : "Connect to another node"}
                      >
                        <Link2 className="w-3 h-3" />
                      </Button>
                      
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
                          if (window.confirm(`Delete "${node.uniqueName}"? This action cannot be undone.`)) {
                            deleteNodeDirectly(node);
                          }
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
                  
                  {/* Final Goal Icon and Input */}
                  {node.type === 'final-goal' && (
                    <div className="flex items-center justify-center mb-2">
                      <Target className="w-8 h-8 text-purple-400" />
                    </div>
                  )}
                  
                  {/* Inputs */}
                  {node.inputs.map((input, index) => {
                    const isConnected = connections.some(conn => conn.toNodeId === node.id && conn.toInputId === input.id);
                    const connectionColor = isConnected ? getTypeColor(input.type) : '#6b7280';
                    
                    return (
                      <div key={input.id} className="flex items-center justify-between text-xs mb-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className={`w-3 h-3 rounded-full border-2 cursor-pointer hover:scale-110 transition-all duration-200 flex-shrink-0 ${
                              selectedPort?.nodeId === node.id && selectedPort?.portId === input.id 
                                ? 'ring-2 ring-blue-400 ring-opacity-75 shadow-lg scale-110' : ''
                            } ${
                              selectedNodeForConnection && isDataTypeCompatible(getNodeOutputType(selectedNodeForConnection), input.type) 
                                ? 'ring-2 ring-green-400 scale-125' : ''
                            }`}
                            style={{ 
                              backgroundColor: isConnected ? connectionColor : 'transparent',
                              borderColor: connectionColor,
                              borderWidth: '2px'
                            }}
                            onClick={(e) => handlePortClick(node.id, input.id, 'input', input.type, e)}
                            title={`${input.name} (${input.type})`}
                          />
                          <span className="text-gray-300 truncate flex-1 min-w-0" title={input.name}>
                            {input.name}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs flex-shrink-0 ml-1">{input.type}</span>
                      </div>
                    );
                  })}

                  {/* Separator if both inputs and outputs exist */}
                  {node.inputs.length > 0 && node.outputs.length > 0 && (
                    <div className="border-t border-gray-600 my-2"></div>
                  )}

                  {/* Outputs */}
                  {node.outputs.map((output, index) => {
                    const isConnected = connections.some(conn => conn.fromNodeId === node.id && conn.fromOutputId === output.id);
                    const connectionColor = isConnected ? getTypeColor(output.type) : '#6b7280';
                    
                    return (
                      <div key={output.id} className="flex items-center justify-between text-xs mb-1 min-w-0">
                        <span className="text-gray-500 text-xs flex-shrink-0 mr-1">{output.type}</span>
                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          <span className="text-gray-300 truncate flex-1 min-w-0 text-right" title={output.name}>
                            {output.name}
                          </span>
                          <div
                            className={`w-3 h-3 rounded-full border-2 cursor-pointer hover:scale-110 transition-all duration-200 flex-shrink-0 ${
                              selectedPort?.nodeId === node.id && selectedPort?.portId === output.id 
                                ? 'ring-2 ring-blue-400 ring-opacity-75 shadow-lg scale-110' : ''
                            }`}
                            style={{ 
                              backgroundColor: isConnected ? connectionColor : 'transparent',
                              borderColor: connectionColor,
                              borderWidth: '2px'
                            }}
                            onClick={(e) => handlePortClick(node.id, output.id, 'output', output.type, e)}
                            title={`${output.name} (${output.type})`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
            ))}

            {/* Add Node Menu */}
            {showAddNodeMenu && (
              <div
                className="absolute bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-[100] min-w-48"
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
                      const sources = availableDataSources.filter((s: any) => s.category === category);
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
          
          {/* Test Results Panel */}
          {testResults && (
            <div className="border-t border-gray-300 bg-white" data-testid="test-results-panel">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {testResults.status === 'success' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    Execution Results
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTestResults(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Debug Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded border text-xs">
                  <div>Status: {testResults.status}</div>
                  <div>Message: {testResults.message}</div>
                  <div>Results Count: {testResults.details?.results?.length || 0}</div>
                  <div>Has Details: {testResults.details ? 'Yes' : 'No'}</div>
                </div>
                
                <div className="space-y-4">
                  {testResults.status === 'success' && testResults.details?.results && testResults.details.results.length > 0 ? (
                    <>
                      <div className="text-sm text-gray-600 mb-4">
                        {testResults.message} • Executed at {new Date(testResults.details.executedAt).toLocaleTimeString()}
                      </div>
                      
                      {/* Check if this is record-based sequential processing */}
                      {testResults.details?.executionMethod === 'record_based_sequential' && testResults.details?.summary ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-3">
                            <Brain className="w-4 h-4" />
                            레코드 기반 순차 처리 통합 결과
                          </h4>
                          
                          {/* Summary Statistics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-white p-3 rounded border text-center">
                              <div className="text-xl font-bold text-blue-600">{testResults.details.summary.totalRecords}</div>
                              <div className="text-xs text-gray-600">총 레코드</div>
                            </div>
                            <div className="bg-white p-3 rounded border text-center">
                              <div className="text-xl font-bold text-green-600">{testResults.details.summary.successfulRecords}</div>
                              <div className="text-xs text-gray-600">성공</div>
                            </div>
                            <div className="bg-white p-3 rounded border text-center">
                              <div className="text-xl font-bold text-red-600">{testResults.details.summary.failedRecords}</div>
                              <div className="text-xs text-gray-600">실패</div>
                            </div>
                            <div className="bg-white p-3 rounded border text-center">
                              <div className="text-xl font-bold text-purple-600">{Math.round(testResults.details.summary.averageExecutionTime)}ms</div>
                              <div className="text-xs text-gray-600">평균 시간</div>
                            </div>
                          </div>
                          
                          {/* Detailed Records Table */}
                          <div className="bg-white rounded border">
                            <div className="px-3 py-2 border-b bg-gray-50">
                              <h5 className="font-medium text-sm">개별 레코드 처리 결과</h5>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-gray-50">
                                  <tr>
                                    <th className="text-left p-2 border-b">레코드</th>
                                    <th className="text-left p-2 border-b">입력 데이터</th>
                                    <th className="text-left p-2 border-b">AI 결과</th>
                                    <th className="text-left p-2 border-b">실행시간</th>
                                    <th className="text-left p-2 border-b">상태</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {testResults.details.results.map((result: any, index: number) => (
                                    <tr key={index} className={result.error ? 'bg-red-50' : 'bg-green-50'}>
                                      <td className="p-2 border-b font-medium">#{result.recordIndex}</td>
                                      <td className="p-2 border-b">
                                        <div className="space-y-1">
                                          {Object.entries(result.inputData || {}).map(([key, value]) => (
                                            <div key={key} className="text-gray-700">
                                              <span className="font-medium">{key}:</span> {String(value)}
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="p-2 border-b">
                                        {result.error ? (
                                          <span className="text-red-600">Error: {result.error}</span>
                                        ) : (
                                          <div>
                                            {result.outputData?.predictions ? (
                                              result.outputData.predictions.map((pred: any, i: number) => (
                                                <div key={i} className="mb-1">
                                                  <span className="font-medium">Prediction {i + 1}:</span> {
                                                    typeof pred.result === 'number' ? pred.result.toFixed(3) : 
                                                    JSON.stringify(pred).substring(0, 50)
                                                  }
                                                </div>
                                              ))
                                            ) : result.outputData ? (
                                              <div>{JSON.stringify(result.outputData).substring(0, 50)}...</div>
                                            ) : (
                                              <span className="text-gray-500">결과 없음</span>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2 border-b text-gray-600">{result.executionTime || 0}ms</td>
                                      <td className="p-2 border-b">
                                        <Badge variant={result.error ? "destructive" : "default"} className="text-xs">
                                          {result.error ? "실패" : "성공"}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                          {/* Statistical Summary if numeric results exist */}
                          {(() => {
                            const successfulResults = testResults.details.results.filter((r: any) => !r.error);
                            const numericResults: number[] = [];
                            
                            successfulResults.forEach((result: any) => {
                              if (result.outputData?.predictions) {
                                result.outputData.predictions.forEach((pred: any) => {
                                  if (typeof pred.result === 'number') {
                                    numericResults.push(pred.result);
                                  }
                                });
                              }
                            });
                            
                            if (numericResults.length > 0) {
                              const avg = numericResults.reduce((a, b) => a + b, 0) / numericResults.length;
                              const min = Math.min(...numericResults);
                              const max = Math.max(...numericResults);
                              
                              return (
                                <div className="mt-4 p-3 bg-white rounded border">
                                  <h6 className="font-medium text-sm text-gray-700 mb-2">결과 통계 분석</h6>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <span className="text-gray-500">평균:</span>
                                      <span className="ml-1 font-medium">{avg.toFixed(3)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">최소:</span>
                                      <span className="ml-1 font-medium">{min.toFixed(3)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">최대:</span>
                                      <span className="ml-1 font-medium">{max.toFixed(3)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">범위:</span>
                                      <span className="ml-1 font-medium">{(max - min).toFixed(3)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : null}
                      
                      {testResults.details.results.map((result: any, index: number) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-green-900 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              {result.modelName}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-green-800 border-green-300">
                                {result.status}
                              </Badge>
                              <span className="text-xs text-green-600">
                                {result.outputData?.processingTime}ms
                              </span>
                            </div>
                          </div>
                          
                          {/* Input Data Sources */}
                          {result.inputDataSources && result.inputDataSources.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm font-medium text-gray-700 mb-1">Input Sources:</div>
                              <div className="flex flex-wrap gap-1">
                                {result.inputDataSources.map((source: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Predictions */}
                          {result.outputData?.predictions && (
                            <div className="mb-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Model Predictions:</div>
                              <div className="bg-white rounded border p-3 overflow-x-auto">
                                <div className="grid gap-2 min-w-[600px]">
                                  {Array.isArray(result.outputData.predictions) ? (
                                    result.outputData.predictions.slice(0, 3).map((pred: any, predIdx: number) => (
                                      <div key={predIdx} className="flex items-center gap-4 text-xs">
                                        <span className="font-medium text-gray-600">#{predIdx + 1}</span>
                                        {Object.entries(pred).map(([key, value]: [string, any]) => (
                                          <span key={key} className="flex items-center gap-1">
                                            <span className="text-gray-500">{key}:</span>
                                            <span className="font-medium">
                                              {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                            </span>
                                          </span>
                                        ))}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-600">
                                      {JSON.stringify(result.outputData.predictions, null, 2)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Goal Responses */}
                          {result.outputData?.goalResponses && result.outputData.goalResponses.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Goal Analysis:</div>
                              {result.outputData.goalResponses.map((response: any, respIdx: number) => (
                                <div key={respIdx} className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
                                  <div className="text-sm font-medium text-blue-900 mb-2">
                                    Request: "{response.userRequest}"
                                  </div>
                                  <div className="text-sm text-blue-800 whitespace-pre-line">
                                    {response.aiResponse}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Parameter Optimization Results & CSV Download */}
                          {result.outputData?.predictions && result.outputData.predictions.some((p: any) => p.parameters) && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-700">Parameter Optimization Results:</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Generate and download CSV
                                    const csvData = [
                                      ['Scenario', 'Temperature_A', 'Temperature_B', 'Temperature_C', 'Pressure_A', 'Pressure_B', 'GasFlow_A', 'GasFlow_B', 'KPI_X', 'KPI_Y', 'KPI_Z', 'Optimization_Score'],
                                      ...result.outputData.predictions.map((pred: any) => [
                                        pred.scenario || 'Optimized',
                                        pred.parameters?.Temperature_A?.toFixed(2) || '',
                                        pred.parameters?.Temperature_B?.toFixed(2) || '',
                                        pred.parameters?.Temperature_C?.toFixed(2) || '',
                                        pred.parameters?.Pressure_A?.toFixed(2) || '',
                                        pred.parameters?.Pressure_B?.toFixed(2) || '',
                                        pred.parameters?.GasFlow_A?.toFixed(2) || '',
                                        pred.parameters?.GasFlow_B?.toFixed(2) || '',
                                        pred.predictedKPIs?.KPI_X?.toFixed(2) || '',
                                        pred.predictedKPIs?.KPI_Y?.toFixed(2) || '',
                                        pred.predictedKPIs?.KPI_Z?.toFixed(2) || '',
                                        pred.optimizationScore?.toFixed(3) || ''
                                      ])
                                    ];
                                    
                                    const csvContent = csvData.map(row => row.join(',')).join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${result.modelName}_optimization_results_${Date.now()}.csv`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                    
                                    toast({
                                      title: "CSV Downloaded",
                                      description: "Parameter optimization results saved to CSV file"
                                    });
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Download CSV
                                </Button>
                              </div>
                              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                {result.outputData.predictions.map((pred: any, predIdx: number) => (
                                  <div key={predIdx} className="mb-3 last:mb-0">
                                    <div className="text-sm font-medium text-purple-900 mb-2">
                                      {pred.scenario} (Optimization Score: {pred.optimizationScore?.toFixed(3)})
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      {pred.parameters && (
                                        <div>
                                          <div className="font-medium text-gray-700 mb-1">Optimized Parameters:</div>
                                          {Object.entries(pred.parameters).map(([param, value]: [string, any]) => (
                                            <div key={param} className="flex justify-between">
                                              <span className="text-gray-600">{param}:</span>
                                              <span className="font-medium">{value.toFixed(2)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {pred.predictedKPIs && (
                                        <div>
                                          <div className="font-medium text-gray-700 mb-1">Predicted KPIs:</div>
                                          {Object.entries(pred.predictedKPIs).map(([kpi, value]: [string, any]) => (
                                            <div key={kpi} className="flex justify-between">
                                              <span className="text-gray-600">{kpi}:</span>
                                              <span className="font-medium">{value.toFixed(2)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Model Performance */}
                          {result.outputData?.modelPerformance && (
                            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                              {Object.entries(result.outputData.modelPerformance).map(([key, value]: [string, any]) => (
                                <span key={key} className="flex items-center gap-1">
                                  <span className="capitalize">{key}:</span>
                                  <span className="font-medium">
                                    {typeof value === 'number' ? value.toFixed(3) : String(value)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Data Sources Saved Message */}
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Database className="w-4 h-4" />
                          <span className="text-sm font-medium">Results Saved as Data Sources</span>
                        </div>
                        <div className="text-sm text-blue-600 mt-1">
                          AI execution results have been automatically saved and are now available in the Data Integration section for use in views and dashboards.
                        </div>
                      </div>
                    </>
                  ) : testResults.status === 'success' ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-yellow-800 font-medium mb-2">No Results</div>
                      <div className="text-yellow-700 text-sm">
                        {testResults.message}
                      </div>
                      <div className="text-yellow-600 text-xs mt-2">
                        The AI model execution completed successfully but returned no results.
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-red-800 font-medium mb-2">Execution Failed</div>
                      <div className="text-red-700 text-sm">
                        {testResults.message}
                      </div>
                      {testResults.details?.error && (
                        <div className="text-red-600 text-xs mt-2 font-mono">
                          {testResults.details.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
                          deleteNodeDirectly(selectedNodeForDetails);
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
                            <div>{availableDataSources.find((s: any) => s.id === selectedNodeForDetails.sourceId)?.name || 'Unknown Source'}</div>
                            
                            {/* Show Sample Data Tables */}
                            {selectedNodeForDetails.sampleData && Object.keys(selectedNodeForDetails.sampleData).length > 0 && (
                              <div className="mt-4">
                                <div className="font-medium text-gray-700 mb-2">Sample Data:</div>
                                {Object.entries(selectedNodeForDetails.sampleData).map(([tableName, tableData]: [string, any]) => (
                                  <div key={tableName} className="mb-4 p-3 border rounded-lg bg-gray-50">
                                    <h6 className="font-medium text-sm text-gray-800 mb-2">
                                      {tableName.split(' - ')[1] || tableName}
                                    </h6>
                                    {Array.isArray(tableData) && tableData.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs border-collapse">
                                          <thead>
                                            <tr className="bg-gray-100">
                                              {Object.keys(tableData[0]).map(column => (
                                                <th key={column} className="border border-gray-300 px-2 py-1 text-left font-medium">
                                                  {column}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {tableData.slice(0, 3).map((row: any, index: number) => (
                                              <tr key={index}>
                                                {Object.values(row).map((value: any, colIndex: number) => (
                                                  <td key={colIndex} className="border border-gray-300 px-2 py-1">
                                                    {String(value)}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                        {tableData.length > 3 && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            +{tableData.length - 3} more rows
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">No data available</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
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

                {/* AI Model Test Section */}
                {selectedNodeForDetails?.type === 'ai-model' && (
                  <div className="mb-6">
                    <h5 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-green-600" />
                      Model Testing
                    </h5>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Button 
                          onClick={async () => {
                            try {
                              console.log('🧪 Testing AI model with sample data:', selectedNodeForDetails.modelId);
                              const response = await fetch(`/api/ai-models/${selectedNodeForDetails.modelId}/test`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sampleData: {
                                    graph_signal: [[1, 2, 3], [4, 5, 6]],
                                    adjacency_matrix: [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
                                  }
                                })
                              });
                              const result = await response.json();
                              
                              if (result.success) {
                                toast({
                                  title: "모델 테스트 성공",
                                  description: `모델이 ${result.executionTime}ms에 실행되었습니다`,
                                });
                                console.log('🎉 Model test results:', result.results);
                              } else {
                                toast({
                                  title: "모델 테스트 실패",
                                  description: result.error || "알 수 없는 오류가 발생했습니다",
                                  variant: "destructive"
                                });
                                console.error('❌ Model test error:', result.error);
                              }
                            } catch (error) {
                              toast({
                                title: "테스트 요청 실패",
                                description: "모델 실행 서비스에 연결할 수 없습니다",
                                variant: "destructive"
                              });
                              console.error('❌ Test request error:', error);
                            }
                          }}
                          className="w-full"
                          variant="outline"
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          샘플 데이터로 테스트
                        </Button>

                        <Button 
                          onClick={async () => {
                            try {
                              // Get connected input data for this model
                              const connectedInputs = connections.filter(c => c.toNodeId === selectedNodeForDetails.id);
                              
                              if (connectedInputs.length === 0) {
                                toast({
                                  title: "연결된 데이터 없음",
                                  description: "모델에 연결된 입력 데이터가 없습니다. 먼저 데이터 소스나 다른 모델의 출력을 연결해주세요.",
                                  variant: "destructive"
                                });
                                return;
                              }

                              console.log('🔗 Testing AI model with connected data:', selectedNodeForDetails.modelId);
                              console.log('🔗 Connected inputs:', connectedInputs);

                              // Prepare input data from connections
                              const inputData: any = {};
                              let hasValidData = false;

                              for (const connection of connectedInputs) {
                                const sourceNode = nodes.find(n => n.id === connection.fromNodeId);
                                if (sourceNode) {
                                  if (sourceNode.type === 'data-integration') {
                                    // Fetch data from data source
                                    try {
                                      const dataResponse = await fetch(`/api/data-sources/${sourceNode.sourceId}/sample-data`);
                                      if (dataResponse.ok) {
                                        const data = await dataResponse.json();
                                        inputData[connection.targetInputName] = data.sampleData || data;
                                        hasValidData = true;
                                      }
                                    } catch (error) {
                                      console.log('Data source fetch error:', error);
                                    }
                                  } else if (sourceNode.type === 'ai-model') {
                                    // Use previous AI model results
                                    try {
                                      const resultResponse = await fetch(`/api/ai-models/${sourceNode.modelId}/last-result`);
                                      if (resultResponse.ok) {
                                        const resultData = await resultResponse.json();
                                        inputData[connection.targetInputName] = resultData.predictions || resultData;
                                        hasValidData = true;
                                      }
                                    } catch (error) {
                                      console.log('AI model result fetch error:', error);
                                    }
                                  } else if (sourceNode.type === 'view-data') {
                                    // Use view data
                                    try {
                                      const viewResponse = await fetch(`/api/views/${sourceNode.viewId}/data`);
                                      if (viewResponse.ok) {
                                        const viewData = await viewResponse.json();
                                        inputData[connection.targetInputName] = viewData.data || viewData;
                                        hasValidData = true;
                                      }
                                    } catch (error) {
                                      console.log('View data fetch error:', error);
                                    }
                                  }
                                }
                              }

                              if (!hasValidData) {
                                toast({
                                  title: "데이터 로드 실패",
                                  description: "연결된 데이터를 불러올 수 없습니다. 연결된 소스가 유효한지 확인해주세요.",
                                  variant: "destructive"
                                });
                                return;
                              }

                              // Execute model with connected data
                              const response = await fetch(`/api/ai-models/${selectedNodeForDetails.modelId}/execute-with-connections`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  connectedData: inputData,
                                  connections: connectedInputs,
                                  nodeId: selectedNodeForDetails.id
                                })
                              });
                              
                              const result = await response.json();
                              
                              if (result.success) {
                                toast({
                                  title: "연결된 데이터 실행 성공",
                                  description: `모델이 연결된 데이터와 함께 성공적으로 실행되었습니다. 처리 시간: ${result.executionTime}ms`,
                                });
                                console.log('🎉 Connected data execution results:', result.results);
                                
                                // Save the result for potential use by other connected models
                                if (result.results) {
                                  await fetch(`/api/ai-models/${selectedNodeForDetails.modelId}/save-result`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      results: result.results,
                                      executedAt: new Date().toISOString(),
                                      nodeId: selectedNodeForDetails.id
                                    })
                                  });
                                }
                              } else {
                                toast({
                                  title: "연결된 데이터 실행 실패",
                                  description: result.error || "알 수 없는 오류가 발생했습니다",
                                  variant: "destructive"
                                });
                                console.error('❌ Connected data execution error:', result.error);
                              }
                            } catch (error) {
                              toast({
                                title: "연결된 데이터 실행 요청 실패",
                                description: "연결된 데이터로 모델을 실행할 수 없습니다",
                                variant: "destructive"
                              });
                              console.error('❌ Connected data execution request error:', error);
                            }
                          }}
                          className="w-full"
                          disabled={connections.filter(c => c.toNodeId === selectedNodeForDetails?.id).length === 0}
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          연결된 데이터로 실행
                          {connections.filter(c => c.toNodeId === selectedNodeForDetails?.id).length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {connections.filter(c => c.toNodeId === selectedNodeForDetails?.id).length}개 연결됨
                            </Badge>
                          )}
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <div className="font-medium mb-1">Test Requirements:</div>
                        <div>• Python 3.x with PyTorch installed</div>
                        <div>• Model file accessible in uploads directory</div>
                        <div>• Compatible input/output specifications</div>
                      </div>
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
                        <Dialog 
                          open={connectionDialogOpen[`${selectedModelForDetails?.id || selectedNodeForDetails?.id}-${input.id}`] || false}
                          onOpenChange={(open) => setConnectionDialogOpen(prev => ({...prev, [`${selectedModelForDetails?.id || selectedNodeForDetails?.id}-${input.id}`]: open}))}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <Link2 className="w-3 h-3 mr-1" />
                              View Possible Connections
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto z-[9999]" style={{ zIndex: 9999 }}>
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
                                    className="p-3 border border-gray-200 rounded-lg transition-colors hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                                    onClick={() => {
                                      console.log('🔗 Attempting connection:', {
                                        fromNodeId: output.nodeId,
                                        fromOutputId: output.outputId,
                                        toNodeId: selectedModelForDetails?.id || selectedNodeForDetails?.id || '',
                                        toInputId: input.id,
                                        outputDetails: output,
                                        inputDetails: input
                                      });
                                      
                                      // Create the connection when clicked
                                      const success = createConnection(
                                        output.nodeId,
                                        output.outputId,
                                        selectedModelForDetails?.id || selectedNodeForDetails?.id || '',
                                        input.id
                                      );
                                      
                                      if (success) {
                                        // Show success toast
                                        toast({
                                          title: "연결 성공",
                                          description: `${output.nodeName}의 ${output.outputName}을(를) ${input.name}에 연결했습니다.`,
                                          variant: "default",
                                        });
                                        // Close the dialog after successful connection
                                        setConnectionDialogOpen(prev => ({...prev, [`${selectedModelForDetails?.id || selectedNodeForDetails?.id}-${input.id}`]: false}));
                                      } else {
                                        console.error('❌ Connection failed for:', {
                                          fromNodeId: output.nodeId,
                                          fromOutputId: output.outputId,
                                          toNodeId: selectedModelForDetails?.id || selectedNodeForDetails?.id || '',
                                          toInputId: input.id
                                        });
                                        // Show error toast
                                        toast({
                                          title: "연결 실패",
                                          description: "연결을 생성하는데 문제가 발생했습니다. 콘솔에서 자세한 정보를 확인하세요.",
                                          variant: "destructive",
                                        });
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
                                            output.type === 'view-data' ? '#8b5cf6' :
                                            '#f59e0b'
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
                                                output.type === 'view-data' ? '#8b5cf6' :
                                                '#f59e0b',
                                              color:
                                                output.type === 'ai-model' ? '#3b82f6' :
                                                output.type === 'data-integration' ? '#22c55e' :
                                                output.type === 'view-data' ? '#8b5cf6' :
                                                '#f59e0b'
                                            }}
                                          >
                                            {output.type === 'ai-model' ? 'AI Model' :
                                             output.type === 'data-integration' ? 'Data Source' :
                                             output.type === 'view-data' ? 'View' :
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
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs px-3 py-1 hover:bg-blue-100 hover:border-blue-300"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Create the connection when button is clicked
                                            const success = createConnection(
                                              output.nodeId,
                                              output.outputId,
                                              selectedModelForDetails?.id || selectedNodeForDetails?.id || '',
                                              input.id
                                            );
                                            if (success) {
                                              // Show success toast
                                              toast({
                                                title: "연결 성공",
                                                description: `${output.nodeName}의 ${output.outputName}을(를) ${input.name}에 연결했습니다.`,
                                                variant: "default",
                                              });
                                              // Close the dialog after successful connection
                                              setConnectionDialogOpen(prev => ({...prev, [`${selectedModelForDetails?.id || selectedNodeForDetails?.id}-${input.id}`]: false}));
                                            } else {
                                              // Show error toast
                                              toast({
                                                title: "연결 실패",
                                                description: "연결을 생성하는데 문제가 발생했습니다.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        >
                                          <Link2 className="w-3 h-3 mr-1" />
                                          Connect
                                        </Button>
                                      </div>
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
          {(modelConfigFolders as any[]).map((folder) => (
            <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">{folder.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">0 configs</Badge>
                </div>
                <p className="text-sm text-gray-600">{folder.description}</p>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-500 mb-4">
                  Created: {new Date(folder.createdAt || Date.now()).toLocaleDateString()}
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
                {(modelConfigFolders as any[]).find(f => f.id === selectedFolder)?.name}
              </h2>
              <p className="text-gray-600">
                {(modelConfigFolders as any[]).find(f => f.id === selectedFolder)?.description}
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
        <DialogContent className="sm:max-w-md z-[1000]" style={{ zIndex: 1000 }}>
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
                onClick={async () => {
                  try {
                    await createFolderMutation.mutateAsync({
                      name: newFolder.name,
                      description: newFolder.description
                    });
                    toast({ 
                      title: "Success", 
                      description: "Folder created successfully" 
                    });
                    setShowNewFolderDialog(false);
                    setNewFolder({ name: '', description: '' });
                  } catch (error) {
                    toast({ 
                      title: "Error", 
                      description: "Failed to create folder",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!newFolder.name || createFolderMutation.isPending}
                className="flex-1"
              >
                {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
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
        <DialogContent className="sm:max-w-md z-[1000]" style={{ zIndex: 1000 }}>
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
                onClick={async () => {
                  try {
                    const newConfigData = {
                      id: `config-${Date.now()}`,
                      name: newConfig.name,
                      description: newConfig.description,
                      folderId: selectedFolder || null,
                      status: 'draft',
                      nodes: [],
                      connections: []
                    };

                    // Save to server
                    const response = await fetch('/api/model-configurations', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify(newConfigData)
                    });

                    if (response.ok) {
                      // Refresh the configurations list
                      await refetchConfigurations();
                      
                      handleOpenEditor(newConfigData);
                      setShowNewConfigDialog(false);
                      setNewConfig({ name: '', description: '', folderId: '' });
                      
                      toast({
                        title: "Configuration Created",
                        description: `"${newConfig.name}" has been created successfully`,
                      });
                    } else {
                      throw new Error('Failed to create configuration');
                    }
                  } catch (error) {
                    console.error('Error creating configuration:', error);
                    toast({
                      title: "Error",
                      description: "Failed to create configuration. Please try again.",
                      variant: "destructive"
                    });
                  }
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

      {/* Note: Delete functionality now uses browser's native confirm dialog for simplicity and reliability */}

      {/* Configuration Validation Details Modal */}
      <Dialog open={showValidationDetails} onOpenChange={setShowValidationDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto z-[1000]" style={{ zIndex: 1000 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              Configuration Issues
            </DialogTitle>
            <DialogDescription>
              Review and fix the following issues before testing or running your workflow:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {testResults?.details?.errors?.map((error: string, index: number) => (
              <div key={index} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <span className="text-red-600 text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                    {error.includes('input connections') && (
                      <p className="text-xs text-red-600 mt-2">
                        💡 Tip: Drag from a data source or AI model output to this node's input ports
                      </p>
                    )}
                    {error.includes('Final goal') && (
                      <p className="text-xs text-red-600 mt-2">
                        💡 Tip: Add a "Final Goal" node from the canvas menu and connect it to your AI models
                      </p>
                    )}
                    {error.includes('AI model') && error.includes('required') && (
                      <p className="text-xs text-red-600 mt-2">
                        💡 Tip: Add at least one AI model to your workflow to process data
                      </p>
                    )}
                    {error.includes('not connected to any AI models') && (
                      <p className="text-xs text-red-600 mt-2">
                        💡 Tip: Connect this data source to AI model inputs to use the data
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {testResults?.details?.errors?.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Valid!</h3>
                <p className="text-gray-600">Your workflow is configured correctly and ready to run.</p>
              </div>
            )}

            {/* Execution Results Section */}
            {testResults?.details?.executionResults && testResults.details.executionResults.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-600" />
                  Execution Results
                </h4>
                
                {testResults.details.executionResults.map((result: any, index: number) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-green-900">{result.modelName}</h5>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {result.status}
                        </span>
                        <span className="text-xs text-green-600">
                          {result.outputData.processingTime}ms
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Input Data Sources */}
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Input Data Sources</h6>
                        <div className="space-y-1">
                          {result.inputDataSources.map((source: string, idx: number) => (
                            <span key={idx} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Output Predictions */}
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Predictions</h6>
                        <div className="space-y-1 text-xs">
                          {result.outputData.predictions.slice(0, 3).map((pred: any, idx: number) => (
                            <div key={idx} className="bg-white p-2 rounded border border-green-200">
                              <div className="font-mono text-green-700">
                                KPI_X: {pred.KPI_X?.toFixed(2)} | 
                                KPI_Y: {pred.KPI_Y?.toFixed(2)} | 
                                KPI_Z: {pred.KPI_Z?.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Goal Responses Section */}
                    {result.outputData.goalResponses && result.outputData.goalResponses.length > 0 && (
                      <div className="mt-4">
                        <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          Goal Analysis Results
                        </h6>
                        <div className="space-y-3">
                          {result.outputData.goalResponses.map((response: any, idx: number) => (
                            <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                              <div className="flex items-start gap-2 mb-2">
                                <Target className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-purple-900 text-sm mb-1">
                                    {response.goalNodeName}
                                  </div>
                                  <div className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded mb-2">
                                    Request: "{response.userRequest}"
                                  </div>
                                  <div className="text-xs text-gray-700 whitespace-pre-wrap">
                                    {response.aiResponse}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Model Performance */}
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold text-green-700">
                            {(result.outputData.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-green-600">Confidence</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-green-700">
                            {result.outputData.modelPerformance.accuracy.toFixed(3)}
                          </div>
                          <div className="text-xs text-green-600">Accuracy</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-green-700">
                            {result.outputData.modelPerformance.rmse.toFixed(2)}
                          </div>
                          <div className="text-xs text-green-600">RMSE</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => setShowValidationDetails(false)}
              className="flex-1"
            >
              Close
            </Button>
            {testResults?.details?.errors?.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => {
                  setShowValidationDetails(false);
                  // Auto-test again after closing
                  setTimeout(testConfiguration, 500);
                }}
                className="flex-1"
              >
                Test Again
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Connection Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              Field Mapping Configuration
            </DialogTitle>
            <DialogDescription>
              Configure how fields are mapped between connected nodes
            </DialogDescription>
          </DialogHeader>
          
          {selectedConnection && (() => {
            const connection = connections.find(c => c.id === selectedConnection);
            if (!connection || connection.type !== 'block') return null;
            
            const sourceNode = nodes.find(n => n.id === connection.fromNodeId);
            const targetNode = nodes.find(n => n.id === connection.toNodeId);
            
            if (!sourceNode || !targetNode) return null;
            
            return (
              <div className="space-y-6">
                {/* Connection Overview */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                        {sourceNode.type === 'data-input' ? <Database className="w-6 h-6 text-blue-600" /> : <Brain className="w-6 h-6 text-blue-600" />}
                      </div>
                      <div className="text-sm font-medium">{sourceNode.name}</div>
                      <div className="text-xs text-gray-500">{sourceNode.outputs.length} outputs</div>
                    </div>
                    
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                        {targetNode.type === 'ai-model' ? <Brain className="w-6 h-6 text-green-600" /> : <Target className="w-6 h-6 text-green-600" />}
                      </div>
                      <div className="text-sm font-medium">{targetNode.name}</div>
                      <div className="text-xs text-gray-500">{targetNode.inputs.length} inputs</div>
                    </div>
                  </div>
                </div>
                
                {/* Mapping Configuration */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Source Fields */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Circle className="w-3 h-3 text-blue-500" />
                      Source Fields ({sourceNode.outputs.length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {sourceNode.outputs.map((output) => (
                        <div key={output.id} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-blue-500`}></div>
                            <span className="text-sm font-medium">{output.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {output.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Target Fields */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Circle className="w-3 h-3 text-green-500" />
                      Target Fields ({targetNode.inputs.length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {targetNode.inputs.map((input) => (
                        <div key={input.id} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-green-500`}></div>
                            <span className="text-sm font-medium">{input.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {input.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Mapping Rules */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-purple-600" />
                    Field Mappings
                  </h4>
                  
                  <div className="space-y-3">
                    {(connection.mappings || []).map((mapping, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-blue-700">{mapping.sourceField}</span>
                          <span className="text-xs text-blue-600 ml-2">({mapping.sourceType})</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-600" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-green-700">{mapping.targetField}</span>
                          <span className="text-xs text-green-600 ml-2">({mapping.targetType})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedMappings = (connection.mappings || []).filter((_, i) => i !== index);
                            setConnections(prev => prev.map(c => 
                              c.id === selectedConnection 
                                ? { ...c, mappings: updatedMappings }
                                : c
                            ));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {(!connection.mappings || connection.mappings.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm">No field mappings configured yet</p>
                        <p className="text-xs text-gray-400 mt-1">Add mappings to connect specific fields between nodes</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Add New Mapping */}
                  <div className="mt-4 p-3 border border-dashed border-gray-300 rounded-lg">
                    <div className="grid grid-cols-5 gap-3 items-center">
                      <Select 
                        value={selectedConnection ? (() => {
                          const [selectedSourceField, setSelectedSourceField] = React.useState('');
                          return selectedSourceField;
                        })() : ''}
                        onValueChange={(value) => {
                          // Handle source field selection
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Source field" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceNode.outputs.map((output) => (
                            <SelectItem key={output.id} value={output.id}>
                              {output.name} ({output.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                      
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Target field" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetNode.inputs.map((input) => (
                            <SelectItem key={input.id} value={input.id}>
                              {input.name} ({input.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button size="sm" className="w-full" onClick={() => {
                        // Add manual mapping functionality will be implemented
                        toast({
                          title: "Feature Coming Soon",
                          description: "Manual field mapping is being implemented",
                        });
                      }}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                      
                      <Button variant="outline" size="sm" className="w-full" onClick={() => {
                        // Auto-map compatible fields between source and target
                        if (selectedConnection) {
                          const connection = connections.find(c => c.id === selectedConnection);
                          if (connection) {
                            const sourceNode = nodes.find(n => n.id === connection.fromNodeId);
                            const targetNode = nodes.find(n => n.id === connection.toNodeId);
                            
                            if (sourceNode && targetNode) {
                              const autoMappings = [];
                              for (const output of sourceNode.outputs) {
                                for (const input of targetNode.inputs) {
                                  if (output.type === input.type || 
                                      output.name.toLowerCase().includes(input.name.toLowerCase()) ||
                                      input.name.toLowerCase().includes(output.name.toLowerCase())) {
                                    autoMappings.push({
                                      sourceField: output.name,
                                      targetField: input.name,
                                      sourceType: output.type,
                                      targetType: input.type
                                    });
                                    break;
                                  }
                                }
                              }
                              
                              setConnections(prev => prev.map(c => 
                                c.id === selectedConnection 
                                  ? { ...c, mappings: autoMappings }
                                  : c
                              ));
                              
                              toast({
                                title: "Auto-mapping Complete",
                                description: `Created ${autoMappings.length} field mappings`,
                              });
                            }
                          }
                        }
                      }}>
                        Auto Map
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div className="flex justify-between pt-4">
            <Button 
              variant="destructive" 
              onClick={() => {
                if (window.confirm("Delete this block connection? All field mappings will be removed.")) {
                  setConnections(prev => prev.filter(c => c.id !== selectedConnection));
                  setMappingDialogOpen(false);
                  setSelectedConnection(null);
                  toast({
                    title: "Connection Deleted",
                    description: "Block connection and all mappings have been removed",
                  });
                }
              }}
            >
              Delete Connection
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setMappingDialogOpen(false);
                toast({
                  title: "Mappings Saved",
                  description: "Block connection mappings have been saved",
                });
              }}>
                Save Mappings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}