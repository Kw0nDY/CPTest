import React, { useState } from 'react';
import { EnhancedModelUpload } from './enhanced-model-upload';
import { FolderCreationDialog } from './folder-creation-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Plus, 
  FolderOpen,
  FolderPlus,
  Eye,
  Settings,
  Download,
  MoreVertical,
  Brain,
  Search,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight
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
  const [selectedFolder, setSelectedFolder] = useState<AiModelFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('uploaded');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch folders
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['/api/ai-model-folders'],
    queryFn: async () => {
      const response = await fetch('/api/ai-model-folders');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json() as AiModelFolder[];
    }
  });

  // Fetch AI models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: async () => {
      const response = await fetch('/api/ai-models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as AiModel[];
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-model-folders'] });
      toast({ title: 'Success', description: 'Folder created successfully' });
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

  // Filter folders based on search
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  };;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'uploading': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">processing</Badge>;
      case 'uploading':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">uploading</Badge>;
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
            <p className="text-gray-600 mt-1">Upload, organize, and manage your AI models</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowFolderDialog(true)}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
              data-testid="button-new-folder"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button 
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-upload-model"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Model
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search folders and models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-80 h-10 bg-gray-100">
          <TabsTrigger value="uploaded" className="text-sm font-medium">Uploaded Models</TabsTrigger>
          <TabsTrigger value="prebuilt" className="text-sm font-medium">Pre-built AI Models</TabsTrigger>
        </TabsList>

        <TabsContent value="uploaded" className="space-y-6 mt-6">
          {/* Unorganized Models */}
          {getUnorganizedModels().length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-gray-500" />
                    <CardTitle className="text-lg">Unorganized Models</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {getUnorganizedModels().length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {getUnorganizedModels().map((model) => (
                    <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Brain className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{model.name}</p>
                          <p className="text-xs text-gray-500">{model.fileName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(model.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings className="w-4 h-4 mr-2" />
                              Configure
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteModel(model.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Model
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Folders */}
          {filteredFolders.map((folder) => {
            const folderModels = getModelsForFolder(folder.id);
            const isExpanded = expandedFolders.has(folder.id);

            return (
              <Card key={folder.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      {isExpanded ? 
                        <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      }
                      <FolderOpen className="w-5 h-5" style={{ color: folder.color }} />
                      <div>
                        <CardTitle className="text-lg">{folder.name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">{folder.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {folderModels.length}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    {folderModels.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No models in this folder</p>
                    ) : (
                      <div className="grid gap-3">
                        {folderModels.map((model) => (
                          <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Brain className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="font-medium text-sm">{model.name}</p>
                                <p className="text-xs text-gray-500">{model.fileName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(model.status)}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configure
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteModel(model.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Model
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Empty State */}
          {filteredFolders.length === 0 && getUnorganizedModels().length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Models Found</h3>
                <p className="text-gray-500 text-center mb-6">
                  Get started by uploading your first AI model or creating a folder to organize your models.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowFolderDialog(true)}
                    variant="outline"
                    data-testid="button-create-first-folder"
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Create Folder
                  </Button>
                  <Button 
                    onClick={() => setShowUpload(true)}
                    data-testid="button-upload-first-model"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Model
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prebuilt" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Pre-built Models</h3>
              <p className="text-gray-500 text-center">
                Pre-built AI models will be available in future updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      {showUpload && (
        <EnhancedModelUpload 
          onClose={() => setShowUpload(false)}
          folders={folders}
        />
      )}

      {/* Folder Creation Dialog */}
      {showFolderDialog && (
        <FolderCreationDialog
          onClose={() => setShowFolderDialog(false)}
          onCreate={handleCreateFolder}
        />
      )}
    </div>
  );
}