import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'ready' | 'training' | 'error' | 'draft';
  accuracy?: number;
  createdAt: string;
  lastUsed?: string;
  inputSchema: Array<{ name: string; type: string; description: string }>;
  outputSchema: Array<{ name: string; type: string; description: string }>;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

const sampleModels: AIModel[] = [
  {
    id: '1',
    name: 'Customer Classification Model',
    type: 'Classification',
    version: '1.2.0',
    status: 'ready',
    accuracy: 94.2,
    createdAt: '2024-01-10T00:00:00Z',
    lastUsed: '2024-01-15T14:30:00Z',
    inputSchema: [
      { name: 'company_revenue', type: 'number', description: 'Annual company revenue' },
      { name: 'industry_type', type: 'string', description: 'Industry category' },
      { name: 'employee_count', type: 'number', description: 'Number of employees' }
    ],
    outputSchema: [
      { name: 'customer_segment', type: 'string', description: 'Predicted customer segment' },
      { name: 'confidence_score', type: 'number', description: 'Prediction confidence (0-1)' }
    ],
    metrics: {
      accuracy: 94.2,
      precision: 92.8,
      recall: 95.1,
      f1Score: 93.9
    }
  },
  {
    id: '2',
    name: 'Demand Forecasting Model',
    type: 'Regression',
    version: '2.0.1',
    status: 'ready',
    accuracy: 87.5,
    createdAt: '2024-01-05T00:00:00Z',
    lastUsed: '2024-01-14T09:15:00Z',
    inputSchema: [
      { name: 'historical_sales', type: 'array', description: 'Historical sales data' },
      { name: 'seasonality', type: 'string', description: 'Seasonal factors' },
      { name: 'market_trends', type: 'object', description: 'Market trend indicators' }
    ],
    outputSchema: [
      { name: 'predicted_demand', type: 'number', description: 'Forecasted demand' },
      { name: 'confidence_interval', type: 'object', description: 'Prediction confidence interval' }
    ],
    metrics: {
      accuracy: 87.5,
      precision: 85.2,
      recall: 89.1,
      f1Score: 87.1
    }
  },
  {
    id: '3',
    name: 'Production Quality Prediction',
    type: 'Classification',
    version: '1.5.2',
    status: 'ready',
    accuracy: 91.8,
    createdAt: '2024-01-08T00:00:00Z',
    lastUsed: '2024-01-16T10:45:00Z',
    inputSchema: [
      { name: 'temperature', type: 'number', description: 'Production temperature (°C)' },
      { name: 'pressure', type: 'number', description: 'System pressure (bar)' },
      { name: 'humidity', type: 'number', description: 'Environmental humidity (%)' },
      { name: 'material_grade', type: 'string', description: 'Raw material grade' }
    ],
    outputSchema: [
      { name: 'quality_grade', type: 'string', description: 'Predicted quality grade (A/B/C)' },
      { name: 'defect_probability', type: 'number', description: 'Probability of defects (0-1)' }
    ],
    metrics: {
      accuracy: 91.8,
      precision: 89.4,
      recall: 94.2,
      f1Score: 91.7
    }
  },
  {
    id: '4',
    name: 'Equipment Maintenance Predictor',
    type: 'Regression',
    version: '1.0.3',
    status: 'training',
    accuracy: 82.3,
    createdAt: '2024-01-12T00:00:00Z',
    inputSchema: [
      { name: 'operating_hours', type: 'number', description: 'Total operating hours' },
      { name: 'vibration_level', type: 'number', description: 'Vibration amplitude (mm/s)' },
      { name: 'temperature_avg', type: 'number', description: 'Average operating temperature' },
      { name: 'load_factor', type: 'number', description: 'Equipment load factor (%)' }
    ],
    outputSchema: [
      { name: 'days_until_maintenance', type: 'number', description: 'Predicted days until maintenance' },
      { name: 'urgency_level', type: 'string', description: 'Maintenance urgency (Low/Medium/High)' }
    ],
    metrics: {
      accuracy: 82.3,
      precision: 80.1,
      recall: 84.8,
      f1Score: 82.4
    }
  },
  {
    id: '5',
    name: 'Supply Chain Risk Assessment',
    type: 'Classification',
    version: '2.1.0',
    status: 'ready',
    accuracy: 88.9,
    createdAt: '2024-01-03T00:00:00Z',
    lastUsed: '2024-01-16T16:20:00Z',
    inputSchema: [
      { name: 'supplier_location', type: 'string', description: 'Supplier geographic location' },
      { name: 'lead_time', type: 'number', description: 'Average lead time (days)' },
      { name: 'order_volume', type: 'number', description: 'Monthly order volume' },
      { name: 'payment_history', type: 'string', description: 'Payment reliability score' }
    ],
    outputSchema: [
      { name: 'risk_level', type: 'string', description: 'Risk assessment (Low/Medium/High)' },
      { name: 'mitigation_strategy', type: 'string', description: 'Recommended mitigation approach' }
    ],
    metrics: {
      accuracy: 88.9,
      precision: 86.7,
      recall: 91.2,
      f1Score: 88.9
    }
  },
  {
    id: '6',
    name: 'Energy Consumption Optimizer',
    type: 'Regression',
    version: '1.3.1',
    status: 'draft',
    accuracy: 76.4,
    createdAt: '2024-01-14T00:00:00Z',
    inputSchema: [
      { name: 'production_rate', type: 'number', description: 'Current production rate (units/hour)' },
      { name: 'ambient_temperature', type: 'number', description: 'External temperature (°C)' },
      { name: 'equipment_count', type: 'number', description: 'Number of active equipment' },
      { name: 'time_of_day', type: 'string', description: 'Time period (peak/off-peak)' }
    ],
    outputSchema: [
      { name: 'optimal_consumption', type: 'number', description: 'Recommended energy consumption (kWh)' },
      { name: 'savings_potential', type: 'number', description: 'Potential cost savings (%)' }
    ],
    metrics: {
      accuracy: 76.4,
      precision: 74.8,
      recall: 78.1,
      f1Score: 76.4
    }
  }
];

