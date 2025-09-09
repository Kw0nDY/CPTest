import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Upload, 
  File as FileIcon, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Table,
  Zap
} from 'lucide-react';

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (fileInfo: any) => void;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  processedData?: CSVProcessedData;
}

interface CSVProcessedData {
  headers: string[];
  schema: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  sampleData: any[];
  recordCount: number;
  dataSchema: Array<{
    table: string;
    fields: Array<{
      name: string;
      type: string;
      description: string;
    }>;
    recordCount: number;
  }>;
}

// 🎯 대용량 CSV 처리를 위한 개선된 함수
const processCSVFile = async (file: File): Promise<CSVProcessedData> => {
  const fileSizeKB = file.size / 1024;
  console.log(`📏 CSV 파일 크기: ${fileSizeKB.toFixed(2)} KB`);

  // 🚨 대용량 파일 감지 (10MB 이상)
  if (fileSizeKB > 10240) {
    console.warn(`⚠️ 대용량 파일 감지: ${fileSizeKB.toFixed(2)} KB - 청크 처리 모드`);
    return await processLargeCSVFile(file);
  } else {
    console.log(`✅ 소용량 파일: ${fileSizeKB.toFixed(2)} KB - 일반 처리 모드`);
    return await processSmallCSVFile(file);
  }
};

