import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Brain, 
  FileText, 
  Calendar, 
  HardDrive,
  Activity,
  Zap,
  Trash2,
  MoreVertical,
  Eye,
  Download,
  Settings,
  FileCode,
  Archive
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface AiModelFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface AiModel {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  modelType: string;
  status: string;
  folderId?: string;
  uploadedAt: string;
  analysisStatus: string;
  accuracy?: number;
}

interface ModelsViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folder: AiModelFolder | null;
}

export function ModelsViewDialog({ isOpen, onClose, folder }: ModelsViewDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<AiModel | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch models for this folder
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['/api/ai-model-folders', folder?.id, 'models'],
    queryFn: async (): Promise<AiModel[]> => {
      if (!folder) return [];
      const response = await fetch(`/api/ai-model-folders/${folder.id}/models`);
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json();
    },
    enabled: !!folder && isOpen
  });

  // Delete model mutation
  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const response = await fetch(`/api/ai-models/${modelId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete model');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-model-folders', folder?.id, 'models'] });
      toast({ title: '성공', description: '모델이 성공적으로 삭제되었습니다' });
    },
    onError: () => {
      toast({ title: '오류', description: '모델 삭제에 실패했습니다', variant: 'destructive' });
    }
  });

  const handleDeleteModel = (modelId: string, modelName: string) => {
    if (confirm(`정말로 "${modelName}" 모델을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      deleteModelMutation.mutate(modelId);
    }
  };

  const handleViewDetails = (model: AiModel) => {
    setSelectedModel(model);
    setIsDetailDialogOpen(true);
  };

  const handleDownloadModel = async (modelId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/ai-models/${modelId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: 'Success', description: 'Model downloaded successfully' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to download model', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { variant: 'default' as const, color: 'bg-green-500' },
      'training': { variant: 'secondary' as const, color: 'bg-yellow-500' },
      'completed': { variant: 'outline' as const, color: 'bg-blue-500' },
      'error': { variant: 'destructive' as const, color: 'bg-red-500' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge variant={config.variant}>
        <div className={`w-2 h-2 rounded-full ${config.color} mr-1`}></div>
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'neural network':
      case 'cnn':
      case 'rnn':
        return <Brain className="w-4 h-4 text-purple-600" />;
      case 'linear regression':
      case 'logistic regression':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'random forest':
      case 'decision tree':
        return <Zap className="w-4 h-4 text-green-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span style={{ color: folder?.color }}>{folder?.icon}</span>
            Models in "{folder?.name}"
            <Badge variant="outline" className="ml-2">
              {models.length} models
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-gray-600">Loading models...</span>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No models found in this folder</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {models.map((model) => (
                <Card key={model.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(model.modelType)}
                        <div>
                          <h3 className="font-medium text-gray-900" data-testid={`text-model-name-${model.id}`}>
                            {model.name}
                          </h3>
                          <p className="text-sm text-gray-500" data-testid={`text-model-filename-${model.id}`}>
                            {model.fileName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(model.status)}
                        <Badge variant="outline" data-testid={`badge-model-type-${model.id}`}>
                          {model.modelType}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-model-actions-${model.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => handleViewDetails(model)}
                              data-testid={`button-view-details-${model.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDownloadModel(model.id, model.fileName)}
                              data-testid={`button-download-model-${model.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Files
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteModel(model.id, model.name)}
                              data-testid={`button-delete-model-${model.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              모델 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium" data-testid={`text-model-size-${model.id}`}>
                          {formatBytes(model.fileSize)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Uploaded:</span>
                        <span className="font-medium" data-testid={`text-model-date-${model.id}`}>
                          {new Date(model.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {model.accuracy && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Accuracy:</span>
                          <span className="font-medium text-green-600" data-testid={`text-model-accuracy-${model.id}`}>
                            {(model.accuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Analysis:</span>
                        <span className="font-medium" data-testid={`text-model-analysis-${model.id}`}>
                          {model.analysisStatus}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Model Detail Dialog */}
      <ModelDetailDialog 
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        model={selectedModel}
        onDownload={handleDownloadModel}
      />
    </Dialog>
  );
}

// Model Detail Dialog Component
interface ModelDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  model: AiModel | null;
  onDownload: (modelId: string, fileName: string) => void;
}

function ModelDetailDialog({ isOpen, onClose, model, onDownload }: ModelDetailDialogProps) {
  const { toast } = useToast();
  const { data: modelDetails, isLoading } = useQuery({
    queryKey: ['/api/ai-models', model?.id, 'details'],
    queryFn: async () => {
      if (!model) return null;
      const response = await fetch(`/api/ai-models/${model.id}/details`);
      if (!response.ok) throw new Error('Failed to fetch model details');
      return response.json();
    },
    enabled: !!model && isOpen
  });

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/ai-model-files/${fileId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: 'Success', description: `${fileName} downloaded successfully` });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: `Failed to download ${fileName}`, 
        variant: 'destructive' 
      });
    }
  };

  if (!model) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-600" />
            {model.name}
            <Badge variant="outline">{model.modelType}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600">Model Name</label>
                  <p className="font-medium">{model.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600">File Name</label>
                  <p className="font-mono text-sm bg-gray-50 px-2 py-1 rounded">{model.fileName}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600">Model Type</label>
                  <p className="font-medium">{model.modelType}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${model.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span>{model.status}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600">File Size</label>
                  <p className="font-medium">{formatBytes(model.fileSize)}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600">Upload Date</label>
                  <p className="font-medium">{new Date(model.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Configuration */}
          {isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="ml-2">Loading model details...</span>
                </div>
              </CardContent>
            </Card>
          ) : modelDetails && (
            <>
              {/* Input/Output Configuration */}
              {(modelDetails.inputs || modelDetails.outputs) && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileCode className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Input/Output Configuration</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {modelDetails.inputs && modelDetails.inputs.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-600 mb-2">Input Parameters ({modelDetails.inputs.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {modelDetails.inputs.map((input: any, index: number) => (
                            <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-green-800">{input.name}</span>
                                <Badge variant="outline" className="text-xs">{input.type}</Badge>
                              </div>
                              {input.description && (
                                <p className="text-sm text-green-600">{input.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {modelDetails.outputs && modelDetails.outputs.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-600 mb-2">Output Parameters ({modelDetails.outputs.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {modelDetails.outputs.map((output: any, index: number) => (
                            <div key={index} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-blue-800">{output.name}</span>
                                <Badge variant="outline" className="text-xs">{output.type}</Badge>
                              </div>
                              {output.description && (
                                <p className="text-sm text-blue-600">{output.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Model Information */}
              {modelDetails.modelInfo && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Archive className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Model Architecture</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {modelDetails.modelInfo.architecture && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="font-medium">Architecture</span>
                          <span>{modelDetails.modelInfo.architecture}</span>
                        </div>
                      )}
                      
                      {modelDetails.modelInfo.parameters && Object.keys(modelDetails.modelInfo.parameters).length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Parameters</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(modelDetails.modelInfo.parameters).map(([key, value]) => (
                              value !== null && value !== undefined && (
                                <div key={key} className="flex justify-between py-1 px-3 bg-gray-50 rounded">
                                  <span className="text-sm text-gray-600">{key}:</span>
                                  <span className="text-sm font-mono">{String(value)}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Model Files List */}
              {modelDetails && modelDetails.files && modelDetails.files.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Model Files ({modelDetails.files.length})</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {modelDetails.files.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              file.fileType === 'model' ? 'bg-purple-500' :
                              file.fileType === 'config' ? 'bg-blue-500' :
                              file.fileType === 'scaler' ? 'bg-green-500' : 'bg-gray-500'
                            }`}></div>
                            <div>
                              <div className="font-medium">{file.fileName}</div>
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="capitalize">{file.fileType}</span>
                                <span>•</span>
                                <span>{formatBytes(file.fileSize)}</span>
                                <span>•</span>
                                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFile(file.id, file.fileName)}
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => onDownload(model.id, model.fileName)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Model Files
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}