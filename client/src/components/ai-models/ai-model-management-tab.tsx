import React, { useState } from 'react';
import { EnhancedModelUpload } from './enhanced-model-upload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { 
  Upload, 
  Folder, 
  Brain, 
  Search, 
  Filter, 
  MoreVertical, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Settings,
  Database,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  type: string;
  status: 'ready' | 'training' | 'pending' | 'error';
  uploadDate: string;
  size: string;
  accuracy?: string;
  framework: string;
  description?: string;
  category: string;
}

interface ModelFolder {
  id: string;
  name: string;
  description: string;
  modelCount: number;
  color: string;
}

export default function AIModelManagementTab() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Sample data - replace with actual API calls
  const sampleModels: AIModel[] = [
    {
      id: 'model-1',
      name: 'Traffic Flow Predictor',
      type: 'LSTM',
      status: 'ready',
      uploadDate: '2024-01-15',
      size: '45.2 MB',
      accuracy: '94.2%',
      framework: 'PyTorch',
      description: 'Predicts traffic flow patterns based on historical data',
      category: 'time-series'
    },
    {
      id: 'model-2',
      name: 'Demand Forecasting Model',
      type: 'Random Forest',
      status: 'training',
      uploadDate: '2024-01-14',
      size: '12.8 MB',
      framework: 'Scikit-learn',
      description: 'Forecasts product demand using multiple variables',
      category: 'regression'
    },
    {
      id: 'model-3',
      name: 'Anomaly Detection',
      type: 'Autoencoder',
      status: 'pending',
      uploadDate: '2024-01-13',
      size: '67.4 MB',
      framework: 'TensorFlow',
      description: 'Detects anomalies in sensor data streams',
      category: 'anomaly-detection'
    }
  ];

  const sampleFolders: ModelFolder[] = [
    { id: 'f1', name: 'Time Series Models', description: 'Models for temporal data analysis', modelCount: 8, color: 'blue' },
    { id: 'f2', name: 'Classification Models', description: 'Binary and multi-class classifiers', modelCount: 12, color: 'green' },
    { id: 'f3', name: 'Regression Models', description: 'Predictive regression models', modelCount: 6, color: 'purple' },
    { id: 'f4', name: 'Computer Vision', description: 'Image and video analysis models', modelCount: 15, color: 'orange' }
  ];

  const { data: aiModels = [] } = useQuery({
    queryKey: ['/api/ai-models'],
    initialData: sampleModels
  });

  const filteredModels = aiModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || model.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'training': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'training': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="uploaded" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="uploaded">Uploaded Models</TabsTrigger>
          <TabsTrigger value="folders">Model Organization</TabsTrigger>
          <TabsTrigger value="prebuilt">Pre-built Models</TabsTrigger>
        </TabsList>

        {/* Uploaded Models Tab */}
        <TabsContent value="uploaded" className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <h2 className="text-2xl font-bold">AI Model Management</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Upload, organize, and manage your AI models for workflow integration
              </p>
            </div>
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New Model
            </Button>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search models..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="time-series">Time Series</option>
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                    <option value="anomaly-detection">Anomaly Detection</option>
                  </select>
                  
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="ready">Ready</option>
                    <option value="training">Training</option>
                    <option value="pending">Pending</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Models List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model) => (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-sm font-semibold">{model.name}</CardTitle>
                        <p className="text-xs text-gray-500">{model.type} • {model.framework}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(model.status)}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getStatusColor(model.status)}>
                      {model.status}
                    </Badge>
                    <span className="text-xs text-gray-500">{model.size}</span>
                  </div>
                  
                  {model.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">{model.description}</p>
                  )}
                  
                  {model.accuracy && (
                    <div className="text-xs">
                      <span className="text-gray-500">Accuracy: </span>
                      <span className="font-medium text-green-600">{model.accuracy}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-1 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                      <Play className="w-3 h-3 mr-1" />
                      Test
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                      <Settings className="w-3 h-3 mr-1" />
                      Config
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredModels.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No models found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Upload your first AI model to get started.'}
                </p>
                {(!searchTerm && selectedCategory === 'all' && selectedStatus === 'all') && (
                  <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Model
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Model Folders Tab */}
        <TabsContent value="folders" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Model Organization</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Organize your models into folders for better management
              </p>
            </div>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleFolders.map((folder) => (
              <Card key={folder.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${folder.color}-100`}>
                      <Folder className={`w-5 h-5 text-${folder.color}-600`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{folder.name}</CardTitle>
                      <p className="text-xs text-gray-500">{folder.modelCount} models</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{folder.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pre-built Models Tab */}
        <TabsContent value="prebuilt" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Pre-built Models</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Ready-to-use models for common AI tasks
            </p>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Super Admin Approval System</p>
                  <p className="text-blue-700">Pre-built models require Super Admin approval before use. Contact your system administrator to request access to pending models.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Upload Dialog */}
      <EnhancedModelUpload 
        isOpen={showUploadDialog} 
        onClose={() => setShowUploadDialog(false)} 
      />
    </div>
  );
}