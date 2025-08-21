import React, { useState } from 'react';
import { EnhancedModelUpload } from './enhanced-model-upload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  MoreVertical
} from 'lucide-react';

interface ModelFolder {
  id: string;
  name: string;
  description: string;
  modelCount: number;
  models: FolderModel[];
}

interface FolderModel {
  id: string;
  name: string;
  status: 'ready' | 'training' | 'draft';
}

// Sample folder data matching the image
const sampleFolders: ModelFolder[] = [
  {
    id: 'user-models',
    name: 'User Models',
    description: 'Your uploaded AI models',
    modelCount: 0,
    models: []
  },
  {
    id: 'quality-control',
    name: 'Quality Control',
    description: 'Models for product quality prediction',
    modelCount: 3,
    models: [
      { id: 'qc1', name: 'Assembly Line Quality Classifier', status: 'ready' },
      { id: 'qc2', name: 'Surface Defect Detector', status: 'ready' },
      { id: 'qc3', name: 'Material Grade Classifier', status: 'draft' }
    ]
  },
  {
    id: 'predictive-maintenance',
    name: 'Predictive Maintenance',
    description: 'Equipment maintenance forecasting models',
    modelCount: 2,
    models: [
      { id: 'pm1', name: 'Vibration Analysis Model', status: 'ready' },
      { id: 'pm2', name: 'Temperature Trend Predictor', status: 'training' }
    ]
  },
  {
    id: 'demand-forecasting',
    name: 'Demand Forecasting',
    description: 'Sales and inventory prediction models',
    modelCount: 1,
    models: [
      { id: 'df1', name: 'Monthly Demand Forecaster', status: 'ready' }
    ]
  }
];

export default function AIModelManagementTab() {
  const [activeTab, setActiveTab] = useState('uploaded');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for backend models
  const { data: backendModels, isLoading } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: () => fetch('/api/ai-models').then(res => res.json()),
  });

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const viewAllModels = (folderId: string) => {
    toast({ title: "View Models", description: `Viewing all models in ${folderId}` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">ready</Badge>;
      case 'training':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">training</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">draft</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Model Management</h1>
            <p className="text-gray-600 mt-1">Upload, organize, and manage your AI models</p>
          </div>
          <Button 
            onClick={() => setShowUploadDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-upload-model"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Model
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-80 h-10 bg-gray-100">
            <TabsTrigger value="uploaded" className="text-sm font-medium">Uploaded Models</TabsTrigger>
            <TabsTrigger value="prebuilt" className="text-sm font-medium">Pre-built AI Models</TabsTrigger>
          </TabsList>

          <TabsContent value="uploaded" className="space-y-8 mt-6">
          {/* Central Upload Section */}
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Upload AI Models</h3>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowUploadDialog(true)}
                  data-testid="button-new-folder"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Folder
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-6">Upload trained AI models in various formats</p>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50"
                onClick={() => setShowUploadDialog(true)}
                data-testid="drag-drop-upload-area"
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Drag & Drop Model Files</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Supported formats: .pkl, .joblib, .h5, .onnx, .pt, .zip, .pth
                </p>
                <p className="text-xs text-gray-500 mb-6">Maximum file size: 500MB</p>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
                  data-testid="button-browse-files"
                >
                  Browse Files
                </Button>
              </div>
            </div>
          </div>

          {/* Model Folders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleFolders.map((folder) => (
              <Card key={folder.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold text-gray-900 truncate">{folder.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{folder.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-sm font-medium text-gray-700">{folder.modelCount}</span>
                      <span className="text-xs text-gray-500">models</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => viewAllModels(folder.id)}
                        data-testid={`button-view-all-${folder.id}`}
                        className="ml-2 h-6 w-6 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {folder.models.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {folder.models.slice(0, 3).map((model) => (
                        <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">{model.name}</span>
                            {getStatusBadge(model.status)}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Settings className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {folder.models.length > 3 && (
                        <Button 
                          variant="link" 
                          className="text-blue-600 text-sm p-0 h-auto w-full text-center"
                          onClick={() => viewAllModels(folder.id)}
                          data-testid={`button-view-all-models-${folder.id}`}
                        >
                          View All Models
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          </TabsContent>

          <TabsContent value="prebuilt" className="space-y-6 mt-6">
            <div className="text-center py-12">
              <p className="text-gray-500">Pre-built AI models coming soon.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Upload Dialog */}
      <EnhancedModelUpload 
        isOpen={showUploadDialog} 
        onClose={() => setShowUploadDialog(false)} 
      />
    </div>
  );
}