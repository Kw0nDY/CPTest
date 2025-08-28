import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Circle } from 'lucide-react';
import { PipelineNode, NODE_TYPES } from './types';

interface CanvasNodeProps {
  node: PipelineNode;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (nodeId: string, position: { x: number; y: number }) => void;
  onDelete: () => void;
  onConnectionStart: (sourceId: string, targetId: string) => void;
}

export function CanvasNode({
  node,
  isSelected,
  onSelect,
  onDrag,
  onDelete,
  onConnectionStart
}: CanvasNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const nodeType = NODE_TYPES.find(nt => nt.id === node.type);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'canvas-node',
    item: { nodeId: node.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const newPosition = {
          x: node.position.x + delta.x,
          y: node.position.y + delta.y
        };
        onDrag(node.id, newPosition);
      }
    }
  });

  const handleNodeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect();
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete();
  };

  const handleConnectionPoint = (targetNodeId: string) => {
    onConnectionStart(node.id, targetNodeId);
  };

  if (!nodeType) return null;

  return (
    <div
      ref={(element) => {
        drag(element);
        if (nodeRef.current !== element) {
          (nodeRef as any).current = element;
        }
      }}
      className="absolute"
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: isDragging ? 'rotate(5deg)' : 'none',
        zIndex: isSelected ? 10 : 1
      }}
      data-testid={`canvas-node-${node.id}`}
    >
      <Card 
        className={`
          w-48 cursor-move transition-all duration-200
          ${isSelected 
            ? 'ring-2 ring-blue-500 shadow-lg' 
            : 'hover:shadow-md'
          }
          ${isDragging ? 'opacity-50' : ''}
        `}
        onClick={handleNodeClick}
      >
        {/* 노드 헤더 */}
        <div className={`p-3 rounded-t-lg ${nodeType.color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{nodeType.icon}</span>
              <span className="font-medium text-sm">{nodeType.name}</span>
            </div>
            
            {isSelected && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-100"
                onClick={handleDeleteClick}
                data-testid={`delete-node-${node.id}`}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* 노드 본문 */}
        <div className="p-3 bg-white">
          <div className="space-y-2">
            {/* 설정 요약 */}
            <div className="text-xs text-gray-600">
              {Object.entries(node.config).slice(0, 2).map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="font-medium">{key}:</span> 
                  <span className="ml-1">{String(value)}</span>
                </div>
              ))}
            </div>
            
            {/* 상태 표시 */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {node.type.split('.')[0]}
              </Badge>
              
              <div className="flex items-center gap-1">
                {/* 입력 포트 */}
                {node.type !== 'source.fileDrop' && (
                  <Circle 
                    className="w-3 h-3 text-gray-400 hover:text-blue-500 cursor-pointer" 
                    fill="currentColor"
                    data-testid={`input-port-${node.id}`}
                  />
                )}
                
                {/* 출력 포트 */}
                {node.type !== 'sink.featureCache' && (
                  <Circle 
                    className="w-3 h-3 text-gray-400 hover:text-blue-500 cursor-pointer" 
                    fill="currentColor"
                    data-testid={`output-port-${node.id}`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}