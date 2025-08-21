import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, 
  Monitor, 
  Brain, 
  Target, 
  Plus, 
  Settings, 
  Save,
  Trash2,
  Link2,
  Eye
} from 'lucide-react';

interface ModelConfigurationTabProps {
  configurationId: string;
  onSave?: (workflow: any) => void;
}

// Node types and interfaces
interface NodeData {
  id: string;
  name: string;
  type: 'data-source' | 'view' | 'ai-model' | 'final-goal';
  position: { x: number; y: number };
  config?: any;
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: string;
  targetPort: string;
}

export function ModelConfigurationTab({ configurationId, onSave }: ModelConfigurationTabProps) {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);

  // Get available data sources, views, and AI models
  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/data-sources']
  });

  const { data: views = [] } = useQuery({
    queryKey: ['/api/views'] 
  });

  const { data: aiModels = [] } = useQuery({
    queryKey: ['/api/ai-models']
  });

  // Initialize with Final Goal node
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes([{
        id: 'final-goal-1',
        name: 'Final Goal',
        type: 'final-goal',
        position: { x: 400, y: 200 },
        config: {
          description: 'Final goal of the workflow',
          outputFormat: 'json'
        }
      }]);
    }
  }, [nodes.length]);

  const handleDragStart = (e: React.DragEvent, item: any, type: string) => {
    setDraggedItem({ ...item, nodeType: type });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode: NodeData = {
      id: `${draggedItem.nodeType}-${Date.now()}`,
      name: draggedItem.name,
      type: draggedItem.nodeType,
      position: { x, y },
      config: {}
    };

    setNodes(prev => [...prev, newNode]);
    setDraggedItem(null);
  };

  const handleNodeClick = (node: NodeData) => {
    setSelectedNode(node);
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleSave = () => {
    const workflow = {
      nodes,
      connections,
      configurationId
    };
    
    onSave?.(workflow);
    toast({
      title: "워크플로우 저장됨",
      description: "구성이 성공적으로 저장되었습니다."
    });
  };

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Left Panel - Available Components */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Components</h3>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          {/* Data Sources */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 text-gray-300 flex items-center">
              <Database className="w-4 h-4 mr-2" />
              Data Sources
            </h4>
            <div className="space-y-2">
              {dataSources.map((source: any) => (
                <div
                  key={source.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, source, 'data-source')}
                  className="p-3 bg-gray-700 rounded-md cursor-move hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{source.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{source.type}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Views */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 text-gray-300 flex items-center">
              <Monitor className="w-4 h-4 mr-2" />
              Views
            </h4>
            <div className="space-y-2">
              {views.map((view: any) => (
                <div
                  key={view.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, view, 'view')}
                  className="p-3 bg-gray-700 rounded-md cursor-move hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-green-400" />
                    <span className="text-sm">{view.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{view.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Models */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 text-gray-300 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              AI Models
            </h4>
            <div className="space-y-2">
              {aiModels.map((model: any) => (
                <div
                  key={model.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, model, 'ai-model')}
                  className="p-3 bg-gray-700 rounded-md cursor-move hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">{model.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{model.modelType}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Center Panel - Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
          <h3 className="text-lg font-semibold">Workflow Canvas</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
        
        <div
          className="flex-1 relative bg-gray-900 overflow-hidden"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Render Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedNode?.id === node.id
                  ? 'border-blue-400 bg-gray-700'
                  : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
              }`}
              style={{
                left: node.position.x,
                top: node.position.y,
                minWidth: '150px'
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {node.type === 'data-source' && <Database className="w-4 h-4 text-blue-400" />}
                  {node.type === 'view' && <Monitor className="w-4 h-4 text-green-400" />}
                  {node.type === 'ai-model' && <Brain className="w-4 h-4 text-purple-400" />}
                  {node.type === 'final-goal' && <Target className="w-4 h-4 text-orange-400" />}
                  <span className="text-sm font-medium">{node.name}</span>
                </div>
                {node.type !== 'final-goal' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeDelete(node.id);
                    }}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              
              <Badge variant="outline" className="text-xs">
                {node.type}
              </Badge>
              
              {/* Connection ports */}
              <div className="flex justify-between mt-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full border-2 border-gray-300"></div>
                <div className="w-3 h-3 bg-gray-500 rounded-full border-2 border-gray-300"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Properties</h3>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Node Name</Label>
                <Input
                  value={selectedNode.name}
                  onChange={(e) => {
                    setSelectedNode(prev => prev ? { ...prev, name: e.target.value } : null);
                    setNodes(prev => prev.map(n => 
                      n.id === selectedNode.id ? { ...n, name: e.target.value } : n
                    ));
                  }}
                  className="mt-1 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Node Type</Label>
                <Input
                  value={selectedNode.type}
                  disabled
                  className="mt-1 bg-gray-700 border-gray-600 text-gray-400"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Position</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    placeholder="X"
                    value={selectedNode.position.x}
                    disabled
                    className="bg-gray-700 border-gray-600 text-gray-400"
                  />
                  <Input
                    placeholder="Y"
                    value={selectedNode.position.y}
                    disabled
                    className="bg-gray-700 border-gray-600 text-gray-400"
                  />
                </div>
              </div>
              
              {selectedNode.type === 'final-goal' && (
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea
                    value={selectedNode.config?.description || ''}
                    onChange={(e) => {
                      setSelectedNode(prev => prev ? {
                        ...prev,
                        config: { ...prev.config, description: e.target.value }
                      } : null);
                      setNodes(prev => prev.map(n => 
                        n.id === selectedNode.id ? {
                          ...n,
                          config: { ...n.config, description: e.target.value }
                        } : n
                      ));
                    }}
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    placeholder="Describe the final goal..."
                  />
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-700">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleNodeClick(selectedNode)}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  View Connections
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-8">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Select a node to edit its properties</p>
              <p className="text-xs mt-2">Drag components from the left panel to add them to the canvas</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}