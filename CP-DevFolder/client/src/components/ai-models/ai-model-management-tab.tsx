import React, { useState } from 'react';
import { EnhancedModelUpload } from './enhanced-model-upload';
import { FolderCreationDialog } from './folder-creation-dialog';
import { FolderEditDialog } from './folder-edit-dialog';
import { ModelsViewDialog } from './models-view-dialog';
import ModelConfigurationTab from './model-configuration-tab';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Plus, 
  FolderOpen,
  Eye,
  Settings,
  Download,
  MoreVertical,
  Brain,
  Edit3,
  Trash2,
  Zap,
  Target,
  TrendingUp,
  Cog,
  ChevronLeft
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}

export default function AIModelManagementTab() {
  const [showUpload, setShowUpload] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showModelsDialog, setShowModelsDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<AiModelFolder | null>(null);
  const [showModelConfiguration, setShowModelConfiguration] = useState(false);
  const [selectedModelForConfig, setSelectedModelForConfig] = useState<AiModel | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch folders
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['/api/ai-model-folders'],
    queryFn: async (): Promise<AiModelFolder[]> => {
      const response = await fetch('/api/ai-model-folders');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    }
  });

  // Fetch AI models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: async (): Promise<AiModel[]> => {
      const response = await fetch('/api/ai-models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json();
    }
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: { name: string; description: string; color: string; icon: string }) => {
      const response = await fetch('/api/ai-model-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });
      if (!response.ok) throw new Error('Failed to create folder');
      return response.json();
    },
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-model-folders'] });
      toast({ 
        title: 'Folder Created Successfully', 
        description: `"${newFolder.name}" folder has been added and is now available for model uploads.`
      });
      setShowFolderDialog(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create folder', variant: 'destructive' });
    }
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch(`/api/ai-model-folders/${folderId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete folder');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-model-folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
      toast({ title: 'Success', description: 'Folder deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete folder', variant: 'destructive' });
    }
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
      toast({ title: 'Success', description: 'Model deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete model', variant: 'destructive' });
    }
  });

  // Get models for a specific folder
  const getModelsForFolder = (folderId: string) => {
    return models.filter(model => model.folderId === folderId);
  };

  // Get models without folder (unorganized)
  const getUnorganizedModels = () => {
    return models.filter(model => !model.folderId);
  };

  const handleCreateFolder = (folderData: { name: string; description: string; color: string; icon: string }) => {
    createFolderMutation.mutate(folderData);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder? Models in this folder will become unorganized.')) {
      deleteFolderMutation.mutate(folderId);
    }
  };

  const handleDeleteModel = (modelId: string) => {
    if (confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
      deleteModelMutation.mutate(modelId);
    }
  };

  const handleEditFolder = (folder: AiModelFolder) => {
    setSelectedFolder(folder);
    setShowEditDialog(true);
  };

  const handleViewModels = (folder: AiModelFolder) => {
    setSelectedFolder(folder);
    setShowModelsDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setSelectedFolder(null);
  };

  const handleCloseModelsDialog = () => {
    setShowModelsDialog(false);
    setSelectedFolder(null);
  };

  const handleOpenModelConfiguration = (model: AiModel) => {
    setSelectedModelForConfig(model);
    setShowModelConfiguration(true);
    setShowModelsDialog(false); // Close the models dialog
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'FolderOpen': return FolderOpen;
      case 'Brain': return Brain;
      case 'Zap': return Zap;
      case 'Target': return Target;
      case 'TrendingUp': return TrendingUp;
      case 'Cog': return Cog;
      default: return FolderOpen;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">ready</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">training</Badge>;
      case 'uploading':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">draft</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">error</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  if (foldersLoading || modelsLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Model Management</h1>
            <p className="text-gray-600 mt-1">Upload, configure, and manage your AI models</p>
          </div>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-upload-model"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Model
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-b-2 border-blue-500 text-blue-600 py-2 px-1 text-sm font-medium">
              Uploaded Models
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 text-sm font-medium">
              Pre-built AI Models
            </button>
          </nav>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-8">
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Drag & Drop Model Files</h3>
                <p className="text-gray-600 mb-1">Supported formats: .pth, .pt, .onnx, .h5, .pkl, .py, .json, .yaml, .csv, .xlsx</p>
                <p className="text-xs text-gray-400">Includes: Model files, Python scripts, Config files, Data files</p>
                <p className="text-xs text-gray-400 mt-2">Maximum file size: 500MB</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowUpload(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-browse-files"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                <Button 
                  onClick={() => setShowFolderDialog(true)}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  data-testid="button-new-folder"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Folders */}
      <div className="space-y-6">
        {/* Database Folders */}
        {folders.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Folders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{folders.map((folder) => {
              const folderModels = getModelsForFolder(folder.id);
              const IconComponent = getIconComponent(folder.icon);
              return (
                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: folder.color + '20' }}>
                          <IconComponent className="w-5 h-5" style={{ color: folder.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{folder.name}</CardTitle>
                          <p className="text-sm text-gray-500">{folder.description}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteFolder(folder.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Created {new Date(folder.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs font-medium text-gray-600">{folderModels.length} models</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {folderModels.slice(0, 3).map((model) => (
                        <div key={model.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{model.name}</span>
                          </div>
                          {getStatusBadge(model.status)}
                        </div>
                      ))}
                      {folderModels.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No models in this folder</p>
                      )}
                    </div>
                    {folderModels.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-3 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleViewModels(folder)}
                        data-testid={`button-view-models-${folder.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View All Models
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>
        )}

        {/* Unorganized Models */}
        {getUnorganizedModels().length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Unorganized Models</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getUnorganizedModels().map((model) => (
                <Card key={model.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold">{model.name}</h4>
                          <p className="text-sm text-gray-500">{model.fileName}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-unorganized-model-actions-${model.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteModel(model.id)}
                            data-testid={`button-delete-unorganized-model-${model.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            모델 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {getStatusBadge(model.status)}
                      <Badge variant="outline" className="text-xs">{model.modelType}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Uploaded {new Date(model.uploadedAt).toLocaleDateString()}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {folders.length === 0 && getUnorganizedModels().length === 0 && (
          <div>
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Models Found</h3>
              <p className="text-gray-600 mb-4">Upload your first AI model or create a folder to organize them</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setShowUpload(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Model
                </Button>
                <Button 
                  onClick={() => setShowFolderDialog(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Folder
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showUpload && (
        <EnhancedModelUpload 
          onClose={() => {
            setShowUpload(false);
            // Force refresh data when upload dialog closes
            queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
            queryClient.invalidateQueries({ queryKey: ['/api/ai-model-folders'] });
          }}
          folders={folders}
        />
      )}

      {showFolderDialog && (
        <FolderCreationDialog
          onClose={() => setShowFolderDialog(false)}
          onCreate={createFolderMutation.mutate}
        />
      )}

      <FolderEditDialog
        isOpen={showEditDialog}
        onClose={handleCloseEditDialog}
        folder={selectedFolder}
      />

      <ModelsViewDialog
        isOpen={showModelsDialog}
        onClose={handleCloseModelsDialog}
        folder={selectedFolder}
        onOpenModelConfiguration={handleOpenModelConfiguration}
      />

      {/* Model Configuration Tab */}
      {showModelConfiguration && selectedModelForConfig && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowModelConfiguration(false)}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Models
                </Button>
                <div className="text-lg font-semibold">Model Configuration - {selectedModelForConfig.name}</div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ModelConfigurationTab selectedModel={selectedModelForConfig} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}