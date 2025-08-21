import { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Database, FileText, Target, Circle, Trash2, Plus } from 'lucide-react';

interface Node {
  id: string;
  type: 'ai-model' | 'data-source' | 'output' | 'transform';
  name: string;
  position: { x: number; y: number };
  config?: any;
  status?: 'connected' | 'disconnected' | 'error';
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

interface SimpleNodeWorkflowProps {
  nodes: Node[];
  connections: Connection[];
  onNodesChange: (nodes: Node[]) => void;
  onConnectionsChange: (connections: Connection[]) => void;
}

export function SimpleNodeWorkflow({ 
  nodes, 
  connections, 
  onNodesChange, 
  onConnectionsChange 
}: SimpleNodeWorkflowProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [previewConnection, setPreviewConnection] = useState<{
    sourceId: string;
    mousePosition: { x: number; y: number };
  } | null>(null);
  const [draggedNode, setDraggedNode] = useState<{
    nodeId: string;
    offset: { x: number; y: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const getNodeIcon = (type: Node['type']) => {
    switch (type) {
      case 'ai-model': return <Brain className="w-5 h-5 text-blue-600" />;
      case 'data-source': return <Database className="w-5 h-5 text-green-600" />;
      case 'output': return <Target className="w-5 h-5 text-red-600" />;
      case 'transform': return <FileText className="w-5 h-5 text-purple-600" />;
      default: return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNodeColor = (type: Node['type']) => {
    switch (type) {
      case 'ai-model': return 'border-blue-500 bg-blue-50';
      case 'data-source': return 'border-green-500 bg-green-50';
      case 'output': return 'border-red-500 bg-red-50';
      case 'transform': return 'border-purple-500 bg-purple-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const handleNodeClick = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (selectedNodeId === null) {
      // First click - select source node
      setSelectedNodeId(nodeId);
      setPreviewConnection({
        sourceId: nodeId,
        mousePosition: { x: event.clientX, y: event.clientY }
      });
    } else if (selectedNodeId === nodeId) {
      // Clicked same node - deselect
      setSelectedNodeId(null);
      setPreviewConnection(null);
    } else {
      // Second click - create connection if not already connected
      const existingConnection = connections.find(
        conn => conn.sourceId === selectedNodeId && conn.targetId === nodeId
      );
      
      if (!existingConnection) {
        const newConnection: Connection = {
          id: `conn-${selectedNodeId}-${nodeId}-${Date.now()}`,
          sourceId: selectedNodeId,
          targetId: nodeId
        };
        onConnectionsChange([...connections, newConnection]);
      }
      
      // Reset selection
      setSelectedNodeId(null);
      setPreviewConnection(null);
    }
  }, [selectedNodeId, connections, onConnectionsChange]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (previewConnection) {
      setPreviewConnection(prev => prev ? {
        ...prev,
        mousePosition: { x: event.clientX, y: event.clientY }
      } : null);
    }

    if (draggedNode && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = event.clientX - containerRect.left - draggedNode.offset.x;
      const newY = event.clientY - containerRect.top - draggedNode.offset.y;
      
      const updatedNodes = nodes.map(node => 
        node.id === draggedNode.nodeId 
          ? { ...node, position: { x: newX, y: newY } }
          : node
      );
      onNodesChange(updatedNodes);
    }
  }, [previewConnection, draggedNode, nodes, onNodesChange]);

  const handleMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const offset = {
      x: event.clientX - containerRect.left - node.position.x,
      y: event.clientY - containerRect.top - node.position.y
    };

    setDraggedNode({ nodeId, offset });
  }, [nodes]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setPreviewConnection(null);
  }, []);

  const deleteConnection = useCallback((connectionId: string) => {
    onConnectionsChange(connections.filter(conn => conn.id !== connectionId));
  }, [connections, onConnectionsChange]);

  const deleteNode = useCallback((nodeId: string) => {
    // Remove node and all its connections
    onNodesChange(nodes.filter(node => node.id !== nodeId));
    onConnectionsChange(connections.filter(conn => 
      conn.sourceId !== nodeId && conn.targetId !== nodeId
    ));
  }, [nodes, connections, onNodesChange, onConnectionsChange]);

