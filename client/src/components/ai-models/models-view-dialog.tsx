import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { 
  Brain, 
  FileText, 
  Calendar, 
  HardDrive,
  Activity,
  Zap
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
    </Dialog>
  );
}