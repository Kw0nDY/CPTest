import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Clock, Trash2, Eye, Plus, FolderOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import type { AiModel } from '@shared/schema';

// Upload Form Component
function UploadModelForm({ onSuccess }: { onSuccess: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('model', file);
      
      return fetch('/api/ai-models/upload', {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "모델 업로드 성공",
        description: "AI 모델이 성공적으로 업로드되고 분석되었습니다.",
      });
      setSelectedFile(null);
      setUploadProgress(0);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "모델 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    
    setUploading(true);
    
    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    uploadMutation.mutate(selectedFile, {
      onSettled: () => {
        setUploading(false);
        setUploadProgress(100);
        clearInterval(interval);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Drag & Drop Model Files</h3>
        <p className="text-gray-600 mb-4">
          Supported formats: .pkl, .joblib, .h5, .onnx, .pb, .pt, .pth
        </p>
        <p className="text-sm text-gray-500 mb-4">Maximum file size: 500MB</p>
        
        <input
          type="file"
          accept=".pkl,.joblib,.h5,.onnx,.pb,.pt,.pth"
          onChange={handleFileSelect}
          className="hidden"
          id="model-file-input"
          data-testid="input-model-file"
        />
        <label htmlFor="model-file-input">
          <Button variant="outline" className="cursor-pointer" data-testid="button-browse-files">
            <FileText className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </label>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button 
                onClick={handleUpload} 
                disabled={uploading}
                data-testid="button-upload-model"
              >
                {uploading ? 'Uploading...' : 'Upload Model'}
              </Button>
            </div>
            
            {uploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Model Categories Component
function ModelCategories({ models }: { models: AiModel[] }) {
  const categories = [
    {
      name: "Quality Control",
      description: "AI workflows for quality assurance",
      count: 3,
      models: models.filter(m => m.modelType?.includes('quality') || m.name.toLowerCase().includes('quality')),
      color: "bg-blue-50 border-blue-200"
    },
    {
      name: "Predictive Maintenance", 
      description: "Equipment maintenance forecasting models",
      count: 2,
      models: models.filter(m => m.modelType?.includes('maintenance') || m.name.toLowerCase().includes('maintenance')),
      color: "bg-green-50 border-green-200"
    },
    {
      name: "Demand Forecasting",
      description: "Sales and inventory prediction models", 
      count: 1,
      models: models.filter(m => m.modelType?.includes('forecasting') || m.name.toLowerCase().includes('forecast')),
      color: "bg-purple-50 border-purple-200"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {categories.map((category) => (
        <Card key={category.name} className={`${category.color} hover:shadow-md transition-shadow`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FolderOpen className="h-5 w-5 text-gray-600" />
              <Badge variant="secondary">{category.models.length} models</Badge>
            </div>
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription className="text-sm">
              {category.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-500 mb-2">
              Created: 2024. 1. 10.
            </div>
            {category.models.length > 0 && (
              <div className="space-y-2">
                {category.models.slice(0, 3).map((model) => (
                  <div key={model.id} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="truncate">{model.name}</span>
                    <Badge variant="outline" className="text-xs">ready</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full mt-3" data-testid={`button-view-${category.name.toLowerCase().replace(' ', '-')}`}>
              View All Models
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main Upload Models Component
export default function UploadModels() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['/api/ai-models'],
    refetchInterval: 5000,
  });

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
    setIsUploadDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Model Management</h1>
          <p className="text-gray-600 mt-1">Upload, configure, and manage your AI models</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-upload-model">
              <Upload className="h-4 w-4 mr-2" />
              Upload Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload AI Models</DialogTitle>
              <DialogDescription>
                Upload trained AI models in various formats
              </DialogDescription>
            </DialogHeader>
            <UploadModelForm onSuccess={handleUploadSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="uploaded" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="uploaded">Uploaded Models</TabsTrigger>
          <TabsTrigger value="prebuilt">Pre-built AI Models</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uploaded" className="mt-6">
          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  <CardTitle className="text-lg">Upload AI Models</CardTitle>
                </div>
                <CardDescription>
                  Upload trained AI models in various formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Drag & Drop Model Files</h3>
                  <p className="text-gray-600 mb-4">
                    Supported formats: .pkl, .joblib, .h5, .onnx, .pb, .pt, .pth
                  </p>
                  <p className="text-sm text-gray-500 mb-4">Maximum file size: 500MB</p>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-browse-files-main">
                        <FileText className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Upload AI Model</DialogTitle>
                        <DialogDescription>
                          Select and upload your AI model file
                        </DialogDescription>
                      </DialogHeader>
                      <UploadModelForm onSuccess={handleUploadSuccess} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Model Categories */}
            <ModelCategories models={models} />
          </div>
        </TabsContent>
        
        <TabsContent value="prebuilt" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Pre-built AI Models</h3>
                <p className="text-gray-600">
                  Browse and use pre-configured AI models for common manufacturing use cases
                </p>
                <Button variant="outline" className="mt-4" data-testid="button-browse-prebuilt">
                  Browse Pre-built Models
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}