  const addNode = useCallback((type: Node['type']) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      name: `${type} ${nodes.filter(n => n.type === type).length + 1}`,
      position: { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 }
    };
    onNodesChange([...nodes, newNode]);
  }, [nodes, onNodesChange]);

  // Calculate connection paths
  const connectionPaths = useMemo(() => {
    return connections.map(conn => {
      const sourceNode = nodes.find(n => n.id === conn.sourceId);
      const targetNode = nodes.find(n => n.id === conn.targetId);
      
      if (!sourceNode || !targetNode) return null;

      const startX = sourceNode.position.x + 150; // Right edge of source node
      const startY = sourceNode.position.y + 40;  // Center height
      const endX = targetNode.position.x;         // Left edge of target node
      const endY = targetNode.position.y + 40;    // Center height

      const controlPoint1X = startX + (endX - startX) / 3;
      const controlPoint2X = startX + 2 * (endX - startX) / 3;

      return {
        id: conn.id,
        path: `M ${startX} ${startY} C ${controlPoint1X} ${startY}, ${controlPoint2X} ${endY}, ${endX} ${endY}`,
        midX: (startX + endX) / 2,
        midY: (startY + endY) / 2
      };
    }).filter((path): path is NonNullable<typeof path> => path !== null);
  }, [connections, nodes]);

  // Calculate preview connection path
  const previewPath = useMemo(() => {
    if (!previewConnection || !containerRef.current) return null;

    const sourceNode = nodes.find(n => n.id === previewConnection.sourceId);
    if (!sourceNode) return null;

    const containerRect = containerRef.current.getBoundingClientRect();
    const startX = sourceNode.position.x + 150;
    const startY = sourceNode.position.y + 40;
    const endX = previewConnection.mousePosition.x - containerRect.left;
    const endY = previewConnection.mousePosition.y - containerRect.top;

    const controlPoint1X = startX + (endX - startX) / 3;
    const controlPoint2X = startX + 2 * (endX - startX) / 3;

    return `M ${startX} ${startY} C ${controlPoint1X} ${startY}, ${controlPoint2X} ${endY}, ${endX} ${endY}`;
  }, [previewConnection, nodes]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
        <span className="text-sm font-medium mr-4">Add Node:</span>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => addNode('ai-model')}
          className="flex items-center gap-2"
          data-testid="add-ai-model-node"
        >
          <Brain className="w-4 h-4" />
          AI Model
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => addNode('data-source')}
          className="flex items-center gap-2"
          data-testid="add-data-source-node"
        >
          <Database className="w-4 h-4" />
          Data Source
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => addNode('transform')}
          className="flex items-center gap-2"
          data-testid="add-transform-node"
        >
          <FileText className="w-4 h-4" />
          Transform
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => addNode('output')}
          className="flex items-center gap-2"
          data-testid="add-output-node"
        >
          <Target className="w-4 h-4" />
          Output
        </Button>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-gray-100 overflow-hidden cursor-default"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
        data-testid="workflow-canvas"
      >
        {/* Background grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connectionPaths.map((conn) => (
            <g key={conn.id}>
              <path
                d={conn.path}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            </g>
          ))}
          
          {/* Preview connection */}
          {previewPath && (
            <path
              d={previewPath}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              opacity="0.7"
            />
          )}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#3b82f6"
              />
            </marker>
          </defs>
        </svg>

        {/* Connection delete buttons */}
        {connectionPaths.map((conn) => (
          <button
            key={`delete-${conn.id}`}
            className="absolute w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors pointer-events-auto"
            style={{
              left: conn.midX - 12,
              top: conn.midY - 12,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              deleteConnection(conn.id);
            }}
            data-testid={`delete-connection-${conn.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <Card
            key={node.id}
            className={`absolute w-36 cursor-pointer transition-all duration-200 select-none ${
              getNodeColor(node.type)
            } ${
              selectedNodeId === node.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
            }`}
            style={{
              left: node.position.x,
              top: node.position.y,
              zIndex: draggedNode?.nodeId === node.id ? 1000 : 1
            }}
            onClick={(e) => handleNodeClick(node.id, e)}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            data-testid={`node-${node.id}`}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getNodeIcon(node.type)}
                  <span className="text-xs font-medium truncate">
                    {node.name}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  data-testid={`delete-node-${node.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xs text-gray-600 capitalize">
                {node.type.replace('-', ' ')}
              </div>
              <div className="text-xs mt-1">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  node.status === 'connected' ? 'bg-green-500' : 
                  node.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                {node.status || 'disconnected'}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Instructions */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Create Your Workflow</p>
              <p className="text-sm">Add nodes using the toolbar above</p>
            </div>
          </div>
        )}

        {selectedNodeId && (
          <div className="absolute top-4 left-4 bg-blue-100 border border-blue-300 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">
              Connection Mode Active
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Click another node to create a connection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}