interface AIModelManagementTabProps {
  activeTab?: string;
}

export default function AIModelManagementTab({ activeTab: propActiveTab }: AIModelManagementTabProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Map sidebar menu items to internal tab structure
  const getInternalTab = (sidebarTab?: string) => {
    switch (sidebarTab) {
      case 'model-upload':
        return 'upload';
      case 'model-configuration':
        return 'models';
      case 'model-testing':
        return 'testing';
      default:
        return 'models';
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
    file: null as File | null
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiModels = sampleModels } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: () => Promise.resolve(sampleModels), // Mock data for now
  });

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
      setUploadConfig({ name: '', type: 'classification', file: null });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload AI model.", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      ready: 'bg-green-100 text-green-800',
      training: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'training':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleViewDetails = (model: AIModel) => {
    setSelectedModel(model);
    setShowDetailDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadConfig(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = () => {
    if (!uploadConfig.file || !uploadConfig.name) return;

    const formData = new FormData();
    formData.append('file', uploadConfig.file);
    formData.append('name', uploadConfig.name);
    formData.append('type', uploadConfig.type);

    uploadModelMutation.mutate(formData);
  };

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="models">Configuration</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Upload Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload AI Models
              </CardTitle>
              <p className="text-sm text-gray-600">Upload trained AI models in various formats</p>
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

          {/* Upload Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Model Upload Examples
              </CardTitle>
              <p className="text-sm text-gray-600">Common model types and their use cases</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium">Classification Models</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Customer segmentation, quality control, defect detection</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Formats:</span> .pkl, .joblib, .h5
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium">Regression Models</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Demand forecasting, price prediction, resource optimization</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Formats:</span> .pkl, .onnx, .pb
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <h4 className="font-medium">Deep Learning</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Image recognition, NLP, time series forecasting</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Formats:</span> .h5, .pt, .pth, .onnx
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Upload Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Quick Start Templates
              </CardTitle>
              <p className="text-sm text-gray-600">Pre-configured templates for common manufacturing use cases</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => {
                    setUploadConfig({
                      name: 'Production Quality Classifier',
                      type: 'classification',
                      file: null
                    });
                    setShowUploadDialog(true);
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">Quality Control Model</div>
                    <div className="text-sm text-gray-600">Predict product quality based on production parameters</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => {
                    setUploadConfig({
                      name: 'Predictive Maintenance Model',
                      type: 'regression',
                      file: null
                    });
                    setShowUploadDialog(true);
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">Maintenance Predictor</div>
                    <div className="text-sm text-gray-600">Forecast equipment maintenance requirements</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => {
                    setUploadConfig({
                      name: 'Demand Forecasting Model',
                      type: 'regression',
                      file: null
                    });
                    setShowUploadDialog(true);
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">Demand Forecasting</div>
                    <div className="text-sm text-gray-600">Predict future product demand and inventory needs</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => {
                    setUploadConfig({
                      name: 'Supply Chain Risk Assessment',
                      type: 'classification',
                      file: null
                    });
                    setShowUploadDialog(true);
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">Risk Assessment</div>
                    <div className="text-sm text-gray-600">Evaluate supplier and supply chain risks</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {aiModels.map((model) => (
              <Card key={model.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(model.status)}
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                    </div>
                    <Badge className={getStatusBadge(model.status)}>
                      {model.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{model.type}</span>
                    <span>v{model.version}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  {model.accuracy && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600">Accuracy</span>
                        <span className="font-semibold text-blue-800">{model.accuracy}%</span>
                      </div>
                    </div>
                  )}

                  {/* Schema Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Inputs:</span>
                      <div className="font-medium">{model.inputSchema.length} fields</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Outputs:</span>
                      <div className="font-medium">{model.outputSchema.length} fields</div>
                    </div>
                  </div>

                  {/* Usage Info */}
                  <div className="text-sm">
                    <span className="text-gray-600">Created:</span>
                    <div className="font-medium">
                      {new Date(model.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {model.lastUsed && (
                    <div className="text-sm">
                      <span className="text-gray-600">Last Used:</span>
                      <div className="font-medium">
                        {new Date(model.lastUsed).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(model)}
                      className="flex-1"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Details
                    </Button>
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
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Model Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Test Your AI Models</h3>
                <p className="text-gray-600 mb-4">
                  Test your deployed models with sample data to validate performance and accuracy.
                  Run batch tests and monitor real-time predictions.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    Load Test Data
                  </Button>
                  <Button variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    Run Tests
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Model Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedModel && getStatusIcon(selectedModel.status)}
              {selectedModel?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedModel && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Type</h4>
                  <Badge variant="outline">{selectedModel.type}</Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Version</h4>
                  <span className="text-gray-600">v{selectedModel.version}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <Badge className={getStatusBadge(selectedModel.status)}>
                    {selectedModel.status}
                  </Badge>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-800">{selectedModel.metrics.accuracy}%</div>
                    <div className="text-sm text-green-600">Accuracy</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-800">{selectedModel.metrics.precision}%</div>
                    <div className="text-sm text-blue-600">Precision</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-800">{selectedModel.metrics.recall}%</div>
                    <div className="text-sm text-purple-600">Recall</div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-800">{selectedModel.metrics.f1Score}%</div>
                    <div className="text-sm text-orange-600">F1 Score</div>
                  </div>
                </div>
              </div>

              {/* Input Schema */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Input Schema</h4>
                <div className="space-y-3">
                  {selectedModel.inputSchema.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{field.name}</span>
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">{field.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Output Schema */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Output Schema</h4>
                <div className="space-y-3">
                  {selectedModel.outputSchema.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{field.name}</span>
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">{field.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                placeholder="Customer Classification Model"
              />
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
                <option value="forecasting">Forecasting</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="model-file">Model File</Label>
              <Input
                id="model-file"
                type="file"
                onChange={handleFileChange}
                accept=".pkl,.joblib,.h5,.onnx,.pb"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: .pkl, .joblib, .h5, .onnx, .pb
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleUpload}
                disabled={uploadModelMutation.isPending || !uploadConfig.file || !uploadConfig.name}
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
    </div>
  );
}