// 🎯 소용량 파일 처리 (기존 방식)
const processSmallCSVFile = async (file: File): Promise<CSVProcessedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
          throw new Error('Empty CSV file');
        }

        // Parse headers from first line
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Parse sample data (first 10 rows excluding header for better sampling)
        const sampleRows = lines.slice(1, 11).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            const value = values[index] || '';
            // Try to convert to number if possible
            const numValue = parseFloat(value);
            row[header] = isNaN(numValue) ? value : numValue;
          });
          return row;
        });

        // Generate field definitions based on sample data
        const fields = headers.map(header => {
          let type = 'STRING';
          let description = `${header} field`;
          
          // Infer type from sample data
          for (const row of sampleRows) {
            const value = row[header];
            if (value !== null && value !== undefined && value !== '') {
              if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                  type = 'INTEGER';
                  description = `Numeric ${header.toLowerCase()} value`;
                } else {
                  type = 'DECIMAL';
                  description = `Decimal ${header.toLowerCase()} value`;
                }
              } else if (typeof value === 'string') {
                // Check if it looks like a date
                if (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                  type = 'DATE';
                  description = `Date ${header.toLowerCase()} field`;
                } else {
                  type = 'STRING';
                  description = `Text ${header.toLowerCase()} field`;
                }
              }
              break; // Use type from first non-empty value
            }
          }
          
          return { name: header, type, description };
        });

        const recordCount = lines.length - 1; // Exclude header

        const dataSchema = [{
          table: file.name.replace('.csv', ''),
          fields: fields,
          recordCount: recordCount
        }];

        console.log(`✅ 소용량 CSV 처리 완료: ${sampleRows.length}개 샘플, ${recordCount}개 총 레코드`);

        resolve({
          headers,
          schema: fields,
          sampleData: sampleRows,
          recordCount,
          dataSchema
        });
        
      } catch (error) {
        console.error('Error processing small CSV file:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// 🎯 대용량 파일 처리 (청크 기반, 메모리 보호)
const processLargeCSVFile = async (file: File): Promise<CSVProcessedData> => {
  console.log(`🔄 대용량 CSV 파일 청크 처리 시작: ${file.name}`);
  
  const chunkSize = 1024 * 512; // 512KB 청크 (메모리 절약)
  let offset = 0;
  let headers: string[] = [];
  let sampleRows: any[] = [];
  let totalLines = 0;
  let isHeaderParsed = false;
  let estimatedTotalRecords = 0;

  return new Promise((resolve, reject) => {
    const readChunk = () => {
      const chunk = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim() !== '');
          
          // 첫 번째 청크에서 헤더 파싱
          if (!isHeaderParsed && lines.length > 0) {
            headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            isHeaderParsed = true;
            console.log(`📊 대용량 CSV 헤더 감지: ${headers.join(', ')}`);
          }

          // 샘플 데이터 수집 (최대 20개로 증가)
          const startIndex = isHeaderParsed && offset === 0 ? 1 : 0;
          for (let i = startIndex; i < lines.length && sampleRows.length < 20; i++) {
            const line = lines[i].trim();
            if (line) {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row: any = {};
              headers.forEach((header, index) => {
                const value = values[index] || '';
                const numValue = parseFloat(value);
                row[header] = isNaN(numValue) ? value : numValue;
              });
              sampleRows.push(row);
              totalLines++;
            }
          }

          // 전체 레코드 수 추정 (청크 크기 기반)
          if (lines.length > 0) {
            const avgBytesPerLine = chunkSize / lines.length;
            estimatedTotalRecords = Math.floor(file.size / avgBytesPerLine);
            console.log(`📊 예상 총 레코드 수: ${estimatedTotalRecords}개 (평균 라인당 ${avgBytesPerLine.toFixed(2)} bytes)`);
          }

          // 충분한 샘플을 얻었거나 파일 끝에 도달했으면 완료
          if (sampleRows.length >= 20 || offset + chunkSize >= file.size) {
            const fields = headers.map(header => {
              let type = 'STRING';
              let description = `${header} field`;
              
              // 샘플 데이터로부터 타입 추론
              for (const row of sampleRows) {
                const value = row[header];
                if (value !== null && value !== undefined && value !== '') {
                  if (typeof value === 'number') {
                    type = Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
                    description = `Numeric ${header.toLowerCase()} value`;
                  } else if (typeof value === 'string') {
                    if (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                      type = 'DATE';
                      description = `Date ${header.toLowerCase()} field`;
                    }
                  }
                  break;
                }
              }
              
              return { name: header, type, description };
            });

            const dataSchema = [{
              table: file.name.replace('.csv', ''),
              fields: fields,
              recordCount: estimatedTotalRecords
            }];

            console.log(`✅ 대용량 CSV 청크 처리 완료: ${sampleRows.length}개 샘플, 예상 ${estimatedTotalRecords}개 총 레코드`);

            resolve({
              headers,
              schema: fields,
              sampleData: sampleRows,
              recordCount: sampleRows.length,
              dataSchema
            });
          } else {
            // 다음 청크 읽기 (비동기로 브라우저 블로킹 방지)
            offset += chunkSize;
            setTimeout(readChunk, 10);
          }
        } catch (error) {
          console.error('Error processing large CSV chunk:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file chunk'));
      };

      reader.readAsText(chunk);
    };

    readChunk();
  });
};

