import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Clock, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { AiModel } from '@shared/schema';

interface ModelAnalysisDetailsProps {
  model: AiModel;
}

function ModelAnalysisDetails({ model }: ModelAnalysisDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Clock className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-view-${model.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Model Analysis: {model.name}</DialogTitle>
          <DialogDescription>
            Detailed analysis results for the uploaded AI model
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Model Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Model Name</Label>
              <p className="text-sm text-gray-600">{model.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">File Name</Label>
              <p className="text-sm text-gray-600">{model.fileName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Model Type</Label>
              <Badge variant="secondary">{model.modelType}</Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">File Size</Label>
              <p className="text-sm text-gray-600">
                {model.fileSize ? `${(model.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Analysis Status</Label>
              <div className={`flex items-center gap-2 ${getStatusColor(model.analysisStatus)}`}>
                {getStatusIcon(model.analysisStatus)}
                <span className="text-sm font-medium capitalize">{model.analysisStatus}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Uploaded</Label>
              <p className="text-sm text-gray-600">
                {formatDistanceToNow(new Date(model.uploadedAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          {model.metadata && Object.keys(model.metadata).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Model Metadata</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(model.metadata).map(([key, value]) => (
                  <div key={key}>
                    <Label className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                    <p className="text-sm text-gray-600">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Input Specifications */}
          <div>
            <h3 className="text-lg font-medium mb-3">Input Specifications</h3>
            {model.inputSpecs && model.inputSpecs.length > 0 ? (
              <div className="space-y-3">
                {model.inputSpecs.map((spec, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-sm text-gray-600">{spec.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Type</Label>
                        <Badge variant="outline">{spec.type}</Badge>
                      </div>
                      {spec.shape && (
                        <div>
                          <Label className="text-sm font-medium">Shape</Label>
                          <p className="text-sm text-gray-600">[{spec.shape.join(', ')}]</p>
                        </div>
                      )}
                      {spec.dtype && (
                        <div>
                          <Label className="text-sm font-medium">Data Type</Label>
                          <p className="text-sm text-gray-600">{spec.dtype}</p>
                        </div>
                      )}
                      {spec.description && (
                        <div className="col-span-2">
                          <Label className="text-sm font-medium">Description</Label>
                          <p className="text-sm text-gray-600">{spec.description}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No input specifications available</p>
            )}
          </div>

          <Separator />

          {/* Output Specifications */}
          <div>
            <h3 className="text-lg font-medium mb-3">Output Specifications</h3>
            {model.outputSpecs && model.outputSpecs.length > 0 ? (
              <div className="space-y-3">
                {model.outputSpecs.map((spec, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-sm text-gray-600">{spec.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Type</Label>
                        <Badge variant="outline">{spec.type}</Badge>
                      </div>
                      {spec.shape && (
                        <div>
                          <Label className="text-sm font-medium">Shape</Label>
                          <p className="text-sm text-gray-600">[{spec.shape.join(', ')}]</p>
                        </div>
                      )}
                      {spec.dtype && (
                        <div>
                          <Label className="text-sm font-medium">Data Type</Label>
                          <p className="text-sm text-gray-600">{spec.dtype}</p>
                        </div>
                      )}
                      {spec.description && (
                        <div className="col-span-2">
                          <Label className="text-sm font-medium">Description</Label>
                          <p className="text-sm text-gray-600">{spec.description}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No output specifications available</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UploadModels() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing models
  const { data: models = [], isLoading } = useQuery<AiModel[]>({
    queryKey: ['/api/ai-models'],
    refetchInterval: 5000 // Refresh every 5 seconds to show analysis progress
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/ai-models/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "모델 업로드 성공",
        description: "모델 분석이 시작되었습니다. 잠시 후 결과를 확인할 수 있습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
      // Reset form
      setSelectedFile(null);
      setModelName('');
      setDescription('');
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const response = await fetch(`/api/ai-models/${modelId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete model');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "모델 삭제 완료",
        description: "모델이 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-generate model name from filename
      if (!modelName) {
        const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setModelName(name);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !modelName.trim()) {
      toast({
        title: "입력 오류",
        description: "모델 파일과 모델명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('model', selectedFile);
    formData.append('name', modelName.trim());
    if (description.trim()) {
      formData.append('description', description.trim());
    }

    uploadMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Clock className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            AI 모델 업로드
          </CardTitle>
          <CardDescription>
            머신러닝 모델을 업로드하면 자동으로 입력/출력 스펙을 분석합니다.
            지원 형식: .pth, .pt, .onnx, .h5, .pb, .tflite, .pkl, .pickle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-file">모델 파일</Label>
              <Input
                id="model-file"
                type="file"
                accept=".pth,.pt,.onnx,.h5,.pb,.tflite,.pkl,.pickle"
                onChange={handleFileSelect}
                disabled={isUploading}
                data-testid="input-model-file"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600">
                  선택된 파일: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model-name">모델명</Label>
              <Input
                id="model-name"
                placeholder="모델 이름을 입력하세요"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={isUploading}
                data-testid="input-model-name"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model-description">설명 (선택사항)</Label>
            <Textarea
              id="model-description"
              placeholder="모델에 대한 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={3}
              data-testid="textarea-model-description"
            />
          </div>

          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || !modelName.trim() || isUploading}
            className="w-full"
            data-testid="button-upload-model"
          >
            {isUploading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                모델 업로드
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Models List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            업로드된 모델 목록
          </CardTitle>
          <CardDescription>
            업로드된 AI 모델들과 분석 결과를 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>업로드된 모델이 없습니다.</p>
              <p className="text-sm">위에서 첫 번째 모델을 업로드해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {models.map((model) => (
                <Card key={model.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{model.name}</h3>
                        <Badge variant="outline">{model.modelType}</Badge>
                        <Badge className={getStatusColor(model.analysisStatus)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(model.analysisStatus)}
                            <span className="capitalize">{model.analysisStatus}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">파일명:</span> {model.fileName}
                        </div>
                        <div>
                          <span className="font-medium">크기:</span> {model.fileSize ? `${(model.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">입력:</span> {model.inputSpecs?.length || 0}개
                        </div>
                        <div>
                          <span className="font-medium">출력:</span> {model.outputSpecs?.length || 0}개
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-500">
                        업로드: {formatDistanceToNow(new Date(model.uploadedAt), { addSuffix: true })}
                      </div>

                      {model.analysisStatus === 'processing' && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 animate-spin" />
                            <span className="text-sm">모델 분석 중...</span>
                          </div>
                          <Progress value={undefined} className="h-2" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <ModelAnalysisDetails model={model} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(model.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${model.id}`}
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

export default UploadModels;