import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Zap,
  Database,
  Workflow,
  Brain,
  ChevronLeft,
  MoreVertical,
  Circle
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

// Sample AI models with input/output schemas
const availableAIModels = [
  {
    id: '1',
    name: 'Assembly Line Quality Classifier',
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
    inputs: [
      { id: 'surface_image', name: 'Surface Image', type: 'image' as const },
      { id: 'material_type', name: 'Material Type', type: 'string' as const }
    ],
    outputs: [
      { id: 'defect_detected', name: 'Defect Detected', type: 'boolean' as const },
      { id: 'defect_location', name: 'Defect Location', type: 'array' as const }
    ]
  }
];

const dataIntegrationSources = [
  { id: 'erp-data', name: 'ERP Production Data', type: 'object' },
  { id: 'sensor-data', name: 'IoT Sensor Data', type: 'array' },
  { id: 'quality-metrics', name: 'Quality Metrics', type: 'object' }
];

const automationTriggers = [
  { id: 'schedule-trigger', name: 'Scheduled Trigger', type: 'object' },
  { id: 'event-trigger', name: 'Event Trigger', type: 'object' },
  { id: 'api-trigger', name: 'API Trigger', type: 'object' }
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
        newNode = {
          id,
          type,
          name: data?.name || 'Data Input',
          position: addNodePosition,
          inputs: [],
          outputs: [{
            id: `${id}-output-data`,
            name: 'Data Output',
            type: data?.type || 'object'
          }],
          status: 'ready',
          width: 160,
          height: 80
        };
        break;

      case 'automation-input':
        newNode = {
          id,
          type,
          name: data?.name || 'Automation Trigger',
          position: addNodePosition,
          inputs: [],
          outputs: [{
            id: `${id}-output-trigger`,
            name: 'Trigger Output',
            type: data?.type || 'object'
          }],
          status: 'ready',
          width: 160,
          height: 80
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
                Run Workflow
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-gray-900">
          <div
            ref={canvasRef}
            className="w-full h-full relative cursor-crosshair"
            onContextMenu={handleCanvasRightClick}
            onClick={() => setShowAddNodeMenu(false)}
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
                    <Circle className={`w-3 h-3 ${
                      node.status === 'ready' ? 'text-green-400' :
                      node.status === 'running' ? 'text-yellow-400' :
                      'text-red-400'
                    }`} />
                  </div>
                </div>

                {/* Node Body */}
                <div className="p-3 space-y-1">
                  {/* Inputs */}
                  {node.inputs.map((input, index) => (
                    <div key={input.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border-2 cursor-pointer"
                          style={{ 
                            backgroundColor: input.connected ? getTypeColor(input.type) : 'transparent',
                            borderColor: getTypeColor(input.type)
                          }}
                          onClick={() => {
                            if (connecting && connecting.type === input.type) {
                              handleConnectionEnd(node.id, input.id, input.type);
                            }
                          }}
                        />
                        <span className="text-gray-300">{input.name}</span>
                      </div>
                    </div>
                  ))}

                  {/* Outputs */}
                  {node.outputs.map((output, index) => (
                    <div key={output.id} className="flex items-center justify-end text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">{output.name}</span>
                        <div
                          className="w-3 h-3 rounded-full cursor-pointer"
                          style={{ backgroundColor: getTypeColor(output.type) }}
                          onClick={() => handleConnectionStart(node.id, output.id, output.type)}
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

                  {/* Data Sources */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Data Integration</div>
                    {dataIntegrationSources.map(source => (
                      <button
                        key={source.id}
                        className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                        onClick={() => createNode('data-input', { name: source.name, type: source.type })}
                      >
                        {source.name}
                      </button>
                    ))}
                  </div>

                  {/* Automation */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Automation</div>
                    {automationTriggers.map(trigger => (
                      <button
                        key={trigger.id}
                        className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                        onClick={() => createNode('automation-input', { name: trigger.name, type: trigger.type })}
                      >
                        {trigger.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
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