export function CSVUploadDialog({ open, onOpenChange, onSuccess }: CSVUploadDialogProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [connectionName, setConnectionName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (files: File[]) => {
    const csvFiles = files.filter(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please select CSV files only.",
        variant: "destructive"
      });
      return;
    }

    csvFiles.forEach(file => processFile(file));
  };

  const processFile = async (file: File) => {
    const fileId = Date.now().toString();
    const newFile: UploadedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    };

    setUploadedFiles(prev => [...prev, newFile]);
    
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadedFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, progress: i } : f
        ));
      }

      // Process CSV content
      setUploadedFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'processing' } : f
      ));

      const processedData = await processCSVFile(file);
      
      setUploadedFiles(prev => prev.map(f => 
        f.name === file.name ? { 
          ...f, 
          status: 'complete', 
          processedData,
          url: `/uploaded/${file.name}`
        } : f
      ));

      toast({
        title: "CSV 파일 처리 완료",
        description: `${file.name}이 성공적으로 처리되었습니다.`
      });

    } catch (error) {
      console.error('File processing error:', error);
      setUploadedFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'error' } : f
      ));
      
      toast({
        title: "파일 처리 실패",
        description: `${file.name} 처리 중 오류가 발생했습니다.`,
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const handleSaveConnection = async () => {
    const completedFiles = uploadedFiles.filter(f => f.status === 'complete' && f.processedData);
    
    if (completedFiles.length === 0) {
      toast({
        title: "No Files to Save",
        description: "Please upload and process at least one CSV file.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create data source for CSV files
      const config = {
        files: completedFiles.map(f => ({
          name: f.name,
          url: f.url,
          headers: f.processedData?.headers || []
        })),
        sampleData: completedFiles.reduce((acc, f) => {
          const tableName = f.name.replace('.csv', '');
          acc[tableName] = f.processedData?.sampleData || [];
          return acc;
        }, {} as Record<string, any[]>),
        dataSchema: completedFiles.flatMap(f => f.processedData?.dataSchema || [])
      };

      const dataSourceData = {
        name: connectionName || 'CSV Files',
        type: 'csv',
        category: 'file',
        config: config,
        credentials: null,
        status: 'connected'
      };

      const response = await apiRequest('POST', '/api/data-sources', dataSourceData);
      const dataSource = await response.json();

      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      
      toast({
        title: "CSV 데이터 소스 생성됨",
        description: `${completedFiles.length}개의 CSV 파일이 성공적으로 연결되었습니다.`
      });

      onSuccess?.(dataSource);
      onOpenChange(false);
      
      // Reset state
      setUploadedFiles([]);
      setConnectionName('');

    } catch (error) {
      console.error('Error creating CSV data source:', error);
      toast({
        title: "연결 실패",
        description: "CSV 데이터 소스 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileIcon className="w-5 h-5" />
            CSV 파일 업로드
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Name */}
          <div className="space-y-2">
            <Label htmlFor="connectionName">Connection Name</Label>
            <Input
              id="connectionName"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              placeholder="CSV 데이터 소스 이름"
            />
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">CSV 파일을 드래그하거나 클릭하여 선택</p>
            <p className="text-gray-500 mb-4">지원 형식: .csv</p>
            <Input
              type="file"
              multiple
              accept=".csv"
              onChange={(e) => handleFileSelect(Array.from(e.target.files || []))}
              className="max-w-xs mx-auto"
            />
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">업로드된 파일</h3>
              {uploadedFiles.map((file) => (
                <Card key={file.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        <span className="font-medium">{file.name}</span>
                        <Badge variant={
                          file.status === 'complete' ? 'default' :
                          file.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {file.status === 'complete' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {file.status === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {file.status === 'uploading' ? 'Uploading' :
                           file.status === 'processing' ? 'Processing' :
                           file.status === 'complete' ? 'Complete' : 'Error'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.name)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="mb-2" />
                    )}

                    {file.status === 'complete' && file.processedData && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>레코드: {file.processedData.recordCount}</span>
                          <span>컬럼: {file.processedData.headers.length}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-1">컬럼 정보</h5>
                            <div className="text-xs space-y-1">
                              {file.processedData.schema.slice(0, 5).map((field, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{field.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {field.type}
                                  </Badge>
                                </div>
                              ))}
                              {file.processedData.schema.length > 5 && (
                                <div className="text-gray-500">
                                  +{file.processedData.schema.length - 5} more...
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium mb-1">샘플 데이터</h5>
                            <div className="text-xs">
                              {file.processedData.sampleData.slice(0, 2).map((row, idx) => (
                                <div key={idx} className="truncate text-gray-600">
                                  {Object.values(row).slice(0, 3).join(', ')}
                                  {Object.values(row).length > 3 && '...'}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSaveConnection}
              disabled={!uploadedFiles.some(f => f.status === 'complete')}
            >
              <Zap className="w-4 h-4 mr-2" />
              데이터 소스 생성
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}