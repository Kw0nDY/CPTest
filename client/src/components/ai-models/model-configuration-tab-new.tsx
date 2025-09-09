import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Database, 
  Settings, 
  Play,
  Save,
  Search,
  Workflow,
  Target,
  FileText,
  Zap
} from 'lucide-react';
import { SimpleNodeWorkflow } from '@/components/ai-fac/simple-node-workflow';

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

interface AiModel {
  id: string;
  name: string;
  description?: string;
  fileName: string;
  uploadDate: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  analysisResult?: any;
  configFile?: string;
  folderId?: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  fields?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

export default function ModelConfigurationTab() {
  const { toast } = useToast();
  
  // 워크플로우 상태
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'demo-ai-model',
      type: 'ai-model',
      name: 'Assembly Line Quality Classifier',
      position: { x: 300, y: 150 },
      config: {
        temperature: 0.7,
        inputs: ['Product Image', 'Quality Score', 'Defect Type']
      },
      status: 'connected'
    },
    {
      id: 'demo-data-source',
      type: 'data-source', 
      name: 'Production Database',
      position: { x: 50, y: 100 },
      config: {
        database: 'production_db',
        table: 'quality_control'
      },
      status: 'connected'
    },
    {
      id: 'demo-output',
      type: 'output',
      name: 'Quality Reports',
      position: { x: 550, y: 150 },
      config: {
        format: 'JSON',
        destination: 'reporting_system'
      },
      status: 'disconnected'
    }
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    {
      id: 'conn-1',
      sourceId: 'demo-data-source',
      targetId: 'demo-ai-model'
    }
  ]);

  const [workflowName, setWorkflowName] = useState('Quality Control Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('AI-powered quality control system for assembly line production');

  // 데이터 소스 가져오기
  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/data-sources'],
    queryFn: async (): Promise<DataSource[]> => {
      const response = await fetch('/api/data-sources');
      if (!response.ok) throw new Error('Failed to fetch data sources');
      return response.json();
    }
  });

  // AI 모델 가져오기
  const { data: aiModels = [] } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: async (): Promise<AiModel[]> => {
      const response = await fetch('/api/ai-models');
      if (!response.ok) throw new Error('Failed to fetch AI models');
      return response.json();
    }
  });

  // 사용 가능한 노드 타입에 따른 템플릿
  const nodeTemplates = useMemo(() => ({
    'ai-model': aiModels.map(model => ({
      id: `ai-model-${model.id}`,
      type: 'ai-model' as const,
      name: model.name,
      position: { x: 300, y: 150 },
      config: model.analysisResult,
      status: model.status === 'completed' ? 'connected' as const : 'disconnected' as const
    })),
    'data-source': dataSources.map(source => ({
      id: `data-source-${source.id}`,
      type: 'data-source' as const,
      name: source.name,
      position: { x: 50, y: 100 },
      config: { type: source.type, fields: source.fields },
      status: source.status === 'connected' ? 'connected' as const : 'disconnected' as const
    }))
  }), [aiModels, dataSources]);

  const handleSaveWorkflow = async () => {
    try {
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        nodes,
        connections,
        createdAt: new Date().toISOString()
      };

      // TODO: 실제 API 호출로 워크플로우 저장
      console.log('Saving workflow:', workflowData);
      
      toast({
        title: "워크플로우 저장됨",
        description: `${workflowName}이 성공적으로 저장되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "워크플로우 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleRunWorkflow = async () => {
    try {
      const executionData = {
        workflowId: 'current',
        nodes,
        connections
      };

      // TODO: 실제 API 호출로 워크플로우 실행
      console.log('Running workflow:', executionData);
      
      toast({
        title: "워크플로우 실행 시작",
        description: "AI 모델 워크플로우가 실행되었습니다.",
      });
    } catch (error) {
      toast({
        title: "실행 실패", 
        description: "워크플로우 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getNodeStats = () => {
    const stats = {
      total: nodes.length,
      connected: nodes.filter(n => n.status === 'connected').length,
      aiModels: nodes.filter(n => n.type === 'ai-model').length,
      dataSources: nodes.filter(n => n.type === 'data-source').length
    };
    return stats;
  };

  const stats = getNodeStats();

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Model Configuration</h2>
        <p className="text-gray-600 mt-1">
          Create and manage AI model workflows with simple click-to-connect interface
        </p>
      </div>

      {/* 워크플로우 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            워크플로우 설정
          </CardTitle>
          <CardDescription>
            워크플로우의 기본 정보를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workflow-name">워크플로우 이름</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
                data-testid="input-workflow-name"
              />
            </div>
            <div>
              <Label htmlFor="workflow-description">설명</Label>
              <Input
                id="workflow-description"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Enter workflow description"
                data-testid="input-workflow-description"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Workflow className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Nodes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Connected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.connected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">AI Models</p>
                <p className="text-2xl font-bold text-gray-900">{stats.aiModels}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Database className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Data Sources</p>
                <p className="text-2xl font-bold text-gray-900">{stats.dataSources}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 워크플로우 에디터 */}
      <Card className="h-[600px]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Visual Workflow Editor
              </CardTitle>
              <CardDescription>
                Click nodes to connect them. First click selects source, second click creates connection.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleSaveWorkflow}
                className="flex items-center gap-2"
                data-testid="button-save-workflow"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button 
                onClick={handleRunWorkflow}
                className="flex items-center gap-2"
                data-testid="button-run-workflow"
              >
                <Play className="w-4 h-4" />
                Run Workflow
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-full">
          <SimpleNodeWorkflow
            nodes={nodes}
            connections={connections}
            onNodesChange={setNodes}
            onConnectionsChange={setConnections}
          />
        </CardContent>
      </Card>

      {/* 연결 정보 */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Connection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {connections.map((conn) => {
                const sourceNode = nodes.find(n => n.id === conn.sourceId);
                const targetNode = nodes.find(n => n.id === conn.targetId);
                return (
                  <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{sourceNode?.name}</Badge>
                      <span>→</span>
                      <Badge variant="outline">{targetNode?.name}</Badge>
                    </div>
                    <Badge 
                      variant={sourceNode?.status === 'connected' && targetNode?.status === 'connected' ? 'default' : 'secondary'}
                    >
                      {sourceNode?.status === 'connected' && targetNode?.status === 'connected' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}