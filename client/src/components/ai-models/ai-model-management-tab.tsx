import React, { useState } from 'react';
import { EnhancedModelUpload } from './enhanced-model-upload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Play,
  Settings,
  Download,
  Search,
  Filter
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'ready' | 'training' | 'pending';
  accuracy?: number;
  size: string;
  createdAt: string;
}

// Sample data matching the image design
const sampleModels: AIModel[] = [
  {
    id: '1',
    name: 'Traffic Flow Predictor',
    description: 'Predicts traffic flow patterns based on historical data',
    type: 'LSTM Time Series',
    status: 'ready',
    accuracy: 94.2,
    size: '45.2 MB',
    createdAt: '2024-01-15'
  },
  {
    id: '2', 
    name: 'Demand Forecasting Model',
    description: 'Forecasts product demand using multiple variables',
    type: 'Random Forest + LSTM',
    status: 'training',
    size: '78.6 MB',
    createdAt: '2024-01-14'
  },
  {
    id: '3',
    name: 'Anomaly Detection',
    description: 'Detects anomalies in sensor data streams',
    type: 'Autoencoder + SVM',
    status: 'pending',
    size: '67.4 MB',
    createdAt: '2024-01-13'
  }
];

export default function AIModelManagementTab() {
  const [activeTab, setActiveTab] = useState('uploaded');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for backend models
  const { data: backendModels, isLoading } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: () => fetch('/api/ai-models').then(res => res.json()),
  });

  // Combine backend data with sample data
  const allModels = React.useMemo(() => {
    const realModels = (backendModels || []).map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description || '',
      type: model.modelType || 'Unknown',
      status: model.trainingStatus === 'ready' ? 'ready' : 
              model.trainingStatus === 'training' ? 'training' : 'pending',
      accuracy: model.accuracy ? Math.round(model.accuracy * 10) / 10 : undefined,
      size: `${(model.fileSize / (1024 * 1024)).toFixed(1)} MB`,
      createdAt: model.createdAt
    }));
    
    return [...realModels, ...sampleModels];
  }, [backendModels]);

  const filteredModels = allModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || model.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800 border-green-200">ready</Badge>;
      case 'training':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">training</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAccuracyDisplay = (accuracy?: number) => {
    if (accuracy) {
      return `Accuracy: ${accuracy}%`;
    }
    return '';
  };

  const handleTest = (modelId: string) => {
    toast({ title: "Test Started", description: `Testing model ${modelId}` });
  };

  const handleConfig = (modelId: string) => {
    toast({ title: "Configuration", description: `Opening configuration for model ${modelId}` });
  };

  const handleDownload = (modelId: string) => {
    toast({ title: "Download Started", description: `Downloading model ${modelId}` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Model Management</h2>
          <p className="text-gray-600 mt-1">Upload, organize, and manage your AI models for workflow integration</p>
        </div>
        <Button 
          onClick={() => setShowUploadDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="button-upload-new-model"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload New Model
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="uploaded">Uploaded Models</TabsTrigger>
          <TabsTrigger value="organization">Model Organization</TabsTrigger>
          <TabsTrigger value="prebuilt">Pre-built Models</TabsTrigger>
        </TabsList>

        <TabsContent value="uploaded" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-models"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                data-testid="select-category-filter"
              >
                <option>All Categories</option>
                <option>Classification</option>
                <option>Regression</option>
                <option>Time Series</option>
                <option>Deep Learning</option>
              </select>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                data-testid="select-status-filter"
              >
                <option>All Status</option>
                <option>Ready</option>
                <option>Training</option>
                <option>Pending</option>
              </select>
            </div>
          </div>

          {/* Model Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((model) => (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold mb-1">{model.name}</CardTitle>
                      <p className="text-sm text-gray-600 mb-2">{model.type}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{model.description}</p>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(model.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      {getAccuracyDisplay(model.accuracy)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {model.size}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTest(model.id)}
                        disabled={model.status !== 'ready'}
                        data-testid={`button-test-${model.id}`}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleConfig(model.id)}
                        data-testid={`button-config-${model.id}`}
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Config
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownload(model.id)}
                        data-testid={`button-download-${model.id}`}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No models found matching your criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Model organization features coming soon.</p>
          </div>
        </TabsContent>

        <TabsContent value="prebuilt" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Pre-built models coming soon.</p>
          </div>
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