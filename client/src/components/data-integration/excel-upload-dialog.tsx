import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  File as FileIcon, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Table,
  Zap
} from 'lucide-react';

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (fileInfo: any) => void;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  worksheets?: string[];
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
}

export function ExcelUploadDialog({ open, onOpenChange, onSuccess }: ExcelUploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedWorksheets, setSelectedWorksheets] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    const excelFiles = files.filter(file => 
      file.type.includes('spreadsheet') || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls')
    );

    if (excelFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please select Excel files (.xlsx or .xls)",
        variant: "destructive"
      });
      return;
    }

    for (const file of excelFiles) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const fileInfo: UploadedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    };

    setUploadedFiles(prev => [...prev, fileInfo]);

    try {
      // Simulate upload progress
      const updateProgress = (progress: number) => {
        setUploadedFiles(prev => 
          prev.map(f => f.name === file.name ? { ...f, progress } : f)
        );
      };

      // Simulate upload with progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress(i);
      }

      // Simulate processing
      setUploadedFiles(prev => 
        prev.map(f => f.name === file.name ? { ...f, status: 'processing' } : f)
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock worksheet detection
      const mockWorksheets = ['Sheet1', 'Data', 'Summary', 'Charts'];
      
      setUploadedFiles(prev => 
        prev.map(f => f.name === file.name ? { 
          ...f, 
          status: 'complete',
          worksheets: mockWorksheets,
          url: `/uploaded/${file.name}`
        } : f)
      );

      setSelectedWorksheets(prev => ({
        ...prev,
        [file.name]: [mockWorksheets[0]] // Default to first worksheet
      }));

      toast({
        title: "File Uploaded Successfully",
        description: `${file.name} has been processed and is ready for data integration.`
      });

    } catch (error) {
      setUploadedFiles(prev => 
        prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f)
      );
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive"
      });
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    setSelectedWorksheets(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  const toggleWorksheet = (fileName: string, worksheet: string) => {
    setSelectedWorksheets(prev => ({
      ...prev,
      [fileName]: prev[fileName]?.includes(worksheet)
        ? prev[fileName].filter(w => w !== worksheet)
        : [...(prev[fileName] || []), worksheet]
    }));
  };

  const handleConnect = () => {
    const completedFiles = uploadedFiles.filter(f => f.status === 'complete');
    if (completedFiles.length === 0) {
      toast({
        title: "No Files Ready",
        description: "Please upload and process Excel files first.",
        variant: "destructive"
      });
      return;
    }

    const connectionData = {
      files: completedFiles.map(file => ({
        name: file.name,
        url: file.url,
        worksheets: selectedWorksheets[file.name] || []
      }))
    };

    onSuccess?.(connectionData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileIcon className="w-5 h-5 text-green-600" />
            Connect Microsoft Excel Files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Excel Files</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your Excel files here, or click to browse
            </p>
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" className="relative overflow-hidden">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
              </Label>
              <p className="text-sm text-gray-500">
                Supports .xlsx and .xls files
              </p>
            </div>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Uploaded Files</h4>
              {uploadedFiles.map((file) => (
                <Card key={file.name} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileIcon className="w-8 h-8 text-green-600 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-gray-900 truncate">{file.name}</h5>
                            <Badge variant={
                              file.status === 'complete' ? 'default' :
                              file.status === 'error' ? 'destructive' :
                              'secondary'
                            }>
                              {file.status === 'uploading' ? `Uploading ${file.progress}%` :
                               file.status === 'processing' ? 'Processing...' :
                               file.status === 'complete' ? 'Ready' :
                               'Error'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>

                          {file.status === 'uploading' && (
                            <Progress value={file.progress} className="w-full" />
                          )}

                          {file.status === 'complete' && file.worksheets && (
                            <div className="mt-3">
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                <Table className="w-4 h-4 inline mr-1" />
                                Select Worksheets to Import:
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {file.worksheets.map((worksheet) => (
                                  <button
                                    key={worksheet}
                                    onClick={() => toggleWorksheet(file.name, worksheet)}
                                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                      selectedWorksheets[file.name]?.includes(worksheet)
                                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {worksheet}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {file.status === 'complete' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {file.status === 'error' && (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnect}
              disabled={uploadedFiles.filter(f => f.status === 'complete').length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Connect Excel Files
              {uploadedFiles.filter(f => f.status === 'complete').length > 0 && 
                ` (${uploadedFiles.filter(f => f.status === 'complete').length})`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}