import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  Brain, 
  Plus, 
  Settings, 
  Play,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Database,
  Zap,
  Folder,
  FolderOpen,
  Trash2,
  MoreVertical,
  Download,
  Search,
  Filter,
  X
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'ready' | 'training' | 'error' | 'draft';
  accuracy: number;
  createdAt: string;
  lastUsed?: string;
  inputSchema: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  outputSchema: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

interface ModelFolder {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  modelCount: number;
}

interface UploadedModel {
  id: string;
  name: string;
  type: string;
  fileName: string;
  folderId: string;
  status: 'ready' | 'training' | 'error' | 'draft';
  accuracy?: number;
  uploadedAt: string;
  size: string;
}

interface PrebuiltModel {
  id: string;
  name: string;
  description: string;
  category: 'Quality Control' | 'Predictive Maintenance' | 'Demand Forecasting' | 'Supply Chain' | 'Energy Optimization' | 'Safety Management';
  status: 'approved' | 'pending' | 'rejected';
  accuracy: number;
  version: string;
  tags: string[];
}

const sampleFolders: ModelFolder[] = [
  { id: 'quality-control', name: 'Quality Control', description: 'Models for product quality prediction', createdAt: '2024-01-10', modelCount: 3 },
  { id: 'maintenance', name: 'Predictive Maintenance', description: 'Equipment maintenance forecasting models', createdAt: '2024-01-08', modelCount: 2 },
  { id: 'demand-forecasting', name: 'Demand Forecasting', description: 'Sales and inventory prediction models', createdAt: '2024-01-05', modelCount: 1 },
];

const sampleUploadedModels: UploadedModel[] = [
  { id: '1', name: 'Assembly Line Quality Classifier', type: 'Classification', fileName: 'assembly_line_quality_classifier.pkl', folderId: 'quality-control', status: 'ready', accuracy: 94.2, uploadedAt: '2024-01-15T14:30:00Z', size: '12.5 MB' },
  { id: '2', name: 'Surface Defect Detector', type: 'Deep Learning', fileName: 'surface_defect_detector.h5', folderId: 'quality-control', status: 'ready', accuracy: 91.8, uploadedAt: '2024-01-14T10:15:00Z', size: '45.2 MB' },
  { id: '3', name: 'Material Grade Classifier', type: 'Classification', fileName: 'material_grade_classifier.joblib', folderId: 'quality-control', status: 'draft', uploadedAt: '2024-01-13T16:45:00Z', size: '8.7 MB' },
  { id: '4', name: 'Vibration Analysis Model', type: 'Regression', fileName: 'vibration_analysis_rf.pkl', folderId: 'maintenance', status: 'ready', accuracy: 87.5, uploadedAt: '2024-01-12T09:20:00Z', size: '15.3 MB' },
  { id: '5', name: 'Temperature Trend Predictor', type: 'Time Series', fileName: 'temp_trend_lstm.h5', folderId: 'maintenance', status: 'training', uploadedAt: '2024-01-11T13:30:00Z', size: '28.9 MB' },
  { id: '6', name: 'Monthly Demand Forecaster', type: 'Regression', fileName: 'monthly_demand_forecaster.pkl', folderId: 'demand-forecasting', status: 'ready', accuracy: 89.1, uploadedAt: '2024-01-10T11:00:00Z', size: '22.1 MB' },
];

