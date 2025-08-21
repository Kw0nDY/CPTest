import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  Monitor,
  Brain,
  Workflow,
  Plus,
  Link2,
  Play,
  Settings,
  Save,
  Trash2,
  Eye,
  CheckCircle,
  Circle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface NodePosition {
  x: number;
  y: number;
}

interface WorkflowNode {
  id: string;
  type: 'data-source' | 'view' | 'ai-model' | 'ai-result';
  name: string;
  position: NodePosition;
  data: any;
  inputs?: Array<{
    id: string;
    name: string;
    type: string;
    connected?: boolean;
  }>;
  outputs?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface NodeConnection {
  id: string;
  sourceNodeId: string;
  sourceOutputId: string;
  targetNodeId: string;
  targetInputId: string;
}

interface SimpleNodeWorkflowProps {
  configurationId?: string;
  onSave?: (workflow: any) => void;
}

export function SimpleNodeWorkflow({ configurationId, onSave }: SimpleNodeWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [showConnectionsDialog, setShowConnectionsDialog] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<NodePosition>({ x: 0, y: 0 });

  // Get available data sources for adding nodes
  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/data-sources'],
    queryFn: () => apiRequest('/api/data-sources')
  });

  const { data: views = [] } = useQuery({
    queryKey: ['/api/views'],
    queryFn: () => apiRequest('/api/views')
  });

  const { data: aiModels = [] } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: () => apiRequest('/api/ai-models')
  });

  const { data: aiResults = [] } = useQuery({
    queryKey: ['/api/ai-model-results'],
    queryFn: () => apiRequest('/api/ai-model-results')
  });

  // Get possible connections for selected node
  const { data: possibleConnections, refetch: refetchConnections } = useQuery({
    queryKey: ['/api/ai-models', selectedNode, 'possible-connections'],
    queryFn: () => selectedNode ? apiRequest(`/api/ai-models/${selectedNode}/possible-connections`) : null,
    enabled: false
  });

  const addNodeToCanvas = useCallback((nodeData: any, nodeType: string) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType as any,
      name: nodeData.name,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: nodeData,
      inputs: nodeType === 'ai-model' ? [
        { id: 'input-1', name: 'Data Input', type: 'any' },
        { id: 'input-2', name: 'Parameters', type: 'any' }
      ] : [],
      outputs: nodeType === 'data-source' ? 
        nodeData.columns?.map((col: any, index: number) => ({
          id: `output-${index}`,
          name: col.name,
          type: col.type || 'string'
        })) || [{ id: 'output-1', name: 'Data', type: 'any' }]
        : [{ id: 'output-1', name: 'Output', type: 'any' }]
    };

    setNodes(prev => [...prev, newNode]);
    setShowAddNodeDialog(false);
    toast({
      title: "노드 추가됨",
      description: `${nodeData.name} 노드가 워크플로우에 추가되었습니다.`
    });
  }, [toast]);

  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const nodeElement = event.currentTarget as HTMLElement;
      const nodeRect = nodeElement.getBoundingClientRect();
      setDraggedNode(nodeId);
      setDragOffset({
        x: event.clientX - nodeRect.left,
        y: event.clientY - nodeRect.top
      });
    }
    event.preventDefault();
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (draggedNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = event.clientX - rect.left - dragOffset.x;
      const newY = event.clientY - rect.top - dragOffset.y;

      setNodes(prev => 
        prev.map(node => 
          node.id === draggedNode 
            ? { ...node, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
            : node
        )
      );
    }
  }, [draggedNode, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleViewPossibleConnections = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.type === 'ai-model') {
      setSelectedNode(nodeId);
      refetchConnections();
      setShowConnectionsDialog(true);
    }
  }, [nodes, refetchConnections]);

  const createConnection = useCallback((sourceNodeId: string, sourceOutputId: string, targetNodeId: string, targetInputId: string) => {
    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newConnection: NodeConnection = {
      id: connectionId,
      sourceNodeId,
      sourceOutputId,
      targetNodeId,
      targetInputId
    };

    setConnections(prev => [...prev, newConnection]);
    
    // Mark target input as connected
    setNodes(prev => 
      prev.map(node => 
        node.id === targetNodeId
          ? {
              ...node,
              inputs: node.inputs?.map(input => 
                input.id === targetInputId 
                  ? { ...input, connected: true }
                  : input
              ) || []
            }
          : node
      )
    );

    toast({
      title: "연결 생성됨",
      description: "노드 간 연결이 성공적으로 생성되었습니다."
    });
    
    setShowConnectionsDialog(false);
  }, [toast]);

  const deleteConnection = useCallback((connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      setConnections(prev => prev.filter(c => c.id !== connectionId));
      
      // Mark target input as disconnected
      setNodes(prev => 
        prev.map(node => 
          node.id === connection.targetNodeId
            ? {
                ...node,
                inputs: node.inputs?.map(input => 
                  input.id === connection.targetInputId
                    ? { ...input, connected: false }
                    : input
                ) || []
              }
            : node
        )
      );
    }
  }, [connections]);

  const renderConnectionLine = useCallback((connection: NodeConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connection.targetNodeId);
    
    if (!sourceNode || !targetNode) return null;

    const sourceX = sourceNode.position.x + 200; // Node width
    const sourceY = sourceNode.position.y + 50;  // Node height / 2
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + 50;

    return (
      <line
        key={connection.id}
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        stroke="#3b82f6"
        strokeWidth="2"
        markerEnd="url(#arrowhead)"
        className="connection-line"
      />
    );
  }, [nodes]);

  const renderNode = useCallback((node: WorkflowNode) => {
    const getNodeIcon = () => {
      switch (node.type) {
        case 'data-source': return <Database className="w-5 h-5" />;
        case 'view': return <Monitor className="w-5 h-5" />;
        case 'ai-model': return <Brain className="w-5 h-5" />;
        case 'ai-result': return <Zap className="w-5 h-5" />;
        default: return <Workflow className="w-5 h-5" />;
      }
    };

    const getNodeColor = () => {
      switch (node.type) {
        case 'data-source': return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
        case 'view': return 'border-green-500 bg-green-50 dark:bg-green-950';
        case 'ai-model': return 'border-purple-500 bg-purple-50 dark:bg-purple-950';
        case 'ai-result': return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
        default: return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
      }
    };

    return (
      <div
        key={node.id}
        className={`absolute w-48 p-3 border-2 rounded-lg cursor-move ${getNodeColor()} ${
          selectedNode === node.id ? 'ring-2 ring-blue-400' : ''
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          zIndex: selectedNode === node.id ? 10 : 1
        }}
        onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
        onClick={() => setSelectedNode(node.id)}
        data-testid={`node-${node.type}-${node.id}`}
      >
        <div className="flex items-center gap-2 mb-2">
          {getNodeIcon()}
          <span className="font-medium text-sm truncate">{node.name}</span>
        </div>
        
        <Badge variant="outline" className="text-xs mb-2">
          {node.type}
        </Badge>

        {/* Input ports */}
        {node.inputs && node.inputs.length > 0 && (
          <div className="space-y-1 mb-2">
            <div className="text-xs text-muted-foreground">Inputs:</div>
            {node.inputs.map((input) => (
              <div key={input.id} className="flex items-center gap-1 text-xs">
                <Circle 
                  className={`w-2 h-2 ${input.connected ? 'fill-green-500 text-green-500' : 'text-gray-300'}`}
                />
                <span>{input.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Output ports */}
        {node.outputs && node.outputs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Outputs:</div>
            {node.outputs.slice(0, 3).map((output) => (
              <div key={output.id} className="flex items-center gap-1 text-xs">
                <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                <span className="truncate">{output.name}</span>
              </div>
            ))}
            {node.outputs.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{node.outputs.length - 3} more
              </div>
            )}
          </div>
        )}

        {/* Node actions */}
        {selectedNode === node.id && (
          <div className="flex gap-1 mt-2">
            {node.type === 'ai-model' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewPossibleConnections(node.id);
                }}
                data-testid={`button-view-connections-${node.id}`}
              >
                <Link2 className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setNodes(prev => prev.filter(n => n.id !== node.id));
                setConnections(prev => prev.filter(c => 
                  c.sourceNodeId !== node.id && c.targetNodeId !== node.id
                ));
              }}
              data-testid={`button-delete-${node.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }, [selectedNode, handleNodeMouseDown, handleViewPossibleConnections]);

  const renderPossibleConnectionsDialog = () => {
    const selectedNodeData = nodes.find(n => n.id === selectedNode);
    if (!selectedNodeData || !possibleConnections) return null;

    const allConnections = [
      ...possibleConnections.dataSources || [],
      ...possibleConnections.views || [],
      ...possibleConnections.aiResults || [],
      ...possibleConnections.aiModels || []
    ];

    return (
      <Dialog open={showConnectionsDialog} onOpenChange={setShowConnectionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              {selectedNodeData.name}에 연결 가능한 소스
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {allConnections.map((connection) => (
                <Card key={connection.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {connection.type === 'data-source' && <Database className="w-5 h-5 text-blue-500" />}
                    {connection.type === 'view' && <Monitor className="w-5 h-5 text-green-500" />}
                    {connection.type === 'ai-result' && <Brain className="w-5 h-5 text-purple-500" />}
                    {connection.type === 'ai-model' && <Workflow className="w-5 h-5 text-orange-500" />}
                    
                    <div>
                      <h4 className="font-medium">{connection.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {connection.type}
                      </Badge>
                    </div>
                  </div>
                  
                  {connection.outputs && connection.outputs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        사용 가능한 출력:
                      </p>
                      <div className="grid gap-2">
                        {connection.outputs.map((output) => (
                          <div
                            key={output.id}
                            className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              // Find the source node in canvas or add it
                              let sourceNode = nodes.find(n => n.data.id === connection.id);
                              if (!sourceNode) {
                                // Add the source node to canvas first
                                addNodeToCanvas(connection, connection.type);
                                sourceNode = nodes[nodes.length - 1]; // Get the just added node
                              }
                              
                              // Create connection to the first available input of target node
                              if (sourceNode && selectedNodeData.inputs && selectedNodeData.inputs.length > 0) {
                                const availableInput = selectedNodeData.inputs.find(input => !input.connected);
                                if (availableInput) {
                                  createConnection(
                                    sourceNode.id,
                                    output.id,
                                    selectedNode!,
                                    availableInput.id
                                  );
                                }
                              }
                            }}
                            data-testid={`connection-option-${output.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Circle className="w-3 h-3 fill-current text-muted-foreground" />
                              <span className="text-sm">{output.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {output.type}
                              </Badge>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              
              {allConnections.length === 0 && (
                <div className="text-center py-8">
                  <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    연결 가능한 데이터 소스가 없습니다.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="w-full h-96 relative">
      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="w-full h-full border rounded-lg bg-grid-pattern overflow-hidden relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        data-testid="workflow-canvas"
      >
        {/* Connection lines SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#3b82f6"
              />
            </marker>
          </defs>
          {connections.map(renderConnectionLine)}
        </svg>

        {/* Nodes */}
        {nodes.map(renderNode)}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Workflow className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium mb-2">시각적 워크플로우 생성</p>
                <p className="text-muted-foreground mb-4">
                  노드를 추가하여 AI 모델 워크플로우를 구성하세요
                </p>
                <Button onClick={() => setShowAddNodeDialog(true)} data-testid="button-add-first-node">
                  <Plus className="w-4 h-4 mr-2" />
                  첫 번째 노드 추가
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          size="sm"
          onClick={() => setShowAddNodeDialog(true)}
          data-testid="button-add-node"
        >
          <Plus className="w-4 h-4 mr-1" />
          노드 추가
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (onSave) {
              onSave({ nodes, connections });
              toast({
                title: "워크플로우 저장됨",
                description: "워크플로우 구성이 저장되었습니다."
              });
            }
          }}
          data-testid="button-save-workflow"
        >
          <Save className="w-4 h-4 mr-1" />
          저장
        </Button>
      </div>

      {/* Add Node Dialog */}
      <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>노드 추가</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Data Sources */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                데이터 소스
              </h3>
              <div className="grid gap-2">
                {dataSources.map((source: any) => (
                  <Card 
                    key={source.id} 
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => addNodeToCanvas(source, 'data-source')}
                    data-testid={`add-node-data-source-${source.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{source.name}</span>
                      <Badge variant="outline">Data Source</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Views */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-green-500" />
                뷰
              </h3>
              <div className="grid gap-2">
                {views.map((view: any) => (
                  <Card 
                    key={view.id} 
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => addNodeToCanvas(view, 'view')}
                    data-testid={`add-node-view-${view.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{view.name}</span>
                      <Badge variant="outline">View</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* AI Models */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                AI 모델
              </h3>
              <div className="grid gap-2">
                {aiModels.map((model: any) => (
                  <Card 
                    key={model.id} 
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => addNodeToCanvas(model, 'ai-model')}
                    data-testid={`add-node-ai-model-${model.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{model.name}</span>
                      <Badge variant="outline">AI Model</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Possible Connections Dialog */}
      {renderPossibleConnectionsDialog()}
    </div>
  );
}

export default SimpleNodeWorkflow;