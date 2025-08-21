import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  FolderOpen,
  Eye,
  Edit3,
  Trash2,
  MoreVertical,
  ChevronLeft,
  Brain,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleNodeWorkflow } from '../ai-fac/simple-node-workflow';

interface ModelConfigurationFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface ModelConfiguration {
  id: string;
  folderId?: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'testing' | 'error';
  nodes: any[];
  connections: any[];
  createdAt: string;
  updatedAt: string;
}

interface ModelConfigurationManagerProps {
  onTestWorkflow: () => void;
}

export function ModelConfigurationManager({ onTestWorkflow }: ModelConfigurationManagerProps) {
  const [selectedFolder, setSelectedFolder] = useState<ModelConfigurationFolder | null>(null);
  const [selectedConfiguration, setSelectedConfiguration] = useState<ModelConfiguration | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch configuration folders
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['/api/model-configuration-folders'],
    queryFn: async (): Promise<ModelConfigurationFolder[]> => {
      // Mock data for now - replace with actual API call
      return [
        {
          id: 'folder-1',
          name: 'AI Model Test',
          description: 'AI Model의 테스트 하기 위한 목록입니다.',
          color: '#3B82F6',
          icon: 'Brain',
          createdAt: '2025-01-21T10:00:00Z',
          updatedAt: '2025-01-21T10:00:00Z'
        }
      ];
    }
  });

  // Fetch configurations for selected folder
  const { data: configurations = [], isLoading: configurationsLoading } = useQuery({
    queryKey: ['/api/model-configurations', selectedFolder?.id],
    queryFn: async (): Promise<ModelConfiguration[]> => {
      if (!selectedFolder) return [];
      // Mock data for now - replace with actual API call
      return [
        {
          id: 'config-1',
          folderId: selectedFolder.id,
          name: 'AI Model Test Configuration',
          description: undefined,
          status: 'draft',
          nodes: [],
          connections: [],
          createdAt: '2025-01-21T10:30:00Z',
          updatedAt: '2025-01-21T10:30:00Z'
        }
      ];
    },
    enabled: !!selectedFolder
  });

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setSelectedConfiguration(null);
    setShowEditor(false);
  };

  const handleEditConfiguration = (config: ModelConfiguration) => {
    setSelectedConfiguration(config);
    setShowEditor(true);
  };

  const handleNewConfiguration = () => {
    if (!selectedFolder) return;
    
    const newConfig: ModelConfiguration = {
      id: `config-${Date.now()}`,
      folderId: selectedFolder.id,
      name: 'New Configuration',
      description: undefined,
      status: 'draft',
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setSelectedConfiguration(newConfig);
    setShowEditor(true);
  };

  const handleNewFolder = () => {
    toast({
      title: "새 폴더 생성",
      description: "새 모델 구성 폴더를 생성하는 기능을 준비 중입니다."
    });
  };

  // If showing editor
  if (showEditor && selectedConfiguration) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setShowEditor(false)}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Configurations
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedConfiguration.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Configure AI model workflow with visual node editor
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                className="flex items-center space-x-2"
                onClick={onTestWorkflow}
                data-testid="button-test-workflow"
              >
                <Eye className="w-4 h-4" />
                <span>Test</span>
              </Button>
              <Button 
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Save</span>
              </Button>
            </div>
          </div>
        </div>

        <SimpleNodeWorkflow 
          configurationId={selectedConfiguration.id}
          onSave={(workflow) => {
            toast({
              title: "구성 저장됨",
              description: "워크플로우 구성이 성공적으로 저장되었습니다."
            });
          }}
        />
      </div>
    );
  }

  // If folder is selected, show configurations
  if (selectedFolder) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToFolders}
            className="mb-4"
            data-testid="button-back-to-folders"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Folders
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedFolder.name}</h1>
              <p className="text-gray-600 mt-1">{selectedFolder.description}</p>
            </div>
            <Button 
              onClick={handleNewConfiguration}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-new-configuration"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Configuration
            </Button>
          </div>
        </div>

        {/* Configurations List */}
        <div className="space-y-4">
          {configurationsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading configurations...</p>
            </div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Configurations</h3>
              <p className="text-gray-500 mb-4">Create your first AI model configuration.</p>
              <Button onClick={handleNewConfiguration}>
                <Plus className="w-4 h-4 mr-2" />
                New Configuration
              </Button>
            </div>
          ) : (
            configurations.map((config) => (
              <Card key={config.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Brain className="w-8 h-8 text-purple-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">{config.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={config.status === 'draft' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {config.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(config.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            Modified: Invalid Date
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditConfiguration(config)}
                        data-testid={`button-edit-${config.id}`}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-view-${config.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Show folders list
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Model Configuration</h1>
            <p className="text-gray-600 mt-1">Create and manage AI model workflows</p>
          </div>
          <Button 
            onClick={handleNewFolder}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-new-folder"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {foldersLoading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Loading folders...</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Folders</h3>
            <p className="text-gray-500 mb-4">Create your first configuration folder.</p>
            <Button onClick={handleNewFolder}>
              <Plus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </div>
        ) : (
          folders.map((folder) => (
            <Card 
              key={folder.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedFolder(folder)}
              data-testid={`folder-${folder.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: folder.color + '20' }}
                  >
                    <Brain className="w-6 h-6" style={{ color: folder.color }} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <h3 className="font-semibold text-lg mb-2">{folder.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{folder.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created {new Date(folder.createdAt).toLocaleDateString()}</span>
                  <Badge variant="outline" className="text-xs">
                    0 configs
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}