import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, Search, Plus, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: 'uploading' | 'processed' | 'error';
  recordCount?: number;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  recordCount?: number;
}

export function KnowledgeBase() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch data sources from Data Integration
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        uploadedAt: new Date().toISOString(),
        status: 'uploading'
      };

      setUploadedFiles(prev => [...prev, newFile]);

      try {
        const formData = new FormData();
        formData.append('files', file);

        const response = await fetch('/api/upload-to-flowise', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, status: 'processed', recordCount: result.recordCount || 0 }
                : f
            )
          );
          toast({
            title: '업로드 성공',
            description: `${file.name}이 Flowise 벡터 데이터베이스에 성공적으로 업로드되었습니다.`,
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'error' }
              : f
          )
        );
        toast({
          title: '업로드 실패',
          description: `${file.name} 업로드 중 오류가 발생했습니다.`,
          variant: 'destructive',
        });
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: '파일 삭제',
      description: '파일이 삭제되었습니다.',
    });
  };

  const filteredFiles = uploadedFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDataSources = dataSources.filter((source) =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="knowledge-base-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            CSV/Excel 파일 관리 및 Data Integration 연동을 통한 지식 베이스 구축
          </p>
        </div>
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
          className="flex items-center gap-2"
          data-testid="button-upload-file"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? '업로드 중...' : 'CSV/Excel 업로드'}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        data-testid="input-file-upload"
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="파일 또는 데이터 소스 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uploaded Files Section */}
        <Card data-testid="card-uploaded-files">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              업로드된 파일 ({filteredFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFiles.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">업로드된 파일이 없습니다</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  CSV 또는 Excel 파일을 업로드하여 시작하세요
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span>{file.size}</span>
                          <span>•</span>
                          <span className="truncate">{new Date(file.uploadedAt).toLocaleString()}</span>
                          {file.recordCount && (
                            <>
                              <span>•</span>
                              <span>{file.recordCount.toLocaleString()}개 레코드</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        variant={
                          file.status === 'processed' ? 'default' :
                          file.status === 'uploading' ? 'secondary' : 'destructive'
                        }
                      >
                        {file.status === 'processed' ? '처리완료' :
                         file.status === 'uploading' ? '업로드중' : '오류'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file.id)}
                        data-testid={`button-delete-${file.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Integration Sources Section */}
        <Card data-testid="card-data-sources">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Integration 연동 ({filteredDataSources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDataSources ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">데이터 소스를 불러오는 중...</p>
              </div>
            ) : filteredDataSources.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">연동된 데이터 소스가 없습니다</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Data Pipeline에서 데이터 소스를 설정하세요
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDataSources.map((source) => (
                  <div 
                    key={source.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    data-testid={`data-source-item-${source.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Database className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{source.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span className="truncate">{source.type}</span>
                          {source.recordCount && (
                            <>
                              <span>•</span>
                              <span>{source.recordCount.toLocaleString()}개 레코드</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={source.status === 'active' ? 'default' : 'secondary'}
                    >
                      {source.status === 'active' ? '활성' : '비활성'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">업로드된 파일</p>
                <p className="text-2xl font-bold">{uploadedFiles.filter(f => f.status === 'processed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">연동 데이터 소스</p>
                <p className="text-2xl font-bold">{dataSources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 레코드</p>
                <p className="text-2xl font-bold">
                  {(uploadedFiles.reduce((acc, f) => acc + (f.recordCount || 0), 0) + 
                    dataSources.reduce((acc, s) => acc + (s.recordCount || 0), 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}