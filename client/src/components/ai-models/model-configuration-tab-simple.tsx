import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, Play, FileText, Upload, Link2 } from 'lucide-react';

interface AiModel {
  id: string;
  name: string;
  modelType: string;
}

interface SimpleModelConfigurationTabProps {
  model: AiModel;
}

export function SimpleModelConfigurationTab({ model }: SimpleModelConfigurationTabProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'configuration' | 'execution' | 'results'>('configuration');

  if (!model || !model.id) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">모델 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const handleViewConnections = () => {
    toast({
      title: "연결 기능 준비 중",
      description: "데이터 소스 연결 기능이 곧 준비됩니다."
    });
  };

  const handleExecuteModel = () => {
    toast({
      title: "실행 기능 준비 중", 
      description: "모델 실행 기능이 곧 준비됩니다."
    });
  };

  const handleUploadFile = () => {
    toast({
      title: "업로드 기능 준비 중",
      description: "파일 업로드 기능이 곧 준비됩니다."
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'configuration' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('configuration')}
            data-testid="tab-configuration"
          >
            <Settings className="w-4 h-4 mr-2" />
            설정
          </Button>
          <Button
            variant={activeTab === 'execution' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('execution')}
            data-testid="tab-execution"
          >
            <Play className="w-4 h-4 mr-2" />
            실행
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('results')}
            data-testid="tab-results"
          >
            <FileText className="w-4 h-4 mr-2" />
            결과
          </Button>
        </div>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                모델 설정: {model.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">모델 ID: {model.id}</p>
                  <p className="text-sm text-muted-foreground">모델 타입: {model.modelType}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleViewConnections}
                    data-testid="button-view-connections"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    연결 가능한 소스 보기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                실행 파일 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg border-dashed">
                <div className="text-center space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    실행을 위해 Python 파일이 필요합니다
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleUploadFile}
                variant="outline"
                className="w-full"
                data-testid="button-upload-file"
              >
                <Upload className="w-4 h-4 mr-2" />
                Python 파일 업로드
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Execution Tab */}
      {activeTab === 'execution' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                모델 실행
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-medium">모델: {model.name}</p>
                  <p className="text-sm text-muted-foreground">설정: 기본 설정</p>
                  <p className="text-sm text-muted-foreground">실행 파일: 업로드 필요</p>
                  <p className="text-sm text-muted-foreground">연결된 데이터 소스: 0 개</p>
                </div>
              </div>

              <Button
                onClick={handleExecuteModel}
                className="w-full"
                data-testid="button-execute-model"
              >
                <Play className="w-4 h-4 mr-2" />
                모델 실행
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                실행 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  아직 실행 결과가 없습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default SimpleModelConfigurationTab;