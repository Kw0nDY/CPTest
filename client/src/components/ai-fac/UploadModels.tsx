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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Clock, Trash2, Eye, Plus, FolderOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import type { AiModel } from '@shared/schema';

// Upload Form Component (팝업용)
function UploadModelForm({ onSuccess }: { onSuccess: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // 폼 데이터
  const [modelName, setModelName] = useState('');
  const [modelType, setModelType] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState('');
  const [version, setVersion] = useState('');
  const [dataFormat, setDataFormat] = useState('');
  const [inputSignature, setInputSignature] = useState('');
  const [outputSignature, setOutputSignature] = useState('');
  const [yamlConfig, setYamlConfig] = useState('');
  
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
      resetForm();
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

  const resetForm = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setModelName('');
    setModelType('');
    setDescription('');
    setFramework('');
    setVersion('');
    setDataFormat('');
    setInputSignature('');
    setOutputSignature('');
    setYamlConfig('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!modelName) {
        setModelName(file.name.split('.')[0]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      if (!modelName) {
        setModelName(file.name.split('.')[0]);
      }
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
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* 1. 모델 파일 업로드 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
          <Label className="text-lg font-semibold">모델 파일 업로드</Label>
          <span className="text-sm text-gray-500">(*.pth/*.pickle/*.h5/*.onnx/*.pkl)</span>
        </div>
        
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-3">
            모델을 여기 영역에 끌어다 놓거나 클릭하세요.
          </p>
          <p className="text-sm text-gray-500 mb-3">
            PTH / Pickle / TensorFlow / ONNX 등을 지원 합니다.
          </p>
          
          <input
            type="file"
            accept=".pkl,.joblib,.h5,.onnx,.pb,.pt,.pth,.pickle"
            onChange={handleFileSelect}
            className="hidden"
            id="model-file-input"
            data-testid="input-model-file"
          />
          <label htmlFor="model-file-input">
            <Button variant="outline" className="cursor-pointer" data-testid="button-browse-files">
              <FileText className="h-4 w-4 mr-2" />
              파일 선택
            </Button>
          </label>
        </div>
        
        {selectedFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">{selectedFile.name}</span>
              <span className="text-sm text-gray-600">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. 모델 시스템 설정 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
          <Label className="text-lg font-semibold">모델 시스템 설정</Label>
          <span className="text-sm text-gray-500">사용할 모델의 기본 설정을 수행합니다.</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="model-name">모델 명</Label>
            <Input
              id="model-name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="ex) stgcn_model"
              data-testid="input-model-name"
            />
          </div>
          <div>
            <Label htmlFor="model-type">모델 타입</Label>
            <Select value={modelType} onValueChange={setModelType}>
              <SelectTrigger data-testid="select-model-type">
                <SelectValue placeholder="모델타입" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classification">Classification</SelectItem>
                <SelectItem value="regression">Regression</SelectItem>
                <SelectItem value="forecasting">Forecasting</SelectItem>
                <SelectItem value="detection">Detection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. 데이터 시그니처 및 타입 설정 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
          <Label className="text-lg font-semibold">데이터 시그니처 및 타입 설정</Label>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="framework">프레임워크</Label>
            <Input
              id="framework"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="ex) pytorch"
              data-testid="input-framework"
            />
          </div>
          <div>
            <Label htmlFor="version">버전</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="ex) 1.0"
              data-testid="input-version"
            />
          </div>
          <div>
            <Label htmlFor="data-format">데이터 포맷</Label>
            <Select value={dataFormat} onValueChange={setDataFormat}>
              <SelectTrigger data-testid="select-data-format">
                <SelectValue placeholder="데이터포맷" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
                <SelectItem value="binary">Binary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label htmlFor="description">설명</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="모델에 대한 설명을 입력하세요"
            data-testid="input-description"
          />
        </div>
      </div>

      {/* 4. 입출력 시그니처 및 타입 설정(선택) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
          <Label className="text-lg font-semibold">입출력 시그니처 및 타입 설정(선택)</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="input-signature">입력(INPUT)</Label>
            <Textarea
              id="input-signature"
              value={inputSignature}
              onChange={(e) => setInputSignature(e.target.value)}
              placeholder="[Type='numerical_sequence', Columns=[4]]"
              className="min-h-[100px]"
              data-testid="textarea-input-signature"
            />
          </div>
          <div>
            <Label htmlFor="output-signature">출력(OUTPUT)</Label>
            <Textarea
              id="output-signature"
              value={outputSignature}
              onChange={(e) => setOutputSignature(e.target.value)}
              placeholder="[Type='anomaly_scores', Columns=['Temperature', 'FP1']]"
              className="min-h-[100px]"
              data-testid="textarea-output-signature"
            />
          </div>
        </div>
      </div>

      {/* 5. 메타데이터 업로드(YAML) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
          <Label className="text-lg font-semibold">메타데이터 업로드(YAML)</Label>
        </div>
        
        <Textarea
          value={yamlConfig}
          onChange={(e) => setYamlConfig(e.target.value)}
          placeholder={`model:
  name: stgcn_model
  framework: pytorch
  version: 1.0
  type: [type]
  epochs: []
  parameters: []
  optimizer: []
  loss_function: []
preprocessing: []
postprocessing: []`}
          className="min-h-[150px] font-mono text-sm"
          data-testid="textarea-yaml-config"
        />
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-gray-600 text-center">{uploadProgress}% 업로드 중...</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={resetForm} data-testid="button-reset">
          초기화
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile || uploading}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-upload-model"
        >
          {uploading ? '업로드 중...' : '모델 업로드'}
        </Button>
      </div>
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

  const { data: models = [], isLoading } = useQuery<AiModel[]>({
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
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl">AI 모델 업로드 - 시즌 1D 주축 - 구성 분석기</DialogTitle>
              <DialogDescription>
                AI 모델 파일을 업로드하고 시스템 설정을 구성하세요
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
                  
                  <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-browse-files-main">
                        <FileText className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                    </DialogTrigger>
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