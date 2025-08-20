import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Edit, Trash2, Brain, FileText, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import type { AiModel, ModelConfiguration, InsertModelConfiguration } from '@shared/schema';

interface ConfigurationFormData {
  name: string;
  description: string;
  modelId: string;
  isActive: boolean;
  inputMappings: Array<{
    modelInput: string;
    dataSource?: string;
    fieldMapping?: string;
    defaultValue?: any;
    transformation?: string;
  }>;
  outputMappings: Array<{
    modelOutput: string;
    outputName: string;
    description?: string;
    postProcessing?: string;
  }>;
  settings: {
    batchSize?: number;
    confidenceThreshold?: number;
    maxInferenceTime?: number;
    useGpu?: boolean;
    scalingFactor?: number;
  };
}

interface ConfigurationFormProps {
  models: AiModel[];
  configuration?: ModelConfiguration;
  onClose: () => void;
}

function ConfigurationForm({ models, configuration, onClose }: ConfigurationFormProps) {
  const [formData, setFormData] = useState<ConfigurationFormData>(() => {
    if (configuration) {
      return {
        name: configuration.name,
        description: configuration.description || '',
        modelId: configuration.modelId,
        isActive: configuration.isActive === 1,
        inputMappings: configuration.inputMappings || [],
        outputMappings: configuration.outputMappings || [],
        settings: configuration.settings || {}
      };
    }
    return {
      name: '',
      description: '',
      modelId: '',
      isActive: false,
      inputMappings: [],
      outputMappings: [],
      settings: {}
    };
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedModel = models.find(m => m.id === formData.modelId);

  const saveMutation = useMutation({
    mutationFn: async (data: ConfigurationFormData) => {
      const payload: InsertModelConfiguration = {
        name: data.name,
        description: data.description,
        modelId: data.modelId,
        isActive: data.isActive ? 1 : 0,
        inputMappings: data.inputMappings,
        outputMappings: data.outputMappings,
        settings: data.settings
      };

      const url = configuration 
        ? `/api/model-configurations/${configuration.id}`
        : '/api/model-configurations';
      
      const method = configuration ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: configuration ? "구성 업데이트 완료" : "구성 생성 완료",
        description: "모델 구성이 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/model-configurations'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.modelId) {
      toast({
        title: "입력 오류",
        description: "구성명과 모델을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  const addInputMapping = () => {
    setFormData(prev => ({
      ...prev,
      inputMappings: [...prev.inputMappings, {
        modelInput: '',
        dataSource: '',
        fieldMapping: '',
        defaultValue: '',
        transformation: ''
      }]
    }));
  };

  const updateInputMapping = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      inputMappings: prev.inputMappings.map((mapping, i) => 
        i === index ? { ...mapping, [field]: value } : mapping
      )
    }));
  };

  const removeInputMapping = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inputMappings: prev.inputMappings.filter((_, i) => i !== index)
    }));
  };

  const addOutputMapping = () => {
    setFormData(prev => ({
      ...prev,
      outputMappings: [...prev.outputMappings, {
        modelOutput: '',
        outputName: '',
        description: '',
        postProcessing: ''
      }]
    }));
  };

  const updateOutputMapping = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      outputMappings: prev.outputMappings.map((mapping, i) => 
        i === index ? { ...mapping, [field]: value } : mapping
      )
    }));
  };

  const removeOutputMapping = (index: number) => {
    setFormData(prev => ({
      ...prev,
      outputMappings: prev.outputMappings.filter((_, i) => i !== index)
    }));
  };

  const availableModels = models.filter(m => m.status === 'completed');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="config-name">구성명</Label>
          <Input
            id="config-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="구성 이름을 입력하세요"
            data-testid="input-config-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model-select">모델 선택</Label>
          <Select 
            value={formData.modelId} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, modelId: value }))}
          >
            <SelectTrigger data-testid="select-model">
              <SelectValue placeholder="모델을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name} ({model.modelType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="config-description">설명</Label>
        <Textarea
          id="config-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="구성에 대한 설명을 입력하세요"
          rows={3}
          data-testid="textarea-config-description"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="config-active"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          data-testid="switch-config-active"
        />
        <Label htmlFor="config-active">활성화</Label>
      </div>

      <Separator />

      {/* Input Mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">입력 매핑</h3>
          <Button type="button" size="sm" onClick={addInputMapping} data-testid="button-add-input-mapping">
            <Plus className="h-4 w-4 mr-2" />
            입력 추가
          </Button>
        </div>
        
        {selectedModel?.inputSpecs && selectedModel.inputSpecs.length > 0 && (
          <div className="text-sm text-gray-600">
            <p className="font-medium">사용 가능한 모델 입력:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedModel.inputSpecs.map((spec, index) => (
                <Badge key={index} variant="outline">
                  {spec.name} ({spec.type})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {formData.inputMappings.map((mapping, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>모델 입력</Label>
                <Input
                  value={mapping.modelInput}
                  onChange={(e) => updateInputMapping(index, 'modelInput', e.target.value)}
                  placeholder="모델 입력명"
                  data-testid={`input-model-input-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label>데이터 소스</Label>
                <Input
                  value={mapping.dataSource || ''}
                  onChange={(e) => updateInputMapping(index, 'dataSource', e.target.value)}
                  placeholder="데이터 소스"
                  data-testid={`input-data-source-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label>필드 매핑</Label>
                <Input
                  value={mapping.fieldMapping || ''}
                  onChange={(e) => updateInputMapping(index, 'fieldMapping', e.target.value)}
                  placeholder="필드 매핑"
                  data-testid={`input-field-mapping-${index}`}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeInputMapping(index)}
                  data-testid={`button-remove-input-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Output Mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">출력 매핑</h3>
          <Button type="button" size="sm" onClick={addOutputMapping} data-testid="button-add-output-mapping">
            <Plus className="h-4 w-4 mr-2" />
            출력 추가
          </Button>
        </div>

        {selectedModel?.outputSpecs && selectedModel.outputSpecs.length > 0 && (
          <div className="text-sm text-gray-600">
            <p className="font-medium">사용 가능한 모델 출력:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedModel.outputSpecs.map((spec, index) => (
                <Badge key={index} variant="outline">
                  {spec.name} ({spec.type})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {formData.outputMappings.map((mapping, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>모델 출력</Label>
                <Input
                  value={mapping.modelOutput}
                  onChange={(e) => updateOutputMapping(index, 'modelOutput', e.target.value)}
                  placeholder="모델 출력명"
                  data-testid={`input-model-output-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label>출력 이름</Label>
                <Input
                  value={mapping.outputName}
                  onChange={(e) => updateOutputMapping(index, 'outputName', e.target.value)}
                  placeholder="출력 이름"
                  data-testid={`input-output-name-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Input
                  value={mapping.description || ''}
                  onChange={(e) => updateOutputMapping(index, 'description', e.target.value)}
                  placeholder="설명"
                  data-testid={`input-output-description-${index}`}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeOutputMapping(index)}
                  data-testid={`button-remove-output-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">설정</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batch-size">배치 크기</Label>
            <Input
              id="batch-size"
              type="number"
              value={formData.settings.batchSize || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, batchSize: parseInt(e.target.value) || undefined }
              }))}
              placeholder="배치 크기"
              data-testid="input-batch-size"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confidence-threshold">신뢰도 임계값</Label>
            <Input
              id="confidence-threshold"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.settings.confidenceThreshold || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, confidenceThreshold: parseFloat(e.target.value) || undefined }
              }))}
              placeholder="0.0 - 1.0"
              data-testid="input-confidence-threshold"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="use-gpu"
            checked={formData.settings.useGpu || false}
            onCheckedChange={(checked) => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, useGpu: checked }
            }))}
            data-testid="switch-use-gpu"
          />
          <Label htmlFor="use-gpu">GPU 사용</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
          취소
        </Button>
        <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-config">
          {saveMutation.isPending ? '저장 중...' : (configuration ? '업데이트' : '생성')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ModelConfiguration() {
  const [selectedConfig, setSelectedConfig] = useState<ModelConfiguration | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch configurations
  const { data: configurations = [], isLoading: configsLoading } = useQuery<ModelConfiguration[]>({
    queryKey: ['/api/model-configurations']
  });

  // Fetch models
  const { data: models = [], isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ['/api/ai-models']
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await fetch(`/api/model-configurations/${configId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "구성 삭제 완료",
        description: "모델 구성이 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/model-configurations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getModelName = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    return model ? `${model.name} (${model.modelType})` : 'Unknown Model';
  };

  const openForm = (config?: ModelConfiguration) => {
    setSelectedConfig(config || null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedConfig(null);
    setIsFormOpen(false);
  };

  if (configsLoading || modelsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            모델 구성
          </h2>
          <p className="text-gray-600 mt-1">
            업로드된 AI 모델의 입력/출력 설정을 구성하고 관리합니다.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm()} data-testid="button-create-config">
              <Plus className="h-4 w-4 mr-2" />
              새 구성 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedConfig ? '모델 구성 편집' : '새 모델 구성 생성'}
              </DialogTitle>
              <DialogDescription>
                AI 모델의 입력과 출력을 데이터 소스와 연결하여 구성합니다.
              </DialogDescription>
            </DialogHeader>
            <ConfigurationForm 
              models={models} 
              configuration={selectedConfig || undefined}
              onClose={closeForm}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Configurations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            모델 구성 목록
          </CardTitle>
          <CardDescription>
            생성된 모델 구성들을 확인하고 관리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>생성된 모델 구성이 없습니다.</p>
              <p className="text-sm">위에서 첫 번째 구성을 생성해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configurations.map((config) => (
                <Card key={config.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{config.name}</h3>
                        {config.isActive === 1 ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            활성
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" />
                            비활성
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">모델:</span> {getModelName(config.modelId)}
                        </div>
                        <div>
                          <span className="font-medium">입력:</span> {config.inputMappings?.length || 0}개
                        </div>
                        <div>
                          <span className="font-medium">출력:</span> {config.outputMappings?.length || 0}개
                        </div>
                      </div>
                      
                      {config.description && (
                        <p className="text-sm text-gray-600 mt-2">{config.description}</p>
                      )}
                      
                      <div className="mt-2 text-sm text-gray-500">
                        생성: {formatDistanceToNow(new Date(config.createdAt!), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openForm(config)}
                        data-testid={`button-edit-${config.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(config.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-config-${config.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ModelConfiguration;