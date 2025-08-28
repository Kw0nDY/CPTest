import React, { useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { PipelineNode, PipelineConnection, Pipeline } from './types';
import { CanvasNode } from './canvas-node';
import { ConnectionLine } from './connection-line';

interface CanvasAreaProps {
  pipeline: Pipeline;
  selectedNode: PipelineNode | null;
  onNodeSelect: (node: PipelineNode | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<PipelineNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onConnectionAdd: (connection: Omit<PipelineConnection, 'id'>) => void;
  onNodeAdd: (nodeType: string, position: { x: number; y: number }) => void;
}

export function CanvasArea({
  pipeline,
  selectedNode,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
  onConnectionAdd,
  onNodeAdd
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop({
    accept: 'pipeline-node',
    drop: (item: { nodeType: string }, monitor) => {
      const clientOffset = monitor.getClientOffset();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      
      if (clientOffset && canvasRect) {
        const position = {
          x: clientOffset.x - canvasRect.left - 96, // 노드 폭의 절반만큼 조정
          y: clientOffset.y - canvasRect.top - 40   // 노드 높이의 절반만큼 조정
        };
        
        // 부모 컴포넌트의 addNode 함수 호출
        onNodeAdd(item.nodeType, position);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // 캔버스 클릭 시 선택 해제
    if (event.target === event.currentTarget) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  const handleNodeDrag = useCallback((nodeId: string, position: { x: number; y: number }) => {
    onNodeUpdate(nodeId, { position });
  }, [onNodeUpdate]);

  const handleConnectionStart = useCallback((sourceId: string, targetId: string) => {
    // 연결선 생성 로직
    if (sourceId !== targetId) {
      onConnectionAdd({
        sourceId,
        targetId
      });
    }
  }, [onConnectionAdd]);

  return (
    <div className="h-full relative overflow-hidden bg-gray-50">
      {/* 그리드 배경 */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* 캔버스 영역 */}
      <div
        ref={(node) => {
          drop(node);
          if (canvasRef.current !== node) {
            (canvasRef as any).current = node;
          }
        }}
        className={`
          relative w-full h-full cursor-default
          ${isOver ? 'bg-blue-50' : ''}
        `}
        onClick={handleCanvasClick}
        data-testid="pipeline-canvas"
      >
        {/* 연결선들 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {pipeline.connections.map((connection) => {
            const sourceNode = pipeline.nodes.find(n => n.id === connection.sourceId);
            const targetNode = pipeline.nodes.find(n => n.id === connection.targetId);
            
            if (!sourceNode || !targetNode) return null;
            
            return (
              <ConnectionLine
                key={connection.id}
                source={sourceNode.position}
                target={targetNode.position}
                isSelected={false}
              />
            );
          })}
        </svg>

        {/* 노드들 */}
        {pipeline.nodes.map((node) => (
          <CanvasNode
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onSelect={() => onNodeSelect(node)}
            onDrag={handleNodeDrag}
            onDelete={() => onNodeDelete(node.id)}
            onConnectionStart={handleConnectionStart}
          />
        ))}
        
        {/* 빈 캔버스 안내 */}
        {pipeline.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium mb-2">Start Building Your Pipeline</h3>
              <p className="text-sm">
                Drag nodes from the palette to create your data processing workflow
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}