const prebuiltModels: PrebuiltModel[] = [
  { id: 'pb1', name: 'Quality Control Model', description: 'Predict product quality based on production parameters', category: 'Quality Control', status: 'approved', accuracy: 94.2, version: '2.1.0', tags: ['quality', 'production', 'classification'] },
  { id: 'pb2', name: 'Maintenance Predictor', description: 'Forecast equipment maintenance requirements', category: 'Predictive Maintenance', status: 'approved', accuracy: 87.5, version: '1.8.1', tags: ['maintenance', 'equipment', 'forecasting'] },
  { id: 'pb3', name: 'Demand Forecasting', description: 'Predict future product demand and inventory needs', category: 'Demand Forecasting', status: 'pending', accuracy: 89.1, version: '3.0.2', tags: ['demand', 'inventory', 'forecasting'] },
  { id: 'pb4', name: 'Risk Assessment', description: 'Evaluate supplier and supply chain risks', category: 'Supply Chain', status: 'rejected', accuracy: 91.8, version: '1.5.0', tags: ['risk', 'supply-chain', 'assessment'] },
  { id: 'pb5', name: 'Energy Consumption Optimizer', description: 'Optimize energy usage across manufacturing processes', category: 'Energy Optimization', status: 'approved', accuracy: 88.3, version: '2.0.1', tags: ['energy', 'optimization', 'efficiency'] },
  { id: 'pb6', name: 'Safety Incident Predictor', description: 'Predict potential safety incidents based on environmental factors', category: 'Safety Management', status: 'approved', accuracy: 92.7, version: '1.4.2', tags: ['safety', 'incident', 'prediction'] },
  { id: 'pb7', name: 'Production Line Optimizer', description: 'Optimize production line efficiency and throughput', category: 'Quality Control', status: 'pending', accuracy: 86.9, version: '1.2.3', tags: ['production', 'optimization', 'efficiency'] },
  { id: 'pb8', name: 'Inventory Level Predictor', description: 'Predict optimal inventory levels for different products', category: 'Demand Forecasting', status: 'approved', accuracy: 90.4, version: '2.3.1', tags: ['inventory', 'prediction', 'optimization'] },
  { id: 'pb9', name: 'Equipment Failure Detector', description: 'Early detection of equipment failures and anomalies', category: 'Predictive Maintenance', status: 'approved', accuracy: 93.1, version: '1.9.0', tags: ['equipment', 'failure', 'detection'] },
  { id: 'pb10', name: 'Supplier Performance Evaluator', description: 'Evaluate and rank supplier performance metrics', category: 'Supply Chain', status: 'pending', accuracy: 87.2, version: '1.1.4', tags: ['supplier', 'performance', 'evaluation'] },
];

interface AIModelManagementTabProps {
  activeTab?: string;
}

