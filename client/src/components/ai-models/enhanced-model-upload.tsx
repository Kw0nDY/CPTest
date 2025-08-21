import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Progress component - using div with width styling instead
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  FileCode, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Plus,
  X,
  FileText,
  Brain,
  Zap
} from 'lucide-react';

interface ModelUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModelFile {
  file: File;
  type: 'model' | 'config' | 'source' | 'documentation';
  name: string;
  size: string;
}

interface ParsedConfig {
  inputs: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  modelInfo: {
    architecture?: string;
    parameters?: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

interface UploadProgress {
  stage: 'uploading' | 'parsing' | 'validating' | 'complete' | 'error';
  progress: number;
  message: string;
}

export function EnhancedModelUpload({ isOpen, onClose }: ModelUploadProps) {
  const [modelFiles, setModelFiles] = useState<ModelFile[]>([]);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [modelType, setModelType] = useState('');
  const [parsedConfig, setParsedConfig] = useState<ParsedConfig | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const processedFiles: ModelFile[] = [];
    
    for (const file of files) {
      const fileType = determineFileType(file);
      const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      
      processedFiles.push({
        file,
        type: fileType,
        name: file.name,
        size: fileSize
      });

      // If it's a config file, parse it immediately
      if (fileType === 'config') {
        await parseConfigFile(file);
      }
    }
    
    setModelFiles(prev => [...prev, ...processedFiles]);
  };

  const determineFileType = (file: File): ModelFile['type'] => {
    const name = file.name.toLowerCase();
    const extension = name.split('.').pop();
    
    if (name.includes('config') || extension === 'json' || extension === 'yaml' || extension === 'yml') {
      return 'config';
    } else if (extension === 'py' || extension === 'ipynb' || extension === 'js' || extension === 'ts') {
      return 'source';
    } else if (extension === 'pth' || extension === 'pkl' || extension === 'h5' || extension === 'joblib' || extension === 'onnx') {
      return 'model';
    } else if (extension === 'md' || extension === 'txt' || extension === 'pdf') {
      return 'documentation';
    }
    return 'model'; // Default
  };

  const parseConfigFile = async (file: File) => {
    try {
      const text = await file.text();
      let config;
      
      if (file.name.toLowerCase().endsWith('.json')) {
        config = JSON.parse(text);
      } else if (file.name.toLowerCase().endsWith('.yaml') || file.name.toLowerCase().endsWith('.yml')) {
        // For now, we'll handle JSON configs. YAML parsing can be added later
        throw new Error('YAML parsing not implemented yet. Please use JSON config files.');
      } else {
        throw new Error('Unsupported config file format');
      }

      // Extract input/output information from config
      const parsed: ParsedConfig = {
        inputs: [],
        outputs: [],
        modelInfo: {}
      };

      // Parse based on the config structure from the attached file
      if (config.data_meta) {
        // Parse inputs
        if (config.data_meta.input && config.data_meta.input_type) {
          config.data_meta.input.forEach((inputName: string, index: number) => {
            parsed.inputs.push({
              name: inputName,
              type: config.data_meta.input_type[index] || 'float32',
              description: `Input parameter ${inputName}`
            });
          });
        }

        // Parse outputs
        if (config.data_meta.output && config.data_meta.output_type) {
          config.data_meta.output.forEach((outputName: string, index: number) => {
            parsed.outputs.push({
              name: outputName,
              type: config.data_meta.output_type[index] || 'float32',
              description: `Output parameter ${outputName}`
            });
          });
        }

        // Store model metadata
        parsed.modelInfo = {
          architecture: config.in_channels ? 'Neural Network' : 'Unknown',
          parameters: {
            in_channels: config.in_channels,
            num_nodes: config.num_nodes,
            kernel_size: config.kernel_size,
            hid_channels: config.hid_channels,
            in_len: config.data_meta?.in_len,
            out_len: config.data_meta?.out_len
          },
          metadata: {
            dataset_dir: config.dataset_dir,
            scaler: config.scaler,
            node_slices: config.data_meta?.node_slices
          }
        };
      }

      setParsedConfig(parsed);
      
      // Auto-fill model type based on config
      if (config.in_channels) {
        setModelType('Neural Network');
      }
      
      toast({
        title: "Config Parsed Successfully",
        description: `Found ${parsed.inputs.length} inputs and ${parsed.outputs.length} outputs`,
      });
      
    } catch (error) {
      console.error('Config parsing error:', error);
      toast({
        title: "Config Parsing Failed",
        description: error instanceof Error ? error.message : "Could not parse configuration file",
        variant: "destructive"
      });
    }
  };

  const removeFile = (index: number) => {
    const removedFile = modelFiles[index];
    setModelFiles(prev => prev.filter((_, i) => i !== index));
    
    // If removing a config file, clear parsed config
    if (removedFile.type === 'config') {
      setParsedConfig(null);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!modelName.trim()) {
        throw new Error('Model name is required');
      }
      
      if (modelFiles.length === 0) {
        throw new Error('At least one file is required');
      }

      setUploadProgress({ stage: 'uploading', progress: 0, message: 'Preparing upload...' });
      
      const formData = new FormData();
      modelFiles.forEach((modelFile, index) => {
        formData.append(`files`, modelFile.file);
        formData.append(`fileTypes`, modelFile.type);
      });
      
      formData.append('name', modelName);
      formData.append('description', modelDescription);
      formData.append('type', modelType);
      
      if (parsedConfig) {
        formData.append('parsedConfig', JSON.stringify(parsedConfig));
      }

      setUploadProgress({ stage: 'uploading', progress: 50, message: 'Uploading files...' });
      
      // For FormData uploads, we need to use fetch directly to avoid JSON headers
      const response = await fetch('/api/ai-models/enhanced-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      setUploadProgress({ stage: 'parsing', progress: 75, message: 'Processing model...' });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadProgress({ stage: 'complete', progress: 100, message: 'Upload complete!' });
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
      
      toast({
        title: "Model Uploaded Successfully",
        description: `${modelName} has been uploaded and is ready for configuration.`,
      });
      
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    },
    onError: (error) => {
      setUploadProgress({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'Upload failed' 
      });
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setModelFiles([]);
    setModelName('');
    setModelDescription('');
    setModelType('');
    setParsedConfig(null);
    setUploadProgress(null);
  };

  const getFileTypeIcon = (type: ModelFile['type']) => {
    switch (type) {
      case 'model': return <Brain className="w-4 h-4" />;
      case 'config': return <Settings className="w-4 h-4" />;
      case 'source': return <FileCode className="w-4 h-4" />;
      case 'documentation': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getFileTypeColor = (type: ModelFile['type']) => {
    switch (type) {
      case 'model': return 'bg-blue-500';
      case 'config': return 'bg-green-500';
      case 'source': return 'bg-purple-500';
      case 'documentation': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Enhanced AI Model Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Progress */}
          {uploadProgress && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {uploadProgress.stage === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : uploadProgress.stage === 'complete' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    )}
                    <span className="font-medium">{uploadProgress.message}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Model Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  Drag and drop your model files here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Upload model files (.pth, .pkl, .h5), config files (.json, .yaml), source code (.py), and documentation
                </p>
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Choose Files
                  </label>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pth,.pkl,.h5,.joblib,.onnx,.json,.yaml,.yml,.py,.ipynb,.js,.ts,.md,.txt,.pdf"
                />
              </div>

              {/* Uploaded Files List */}
              {modelFiles.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                    Uploaded Files ({modelFiles.length})
                  </h4>
                  {modelFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${getFileTypeColor(file.type)} text-white`}>
                          {getFileTypeIcon(file.type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {file.type}
                            </Badge>
                            <span className="text-xs text-gray-500">{file.size}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="model-name">Model Name *</Label>
                <Input
                  id="model-name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Enter model name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="model-type">Model Type</Label>
                <Input
                  id="model-type"
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  placeholder="e.g., Neural Network, Random Forest, LSTM"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="model-description">Description</Label>
                <Textarea
                  id="model-description"
                  value={modelDescription}
                  onChange={(e) => setModelDescription(e.target.value)}
                  placeholder="Describe your model's purpose and capabilities"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Parsed Configuration */}
          {parsedConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-500" />
                  Auto-Detected Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Inputs */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-green-700 dark:text-green-400">
                      Input Parameters ({parsedConfig.inputs.length})
                    </h4>
                    <div className="space-y-2">
                      {parsedConfig.inputs.map((input, index) => (
                        <div key={index} className="p-2 bg-green-50 dark:bg-green-950 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{input.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {input.type}
                            </Badge>
                          </div>
                          {input.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {input.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outputs */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-400">
                      Output Parameters ({parsedConfig.outputs.length})
                    </h4>
                    <div className="space-y-2">
                      {parsedConfig.outputs.map((output, index) => (
                        <div key={index} className="p-2 bg-blue-50 dark:bg-blue-950 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{output.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {output.type}
                            </Badge>
                          </div>
                          {output.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {output.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Model Architecture Info */}
                {parsedConfig.modelInfo.parameters && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Model Architecture</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {Object.entries(parsedConfig.modelInfo.parameters).map(([key, value]) => (
                        value !== undefined && (
                          <div key={key} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="font-medium">{key}:</span>
                            <span className="ml-1">{JSON.stringify(value)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={uploadMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={() => uploadMutation.mutate()}
              disabled={!modelName.trim() || modelFiles.length === 0 || uploadMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Model
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}