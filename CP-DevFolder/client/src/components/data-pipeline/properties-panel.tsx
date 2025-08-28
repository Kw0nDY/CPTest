import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Settings, Info } from 'lucide-react';
import { PipelineNode, NODE_TYPES } from './types';

interface PropertiesPanelProps {
  selectedNode: PipelineNode | null;
  onNodeUpdate: (nodeId: string, updates: Partial<PipelineNode>) => void;
}

export function PropertiesPanel({ selectedNode, onNodeUpdate }: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Select a node to view and edit its properties
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nodeType = NODE_TYPES.find(nt => nt.id === selectedNode.type);
  
  if (!nodeType) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">
            <p className="text-sm">Unknown node type: {selectedNode.type}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleConfigUpdate = (key: string, value: any) => {
    onNodeUpdate(selectedNode.id, {
      config: {
        ...selectedNode.config,
        [key]: value
      }
    });
  };

  const handleNodeNameUpdate = (name: string) => {
    onNodeUpdate(selectedNode.id, { 
      config: { ...selectedNode.config, _name: name }
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Properties
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 노드 정보 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">{nodeType.icon}</div>
            <div>
              <h3 className="font-semibold">{nodeType.name}</h3>
              <Badge variant="secondary" className="text-xs mt-1">
                {nodeType.category}
              </Badge>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            {nodeType.description}
          </p>
          
          <Separator />
        </div>

        {/* 노드 이름 */}
        <div className="space-y-2">
          <Label htmlFor="node-name">Node Name</Label>
          <Input
            id="node-name"
            value={selectedNode.config._name || nodeType.name}
            onChange={(e) => handleNodeNameUpdate(e.target.value)}
            placeholder="Enter node name"
            data-testid="node-name-input"
          />
        </div>

        <Separator />

        {/* 설정 필드들 */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Configuration</h4>
          
          {Object.entries(nodeType.configSchema).map(([key, schema]: [string, any]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`config-${key}`}>
                {schema.label || key}
                {schema.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {schema.type === 'string' && (
                <Input
                  id={`config-${key}`}
                  value={selectedNode.config[key] || schema.default || ''}
                  onChange={(e) => handleConfigUpdate(key, e.target.value)}
                  placeholder={`Enter ${schema.label || key}`}
                  data-testid={`config-${key}`}
                />
              )}
              
              {schema.type === 'number' && (
                <Input
                  id={`config-${key}`}
                  type="number"
                  value={selectedNode.config[key] || schema.default || 0}
                  onChange={(e) => handleConfigUpdate(key, Number(e.target.value))}
                  placeholder={`Enter ${schema.label || key}`}
                  data-testid={`config-${key}`}
                />
              )}
              
              {schema.type === 'boolean' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`config-${key}`}
                    checked={selectedNode.config[key] ?? schema.default ?? false}
                    onCheckedChange={(checked) => handleConfigUpdate(key, checked)}
                    data-testid={`config-${key}`}
                  />
                  <Label htmlFor={`config-${key}`} className="text-sm">
                    {selectedNode.config[key] ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
              )}
              
              {schema.type === 'array' && (
                <Textarea
                  id={`config-${key}`}
                  value={Array.isArray(selectedNode.config[key]) 
                    ? selectedNode.config[key].join('\n')
                    : ''
                  }
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter(line => line.trim());
                    handleConfigUpdate(key, lines);
                  }}
                  placeholder={`Enter ${schema.label || key} (one per line)`}
                  rows={3}
                  data-testid={`config-${key}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 노드 ID 정보 */}
        <Separator />
        
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Node ID</Label>
          <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded">
            {selectedNode.id}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => {
              // 노드 복제 기능
              console.log('Duplicate node:', selectedNode);
            }}
          >
            Duplicate Node
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}