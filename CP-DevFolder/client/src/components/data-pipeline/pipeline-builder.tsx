import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, Play, Download, Upload } from 'lucide-react';
import { NodePalette } from './node-palette';
import { CanvasArea } from './canvas-area';
import { PropertiesPanel } from './properties-panel';
import { PipelineNode, PipelineConnection, Pipeline } from './types';

export function PipelineBuilder() {
  const [pipeline, setPipeline] = useState<Pipeline>({
    id: '',
    name: 'New Pipeline',
    nodes: [],
    connections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: PipelineNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      position,
      config: getDefaultConfig(nodeType),
      inputs: [],
      outputs: []
    };
    
    setPipeline((prev: Pipeline) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<PipelineNode>) => {
    setPipeline((prev: Pipeline) => ({
      ...prev,
      nodes: prev.nodes.map((node: PipelineNode) => 
        node.id === nodeId ? { ...node, ...updates } : node
      ),
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setPipeline((prev: Pipeline) => ({
      ...prev,
      nodes: prev.nodes.filter((node: PipelineNode) => node.id !== nodeId),
      connections: prev.connections.filter((conn: PipelineConnection) => 
        conn.sourceId !== nodeId && conn.targetId !== nodeId
      ),
      updatedAt: new Date().toISOString()
    }));
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const addConnection = useCallback((connection: Omit<PipelineConnection, 'id'>) => {
    const newConnection: PipelineConnection = {
      ...connection,
      id: `conn_${Date.now()}`
    };
    
    setPipeline((prev: Pipeline) => ({
      ...prev,
      connections: [...prev.connections, newConnection],
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const validatePipeline = useCallback(async () => {
    setIsValidating(true);
    
    try {
      // DAG 검증 로직
      const errors = [];
      
      // 1. 순환 참조 검사
      if (hasCycle(pipeline.nodes, pipeline.connections)) {
        errors.push('Pipeline contains circular dependencies');
      }
      
      // 2. 고립된 노드 검사
      const isolatedNodes = findIsolatedNodes(pipeline.nodes, pipeline.connections);
      if (isolatedNodes.length > 0) {
        errors.push(`Isolated nodes found: ${isolatedNodes.join(', ')}`);
      }
      
      // 3. 필수 설정 검사
      const invalidNodes = pipeline.nodes.filter((node: PipelineNode) => !isNodeConfigValid(node));
      if (invalidNodes.length > 0) {
        errors.push(`Invalid configuration in nodes: ${invalidNodes.map((n: PipelineNode) => n.id).join(', ')}`);
      }
      
      if (errors.length > 0) {
        alert('Validation errors:\n' + errors.join('\n'));
        return false;
      }
      
      alert('Pipeline validation successful!');
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [pipeline]);

  const savePipeline = useCallback(async () => {
    if (await validatePipeline()) {
      // API 호출로 파이프라인 저장
      console.log('Saving pipeline:', pipeline);
      alert('Pipeline saved successfully!');
    }
  }, [pipeline, validatePipeline]);

  const runPipeline = useCallback(async () => {
    if (await validatePipeline()) {
      // API 호출로 파이프라인 실행
      console.log('Running pipeline:', pipeline);
      alert('Pipeline execution started!');
    }
  }, [pipeline, validatePipeline]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* 헤더 툴바 */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pipeline Builder</h1>
              <p className="text-sm text-gray-600 mt-1">
                Design JSON-DAG based data processing pipelines
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={savePipeline}
                data-testid="save-pipeline"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button 
                size="sm" 
                onClick={runPipeline}
                disabled={isValidating}
                data-testid="run-pipeline"
              >
                <Play className="w-4 h-4 mr-2" />
                {isValidating ? 'Validating...' : 'Run'}
              </Button>
            </div>
          </div>
        </div>

        {/* 메인 작업 영역 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 노드 팔레트 */}
          <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
            <NodePalette onAddNode={addNode} />
          </div>

          {/* 캔버스 영역 */}
          <div className="flex-1 relative">
            <CanvasArea
              pipeline={pipeline}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
              onNodeUpdate={updateNode}
              onNodeDelete={deleteNode}
              onConnectionAdd={addConnection}
              onNodeAdd={addNode}
            />
          </div>

          {/* 속성 패널 */}
          <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
            <PropertiesPanel
              selectedNode={selectedNode}
              onNodeUpdate={updateNode}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

// 헬퍼 함수들
function getDefaultConfig(nodeType: string): Record<string, any> {
  switch (nodeType) {
    case 'source.fileDrop':
      return { path: '', hasHeader: true, delimiter: ',' };
    case 'transform.select':
      return { columns: [] };
    case 'transform.filter':
      return { expr: '' };
    case 'validate.null':
      return { columns: [] };
    case 'sink.featureCache':
      return { name: '', ttlHours: 24 };
    default:
      return {};
  }
}

function hasCycle(nodes: PipelineNode[], connections: PipelineConnection[]): boolean {
  const graph = new Map<string, string[]>();
  
  // 그래프 구축
  nodes.forEach(node => graph.set(node.id, []));
  connections.forEach(conn => {
    const targets = graph.get(conn.sourceId) || [];
    targets.push(conn.targetId);
    graph.set(conn.sourceId, targets);
  });
  
  // DFS로 순환 검사
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }
  
  return false;
}

function findIsolatedNodes(nodes: PipelineNode[], connections: PipelineConnection[]): string[] {
  const connectedNodes = new Set<string>();
  connections.forEach(conn => {
    connectedNodes.add(conn.sourceId);
    connectedNodes.add(conn.targetId);
  });
  
  return nodes
    .filter(node => !connectedNodes.has(node.id) && nodes.length > 1)
    .map(node => node.id);
}

function isNodeConfigValid(node: PipelineNode): boolean {
  switch (node.type) {
    case 'source.fileDrop':
      return !!(node.config.path);
    case 'transform.select':
      return Array.isArray(node.config.columns) && node.config.columns.length > 0;
    case 'transform.filter':
      return !!(node.config.expr);
    case 'validate.null':
      return Array.isArray(node.config.columns) && node.config.columns.length > 0;
    case 'sink.featureCache':
      return !!(node.config.name) && typeof node.config.ttlHours === 'number';
    default:
      return true;
  }
}