export default function AIModelManagementTab({ activeTab: propActiveTab }: AIModelManagementTabProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [detailFolderId, setDetailFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedPrebuiltModel, setSelectedPrebuiltModel] = useState<PrebuiltModel | null>(null);
  const [selectedUploadedModel, setSelectedUploadedModel] = useState<string>('');
  
  // Map sidebar menu items to internal tab structure
  const getInternalTab = (sidebarTab?: string) => {
    switch (sidebarTab) {
      case 'model-upload':
        return 'uploaded';
      case 'model-configuration':
        return 'configuration';
      default:
        return 'uploaded';
    }
  };
  
  const [activeTab, setActiveTab] = useState(() => getInternalTab(propActiveTab));
  
  // Update internal tab when prop changes
  React.useEffect(() => {
    setActiveTab(getInternalTab(propActiveTab));
  }, [propActiveTab]);

  const [uploadConfig, setUploadConfig] = useState({
    name: '',
    type: 'classification',
    file: null as File | null,
    folderId: ''
  });

  const [newFolder, setNewFolder] = useState({
    name: '',
    description: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadModelMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return fetch('/api/ai-models/upload', {
        method: 'POST',
        body: formData,
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
      toast({ title: "Success", description: "AI model uploaded successfully." });
      setShowUploadDialog(false);
      setUploadConfig({ name: '', type: 'classification', file: null, folderId: '' });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload AI model.", variant: "destructive" });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (folderData: typeof newFolder) => {
      return fetch('/api/ai-models/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Folder created successfully." });
      setShowFolderDialog(false);
      setNewFolder({ name: '', description: '' });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" });
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      return fetch(`/api/ai-models/${modelId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Model deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete model.", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadConfig(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = () => {
    if (!uploadConfig.file || !uploadConfig.name || !uploadConfig.folderId) return;

    const formData = new FormData();
    formData.append('file', uploadConfig.file);
    formData.append('name', uploadConfig.name);
    formData.append('type', uploadConfig.type);
    formData.append('folderId', uploadConfig.folderId);

    uploadModelMutation.mutate(formData);
  };

  const handleCreateFolder = () => {
    if (!newFolder.name) return;
    createFolderMutation.mutate(newFolder);
  };

  const handleDeleteModel = (modelId: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      deleteModelMutation.mutate(modelId);
    }
  };

  const getFilteredModels = (folderId: string) => {
    return sampleUploadedModels.filter(model => model.folderId === folderId);
  };

  const handleViewAllModels = (folderId: string) => {
    setDetailFolderId(folderId);
    setViewMode('detail');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setDetailFolderId(null);
  };

  const handleApplyModel = (model: PrebuiltModel) => {
    if (model.status !== 'approved') return;
    setSelectedPrebuiltModel(model);
    setShowApplyDialog(true);
  };

  const confirmApplyModel = () => {
    if (!selectedPrebuiltModel || !selectedUploadedModel) return;
    
    toast({
      title: "Model Applied Successfully",
      description: `${selectedPrebuiltModel.name} has been applied using ${sampleUploadedModels.find(m => m.id === selectedUploadedModel)?.name}`,
    });
    
    setShowApplyDialog(false);
    setSelectedPrebuiltModel(null);
    setSelectedUploadedModel('');
  };

  const filteredPrebuiltModels = prebuiltModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || model.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['all', ...Array.from(new Set(prebuiltModels.map(m => m.category)))];
  const statuses = ['all', 'approved', 'pending', 'rejected'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Model Management</h1>
          <p className="text-gray-600">Upload, configure, and manage your AI models</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Model
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="uploaded">Uploaded Models</TabsTrigger>
          <TabsTrigger value="prebuilt">Pre-built AI Models</TabsTrigger>
        </TabsList>

        <TabsContent value="uploaded" className="space-y-6">
          <div className="space-y-6">
            {viewMode === 'grid' && (
              <>
                {/* Upload Zone */}
                <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Upload AI Models
                    </CardTitle>
                    <p className="text-sm text-gray-600">Upload trained AI models in various formats</p>
                  </div>
                  <Button onClick={() => setShowFolderDialog(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                  onClick={() => setShowUploadDialog(true)}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Drag & Drop Model Files</h3>
                  <p className="text-gray-600 mb-4">
                    Supported formats: .pkl, .joblib, .h5, .onnx, .pb, .pt, .pth
                  </p>
                  <p className="text-sm text-gray-500 mb-4">Maximum file size: 500MB</p>
                  <Button onClick={() => setShowUploadDialog(true)} size="lg">
                    <Upload className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Model Folders */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-lg">{folder.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">{folder.modelCount} models</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{folder.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-gray-500 mb-4">
                      Created: {new Date(folder.createdAt).toLocaleDateString()}
                    </div>
                    
                    {/* Models in this folder */}
                    <div className="space-y-2 mb-4">
                      {getFilteredModels(folder.id).slice(0, 3).map((model) => (
                        <div key={model.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{model.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-xs ${
                              model.status === 'ready' ? 'bg-green-100 text-green-800' :
                              model.status === 'training' ? 'bg-blue-100 text-blue-800' :
                              model.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {model.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteModel(model.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {getFilteredModels(folder.id).length > 3 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{getFilteredModels(folder.id).length - 3} more models
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleViewAllModels(folder.id)}
                    >
                      View All Models
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
              </>
            )}

            {/* Detail view for specific folder */}
            {viewMode === 'detail' && detailFolderId && (
              <div className="space-y-6">
                {/* Header with back button */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleBackToGrid}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Folders
                  </Button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {sampleFolders.find(f => f.id === detailFolderId)?.name} Models
                    </h2>
                    <p className="text-gray-600">
                      {sampleFolders.find(f => f.id === detailFolderId)?.description}
                    </p>
                  </div>
                </div>

                {/* Models grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredModels(detailFolderId).map((model) => (
                    <Card key={model.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <CardTitle className="text-lg">{model.name}</CardTitle>
                          </div>
                          <Badge className={
                            model.status === 'ready' ? 'bg-green-100 text-green-800' :
                            model.status === 'training' ? 'bg-blue-100 text-blue-800' :
                            model.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {model.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{model.type}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Model Info */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">File:</span>
                            <span className="font-medium truncate">{model.fileName}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Size:</span>
                            <span className="font-medium">{model.size}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Uploaded:</span>
                            <span className="font-medium">{new Date(model.uploadedAt).toLocaleDateString()}</span>
                          </div>
                          {model.accuracy && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Accuracy:</span>
                              <span className="font-medium text-green-600">{model.accuracy}%</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled={model.status !== 'ready'}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Test
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteModel(model.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Empty state */}
                {getFilteredModels(detailFolderId).length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Models in This Folder</h3>
                      <p className="text-gray-600 mb-4">
                        This folder is empty. Upload your first AI model to get started.
                      </p>
                      <Button onClick={() => setShowUploadDialog(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Model
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="prebuilt" className="space-y-6">
          <div className="space-y-6">
            {/* Search and Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Pre-built AI Models
                </CardTitle>
                <p className="text-sm text-gray-600">Ready-to-use AI models provided by CP Platform (Super Admin approval required)</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search models by name, description, or tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status Filter */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>
                        {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Results count */}
                <div className="mb-4 text-sm text-gray-600">
                  Showing {filteredPrebuiltModels.length} of {prebuiltModels.length} models
                </div>
              </CardContent>
            </Card>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrebuiltModels.map((model) => (
                <Card key={model.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {model.status === 'approved' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {model.status === 'pending' && <Clock className="w-4 h-4 text-yellow-600" />}
                        {model.status === 'rejected' && <AlertCircle className="w-4 h-4 text-red-600" />}
                        <h4 className="font-medium text-gray-900">{model.name}</h4>
                      </div>
                      <Badge className={
                        model.status === 'approved' ? 'bg-green-100 text-green-800' :
                        model.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {model.status === 'approved' ? 'Approved' : 
                         model.status === 'pending' ? 'Pending' : 'Not Approved'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">{model.category}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">{model.description}</p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {model.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Metrics */}
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Accuracy:</span> {model.accuracy}% • 
                      <span className="font-medium"> Version:</span> {model.version}
                    </div>

                    {/* Action Button */}
                    <Button 
                      size="sm" 
                      className={`w-full ${
                        model.status === 'approved' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      disabled={model.status !== 'approved'}
                      onClick={() => handleApplyModel(model)}
                    >
                      {model.status === 'approved' ? 'Apply Model' :
                       model.status === 'pending' ? 'Awaiting Approval' :
                       'Contact Super Admin'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty state */}
            {filteredPrebuiltModels.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Models Found</h3>
                  <p className="text-gray-600 mb-4">
                    No models match your current search and filter criteria.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                      setSelectedStatus('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Super Admin Notice */}
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload AI Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={uploadConfig.name}
                onChange={(e) => setUploadConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter model name"
              />
            </div>
            
            <div>
              <Label htmlFor="model-folder">Folder</Label>
              <select
                id="model-folder"
                value={uploadConfig.folderId}
                onChange={(e) => setUploadConfig(prev => ({ ...prev, folderId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a folder</option>
                {sampleFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="model-type">Model Type</Label>
              <select
                id="model-type"
                value={uploadConfig.type}
                onChange={(e) => setUploadConfig(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
                <option value="clustering">Clustering</option>
                <option value="nlp">NLP</option>
                <option value="computer_vision">Computer Vision</option>
                <option value="time_series">Time Series</option>
                <option value="deep_learning">Deep Learning</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="model-file">Model File</Label>
              <Input
                id="model-file"
                type="file"
                onChange={handleFileChange}
                accept=".pkl,.joblib,.h5,.onnx,.pb,.pt,.pth"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: .pkl, .joblib, .h5, .onnx, .pb, .pt, .pth
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleUpload}
                disabled={uploadModelMutation.isPending || !uploadConfig.file || !uploadConfig.name || !uploadConfig.folderId}
                className="flex-1"
              >
                {uploadModelMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowUploadDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolder.name}
                onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <Label htmlFor="folder-description">Description</Label>
              <Input
                id="folder-description"
                value={newFolder.description}
                onChange={(e) => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter folder description"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleCreateFolder}
                disabled={!newFolder.name || createFolderMutation.isPending}
                className="flex-1"
              >
                {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowFolderDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Model Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Pre-built Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">{selectedPrebuiltModel?.name}</h4>
              <p className="text-sm text-blue-700">{selectedPrebuiltModel?.description}</p>
            </div>
            
            <div>
              <Label htmlFor="uploaded-model">Select from your uploaded models:</Label>
              <select
                id="uploaded-model"
                value={selectedUploadedModel}
                onChange={(e) => setSelectedUploadedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an uploaded model...</option>
                {sampleUploadedModels.filter(m => m.status === 'ready').map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.type})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The pre-built model configuration will be applied to your selected uploaded model.
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={confirmApplyModel}
                disabled={!selectedUploadedModel}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Apply Model
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowApplyDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}