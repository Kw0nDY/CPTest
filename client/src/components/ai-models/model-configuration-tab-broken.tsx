import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  MoreHorizontal,
  Zap,
  Database,
  Workflow,
  Brain,
  ChevronLeft,
  MoreVertical,
  Circle,
  ChevronRight,
  X,
  Info,
  ArrowRight,
  Link2,
  Target,
  Monitor,
  Check,
  PlayCircle,
  FileText,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PossibleConnection {
  id: string;
  name: string;
  type: 'data-source' | 'view' | 'ai-result' | 'ai-model';
  outputs: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface PossibleConnections {
  dataSources: PossibleConnection[];
  views: PossibleConnection[];
  aiResults: PossibleConnection[];
  aiModels: PossibleConnection[];
}

interface ExecutionFile {
  id: string;
  fileName: string;
  originalFileName: string;
  isActive: boolean;
  fileType: string;
  createdAt: string;
}

interface ExecutionResult {
  id: string;
  executionId: string;
  inputData: any;
  outputData?: any;
  executionStatus: 'running' | 'completed' | 'failed';
  executionTime?: number;
  errorMessage?: string;
  logs?: string;
  createdAt: string;
  completedAt?: string;
}

interface AiModel {
  id: string;
  name: string;
  description?: string;
  modelType: string;
  parameters?: string;
  status: string;
  uploadedAt: string;
  folderId?: string;
}

interface ModelConfiguration {
  id: string;
  name: string;
  modelId: string;
  configName: string;
  parameters: any;
  createdAt: string;
}

interface ModelConfigurationTabProps {
  model: AiModel;
}

export function ModelConfigurationTab({ model }: ModelConfigurationTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>('');
  const [showPossibleConnections, setShowPossibleConnections] = useState(false);
  const [selectedInputData, setSelectedInputData] = useState<any>({});
  const [executionInProgress, setExecutionInProgress] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'configuration' | 'execution' | 'results'>('configuration');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get model configurations
  const { data: configurations = [] } = useQuery({
    queryKey: ['/api/model-configurations', model.id],
    queryFn: () => apiRequest(`/api/model-configurations?modelId=${model.id}`)
  });

  // Get execution files
  const { data: executionFiles = [] } = useQuery({
    queryKey: ['/api/ai-models', model.id, 'execution-files'],
    queryFn: () => apiRequest(`/api/ai-models/${model.id}/execution-files`)
  });

  // Get possible connections with proper disabled state
  const { data: possibleConnections, refetch: refetchConnections } = useQuery({
    queryKey: ['/api/ai-models', model.id, 'possible-connections'],
    queryFn: () => apiRequest(`/api/ai-models/${model.id}/possible-connections`),
    enabled: false
  });

  // Upload execution file mutation
  const uploadExecutionFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/ai-models/${model.id}/execution-files`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "실행 파일 업로드 완료",
        description: "Python 실행 파일이 성공적으로 업로드되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models', model.id, 'execution-files'] });
    },
    onError: (error: any) => {
      toast({
        title: "업로드 실패",
        description: error?.message || "실행 파일 업로드에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // Execute model mutation
  const executeModelMutation = useMutation({
    mutationFn: async (inputData: any) => {
      const response = await fetch(`/api/ai-models/${model.id}/execute`, {
        method: 'POST',
        body: JSON.stringify({
          configurationId: selectedConfiguration,
          inputData
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Execution failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setExecutionInProgress(true);
      setExecutionProgress(10);
      pollExecutionResult(data.resultId);
    },
    onError: (error: any) => {
      toast({
        title: "실행 실패",
        description: error?.message || "모델 실행에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.py')) {
        toast({
          title: "잘못된 파일 형식",
          description: "Python 파일(.py)만 업로드할 수 있습니다.",
          variant: "destructive"
        });
        return;
      }
      uploadExecutionFileMutation.mutate(file);
    }
  };

  const pollExecutionResult = async (resultId: string) => {
    const checkResult = async () => {
      try {
        const response = await fetch(`/api/execution-results/${resultId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch execution result');
        }
        const result = await response.json();
        
        if (result.executionStatus === 'running') {
          setExecutionProgress((prev: number) => Math.min(prev + 10, 90));
          setTimeout(checkResult, 2000);
        } else {
          setExecutionProgress(100);
          setExecutionInProgress(false);
          
          if (result.executionStatus === 'completed') {
            toast({
              title: "실행 완료",
              description: "AI 모델 실행이 성공적으로 완료되었습니다."
            });
          } else {
            toast({
              title: "실행 실패",
              description: result.errorMessage || "모델 실행 중 오류가 발생했습니다.",
              variant: "destructive"
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['/api/execution-results'] });
        }
      } catch (error) {
        setExecutionInProgress(false);
        toast({
          title: "실행 상태 확인 실패",
          description: "실행 결과를 확인하는데 실패했습니다.",
          variant: "destructive"
        });
      }
    };

    setTimeout(checkResult, 1000);
  };

  const handleExecuteModel = () => {
    if (!selectedConfiguration) {
      toast({
        title: "설정 선택 필요",
        description: "먼저 모델 설정을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    const activeExecutionFile = executionFiles.find((file: ExecutionFile) => file.isActive);
    if (!activeExecutionFile) {
      toast({
        title: "실행 파일 필요",
        description: "먼저 Python 실행 파일을 업로드해주세요.",
        variant: "destructive"
      });
      return;
    }

    executeModelMutation.mutate(selectedInputData);
  };

  const handleConnectionSelect = (connectionId: string, outputId: string) => {
    setSelectedInputData(prev => ({
      ...prev,
      [connectionId]: outputId
    }));
    toast({
      title: "연결 설정",
      description: "데이터 소스 연결이 설정되었습니다."
    });
  };

  const renderPossibleConnections = () => {
    if (!possibleConnections) return null;

    const allConnections = [
      ...(possibleConnections.dataSources || []),
      ...(possibleConnections.views || []),
      ...(possibleConnections.aiResults || []),
      ...(possibleConnections.aiModels || [])
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">사용 가능한 연결</h3>
          <Badge variant="secondary">{allConnections.length} 개 소스</Badge>
        </div>

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
                
                {connection.outputs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      사용 가능한 출력:
                    </p>
                    <div className="grid gap-2">
                      {connection.outputs.map((output: any) => (
                        <div
                          key={output.id}
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleConnectionSelect(connection.id, output.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Circle className="w-3 h-3 fill-current text-muted-foreground" />
                            <span className="text-sm">{output.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {output.type}
                            </Badge>
                          </div>
                          {selectedInputData[connection.id] === output.id && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const activeExecutionFile = executionFiles.find((file: ExecutionFile) => file.isActive);

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'configuration' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('configuration')}
            data-testid="tab-configuration"
          >
            <Settings className="w-4 h-4 mr-2" />
            설정
          </Button>
          <Button
            variant={activeTab === 'execution' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('execution')}
            data-testid="tab-execution"
          >
            <Play className="w-4 h-4 mr-2" />
            실행
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('results')}
            data-testid="tab-results"
          >
            <FileText className="w-4 h-4 mr-2" />
            결과
          </Button>
        </div>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                모델 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="config-select">설정 선택</Label>
                <Select value={selectedConfiguration} onValueChange={setSelectedConfiguration}>
                  <SelectTrigger data-testid="select-configuration">
                    <SelectValue placeholder="설정을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {configurations.map((config: ModelConfiguration) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPossibleConnections(true)}
                  data-testid="button-view-connections"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  연결 가능한 소스 보기
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                실행 파일 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeExecutionFile ? (
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">활성 실행 파일</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeExecutionFile.originalFileName}
                  </p>
                </div>
              ) : (
                <div className="p-4 border rounded-lg border-dashed">
                  <div className="text-center space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      실행을 위해 Python 파일이 필요합니다
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleFileUpload}
                disabled={uploadExecutionFileMutation.isPending}
                data-testid="button-upload-execution-file"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadExecutionFileMutation.isPending ? '업로드 중...' : 'Python 파일 업로드'}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".py"
                onChange={handleFileSelected}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Execution Tab */}
      {activeTab === 'execution' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5" />
                모델 실행
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {executionInProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">실행 진행률</span>
                    <span className="text-sm text-muted-foreground">{executionProgress}%</span>
                  </div>
                  <Progress value={executionProgress} className="w-full" />
                </div>
              )}

              <div className="grid gap-4">
                <div>
                  <Label>선택된 설정</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedConfiguration ? 
                      configurations.find((c: ModelConfiguration) => c.id === selectedConfiguration)?.name || '설정을 선택하세요'
                      : '설정을 선택하세요'
                    }
                  </div>
                </div>

                <div>
                  <Label>실행 파일</Label>
                  <div className="text-sm text-muted-foreground">
                    {activeExecutionFile ? activeExecutionFile.originalFileName : 'Python 파일을 업로드하세요'}
                  </div>
                </div>

                <div>
                  <Label>연결된 데이터 소스</Label>
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(selectedInputData).length} 개 연결됨
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExecuteModel}
                disabled={executeModelMutation.isPending || executionInProgress}
                className="w-full"
                data-testid="button-execute-model"
              >
                <Play className="w-4 h-4 mr-2" />
                {executeModelMutation.isPending || executionInProgress ? '실행 중...' : '모델 실행'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                실행 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  실행 결과가 여기에 표시됩니다
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Possible Connections Dialog */}
      <Dialog open={showPossibleConnections} onOpenChange={setShowPossibleConnections}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              연결 가능한 데이터 소스
            </DialogTitle>
            <DialogDescription>
              이 AI 모델에서 사용할 수 있는 데이터 소스들을 확인하고 연결하세요.
            </DialogDescription>
          </DialogHeader>
          {renderPossibleConnections()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ModelConfigurationTab;