import React from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NODE_TYPES, NODE_CATEGORIES, NodeType } from './types';

interface NodePaletteProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Node Palette</CardTitle>
        <p className="text-sm text-gray-600">
          Drag nodes to the canvas to build your pipeline
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto space-y-6">
        {NODE_CATEGORIES.map((category) => {
          const categoryNodes = NODE_TYPES.filter(node => node.category === category.id);
          
          return (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className={`font-semibold ${category.color}`}>
                  {category.name}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {categoryNodes.length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {categoryNodes.map((nodeType) => (
                  <DraggableNode 
                    key={nodeType.id}
                    nodeType={nodeType}
                    onAddNode={onAddNode}
                  />
                ))}
              </div>
              
              {category.id !== NODE_CATEGORIES[NODE_CATEGORIES.length - 1].id && (
                <Separator className="mt-4" />
              )}
            </div>
          );
        })}
      </CardContent>
    </div>
  );
}

interface DraggableNodeProps {
  nodeType: NodeType;
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

function DraggableNode({ nodeType, onAddNode }: DraggableNodeProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'pipeline-node',
    item: { nodeType: nodeType.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`
        p-3 rounded-lg border-2 border-dashed cursor-move transition-all duration-200
        ${nodeType.color}
        ${isDragging 
          ? 'opacity-50 scale-95' 
          : 'hover:shadow-md hover:scale-105'
        }
      `}
      data-testid={`node-${nodeType.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">
          {nodeType.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">
            {nodeType.name}
          </h4>
          <p className="text-xs opacity-80 line-clamp-2">
            {nodeType.description}
          </p>
        </div>
      </div>
    </div>
  );
}