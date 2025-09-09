/**
 * 🚀 엔터프라이즈급 청크 기반 파일 업로더
 * 1GB+ 대용량 파일을 안정적으로 처리하는 전문 업로드 시스템
 */

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Database,
  Clock,
  HardDrive,
  ChevronRight
} from 'lucide-react';

interface EnterpriseChunkUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: any, customTitle?: string) => void;
}

interface ChunkUploadSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentSpeed?: number;
}

interface UploadState {
  phase: 'idle' | 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
  session?: ChunkUploadSession;
  error?: string;
  result?: any;
}

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB 청크
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB 최대 파일 크기

export function EnterpriseChunkUploader({ open, onOpenChange, onSuccess }: EnterpriseChunkUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const validateFile = (file: File): string | null => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx?|txt)$/i)) {
      return 'CSV, Excel, 또는 텍스트 파일만 업로드 가능합니다.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기가 최대 한도(${formatFileSize(MAX_FILE_SIZE)})를 초과했습니다.`;
    }

    if (file.size < 1024) {
      return '파일이 너무 작습니다 (최소 1KB).';
    }

    return null;
  };

  const processFileUpload = async (file: File) => {
    try {
      setUploadState({ phase: 'preparing' });
      
      // 1단계: 업로드 세션 초기화
      console.log(`🚀 파일 업로드 시작: ${file.name} (${formatFileSize(file.size)})`);
      
      const initResponse = await apiRequest('POST', '/api/upload/chunked/initialize', {
        fileName: file.name,
        fileSize: file.size,
        chunkSize: CHUNK_SIZE
      });
      
      const { sessionId, chunkSize, totalChunks } = initResponse;
      
      setUploadState({
        phase: 'uploading',
        session: {
          sessionId,
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
          chunkSize,
          uploadedChunks: 0,
          percentage: 0
        }
      });

      // 2단계: 청크 단위 업로드
      const startTime = Date.now();
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('chunk', chunk);
        
        const chunkResponse = await fetch(`/api/upload/chunked/${sessionId}/chunk/${chunkIndex}`, {
          method: 'POST',
          body: formData
        });
        
        if (!chunkResponse.ok) {
          throw new Error(`청크 업로드 실패: ${chunkIndex + 1}/${totalChunks}`);
        }
        
        const progress = await chunkResponse.json();
        
        // 진행상태 업데이트
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = progress.uploadedBytes / elapsed;
        const remaining = (file.size - progress.uploadedBytes) / speed;
        
        setUploadState(prev => ({
          ...prev,
          session: prev.session ? {
            ...prev.session,
            uploadedChunks: progress.uploadedChunks,
            percentage: progress.percentage,
            currentSpeed: speed,
            estimatedTimeRemaining: remaining
          } : undefined
        }));
        
        console.log(`📦 청크 ${chunkIndex + 1}/${totalChunks} 완료 (${progress.percentage}%)`);
      }

      // 3단계: 파일 재조립 및 파싱
      setUploadState(prev => ({ ...prev, phase: 'processing' }));
      console.log(`🔧 파일 재조립 및 파싱 시작...`);
      
      const finalizeResponse = await apiRequest('POST', `/api/upload/chunked/${sessionId}/finalize`, {});
      
      setUploadState({
        phase: 'completed',
        result: finalizeResponse.parseResult
      });
      
      toast({
        title: "파일 업로드 완료",
        description: `${file.name} - ${finalizeResponse.parseResult.totalRows}개 행 처리 완료`,
      });
      
      if (onSuccess) {
        onSuccess(finalizeResponse, customTitle.trim());
      }
      
    } catch (error: any) {
      console.error('엔터프라이즈 업로드 실패:', error);
      setUploadState({
        phase: 'error',
        error: error.message || '업로드 중 오류가 발생했습니다.'
      });
      
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const error = validateFile(file);
    
    if (error) {
      toast({
        title: "파일 검증 실패",
        description: error,
        variant: "destructive",
      });
      return;
    }
    
    await processFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const resetUpload = () => {
    setUploadState({ phase: 'idle' });
  };

  const renderUploadArea = () => {
    if (uploadState.phase !== 'idle') {
      return renderProgressArea();
    }

    return (
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragOver 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">엔터프라이즈 대용량 파일 업로드</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          최대 5GB까지 지원하는 안정적인 청크 업로드 시스템
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>CSV, Excel, TXT 파일 지원</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Database className="h-4 w-4" />
            <span>자동 청크 분할 및 메모리 최적화</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            <span>RAG 기반 스마트 인덱싱</span>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>
    );
  };

  const renderProgressArea = () => {
    const { phase, session, error, result } = uploadState;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {phase === 'preparing' && <Zap className="h-5 w-5 text-blue-500" />}
            {phase === 'uploading' && <Upload className="h-5 w-5 text-blue-500" />}
            {phase === 'processing' && <Database className="h-5 w-5 text-yellow-500" />}
            {phase === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {phase === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
            
            {phase === 'preparing' && '업로드 준비 중'}
            {phase === 'uploading' && '청크 업로드 중'}
            {phase === 'processing' && '파일 처리 중'}
            {phase === 'completed' && '처리 완료'}
            {phase === 'error' && '오류 발생'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {session && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>{session.fileName}</span>
                  <Badge variant="secondary">{formatFileSize(session.fileSize)}</Badge>
                </div>
                
                <Progress value={session.percentage} className="h-2" />
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{session.uploadedChunks} / {session.totalChunks} 청크</span>
                  <span>{session.percentage}%</span>
                </div>
                
                {session.currentSpeed && session.estimatedTimeRemaining && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatFileSize(session.currentSpeed)}/s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>약 {formatTime(session.estimatedTimeRemaining)} 남음</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {phase === 'processing' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Database className="h-4 w-4 animate-spin" />
              <span>스트리밍 파싱 및 인덱싱 진행 중...</span>
            </div>
          )}
          
          {phase === 'completed' && result && (
            <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">처리 완료!</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">처리된 행:</span>
                  <div className="font-mono font-semibold">{result.totalRows?.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">배치 수:</span>
                  <div className="font-mono font-semibold">{result.totalBatches}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">열 수:</span>
                  <div className="font-mono font-semibold">{result.headers?.length}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">처리 시간:</span>
                  <div className="font-mono font-semibold">{formatTime(result.processingTime / 1000)}</div>
                </div>
              </div>
              
              {result.headers && (
                <div className="space-y-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">데이터 열:</span>
                  <div className="flex flex-wrap gap-1">
                    {result.headers.slice(0, 10).map((header: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {header}
                      </Badge>
                    ))}
                    {result.headers.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{result.headers.length - 10} 더보기
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {phase === 'error' && error && (
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">업로드 실패</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            {phase === 'completed' && (
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                완료
              </Button>
            )}
            
            {(phase === 'error' || phase === 'completed') && (
              <Button variant="outline" onClick={resetUpload}>
                다시 업로드
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            엔터프라이즈 대용량 파일 처리
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 제목 입력 필드 */}
          <div className="space-y-2">
            <Label htmlFor="custom-title" className="text-sm font-medium">
              데이터 소스 제목 (선택사항)
            </Label>
            <Input
              id="custom-title"
              placeholder="예: 2024년 고객 매출 데이터"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              제목을 입력하지 않으면 파일명과 데이터 정보로 자동 생성됩니다.
            </p>
          </div>
          
          {renderUploadArea()}
        </div>
      </DialogContent>
    </Dialog>
  );
}