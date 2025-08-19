import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UploadedFile {
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  data?: any;
  worksheets?: string[];
}

export function ExcelUploadDialog({ open, onOpenChange, onSuccess }: ExcelUploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
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
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
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
      await processExcelFile(file);
    }
  };

  const processExcelFile = async (file: File) => {
    const fileInfo: UploadedFile = {
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0
    };

    setUploadedFiles(prev => [...prev, fileInfo]);

    try {
      // Import XLSX library
      const XLSX = await import('xlsx');
      
      // Update status to processing
      setUploadedFiles(prev => 
        prev.map(f => f.name === file.name ? { ...f, status: 'processing', progress: 50 } : f)
      );

      // Read file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const worksheets: string[] = [];
      const sampleData: Record<string, any[]> = {};
      const dataSchema: any[] = [];

      // Process each worksheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) continue;
        
        // Get headers and data
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        // Convert to objects
        const records = dataRows.map((row: any[]) => {
          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = row[index] || null;
          });
          return record;
        });

        worksheets.push(sheetName);
        sampleData[sheetName] = records.slice(0, 5); // First 5 rows as sample

        // Generate schema
        const fields = headers.map(header => {
          const sampleValues = records.slice(0, 10).map(r => r[header]).filter(v => v != null);
          let type = 'VARCHAR(255)';
          
          if (sampleValues.length > 0) {
            const firstValue = sampleValues[0];
            if (typeof firstValue === 'number') {
              type = Number.isInteger(firstValue) ? 'INTEGER' : 'DECIMAL(10,2)';
            } else if (typeof firstValue === 'string' && firstValue.includes('-')) {
              const dateTest = new Date(firstValue);
              if (!isNaN(dateTest.getTime())) {
                type = 'DATE';
              }
            }
          }
          
          return {
            name: header,
            type,
            description: `${header} field`
          };
        });
        
        dataSchema.push({
          table: sheetName,
          fields,
          recordCount: records.length
        });
      }

      // Update file status to complete
      setUploadedFiles(prev => 
        prev.map(f => f.name === file.name ? { 
          ...f, 
          status: 'complete', 
          progress: 100,
          worksheets,
          data: { sampleData, dataSchema }
        } : f)
      );

      toast({
        title: "File Processed Successfully",
        description: `${file.name} has been processed with ${worksheets.length} worksheets.`
      });

    } catch (error) {
      console.error('Error processing Excel file:', error);
      
      setUploadedFiles(prev => 
        prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f)
      );
      
      toast({
        title: "Processing Failed",
        description: `Failed to process ${file.name}`,
        variant: "destructive"
      });
    }
  };

  const handleConnect = async () => {
    const completedFiles = uploadedFiles.filter(f => f.status === 'complete');
    
    if (completedFiles.length === 0) {
      toast({
        title: "No Files Ready",
        description: "Please upload and process Excel files first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Combine all file data
      let allSampleData: Record<string, any[]> = {};
      let allDataSchema: any[] = [];
      let allWorksheets: string[] = [];

      completedFiles.forEach(file => {
        if (file.data) {
          allSampleData = { ...allSampleData, ...file.data.sampleData };
          allDataSchema = [...allDataSchema, ...file.data.dataSchema];
          allWorksheets = [...allWorksheets, ...(file.worksheets || [])];
        }
      });

      // Create data source
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Excel Files (${completedFiles.length} files)`,
          type: 'excel',
          category: 'file',
          status: 'connected',
          config: {
            files: completedFiles.map(f => ({
              name: f.name,
              worksheets: f.worksheets || []
            })),
            sampleData: allSampleData,
            dataSchema: allDataSchema
          },
          lastSync: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Data Source Created",
          description: "Excel files have been successfully connected as a data source."
        });
        
        onSuccess();
        onOpenChange(false);
        setUploadedFiles([]);
      } else {
        throw new Error('Failed to create data source');
      }

    } catch (error) {
      console.error('Error creating data source:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to create data source. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Excel Files</DialogTitle>
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
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop Excel files here or click to upload
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports .xlsx and .xls files
            </p>
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer">
                Select Files
              </Button>
            </label>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Uploaded Files</h3>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                        {file.worksheets && ` • ${file.worksheets.length} worksheets`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(file.status)}>
                      {file.status.toUpperCase()}
                    </Badge>
                    {getStatusIcon(file.status)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={uploadedFiles.filter(f => f.status === 'complete').length === 0}
            >
              Connect Data Source
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}