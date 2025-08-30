import React, { useState, useEffect, useRef } from 'react';
import { Settings, MessageCircle, Play, Save, RotateCcw, AlertCircle, CheckCircle, Upload, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface ChatConfiguration {
  id: string;
  name: string;
  chatflowId: string;
  apiEndpoint: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  createdAt: string;
  lastModified: string;
}

interface ChatTest {
  id: string;
  message: string;
  response: string;
  responseTime: number;
  timestamp: string;
  status: 'success' | 'error';
}

export function AiChatInterface() {
  const [configurations, setConfigurations] = useState<ChatConfiguration[]>([
    {
      id: 'config-1',
      name: '기본 유지보수 챗봇',
      chatflowId: '9e85772e-dc56-4b4d-bb00-e18aeb80a484',
      apiEndpoint: 'http://220.118.23.185:3000/api/v1/prediction',
      systemPrompt: '당신은 산업 장비 유지보수 전문가입니다. 업로드된 데이터를 기반으로 정확하고 유용한 답변을 제공하세요.',
      maxTokens: 2000,
      temperature: 0.7,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
  ]);

  const [selectedConfig, setSelectedConfig] = useState<ChatConfiguration | null>(configurations[0]);
  const [editingConfig, setEditingConfig] = useState<ChatConfiguration | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResults, setTestResults] = useState<ChatTest[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCreateNew = () => {
    const newConfig: ChatConfiguration = {
      id: `config-${Date.now()}`,
      name: '새 챗봇 구성',
      chatflowId: '',
      apiEndpoint: 'http://220.118.23.185:3000/api/v1/prediction',
      systemPrompt: '',
      maxTokens: 2000,
      temperature: 0.7,
      isActive: false,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    setConfigurations(prev => [...prev, newConfig]);
    setEditingConfig(newConfig);
  };

  const handleSave = () => {
    if (!editingConfig) return;

    setConfigurations(prev => 
      prev.map(config => 
        config.id === editingConfig.id 
          ? { ...editingConfig, lastModified: new Date().toISOString() }
          : config
      )
    );

    setSelectedConfig(editingConfig);
    setEditingConfig(null);
    
    toast({
      title: '저장 완료',
      description: '챗봇 구성이 성공적으로 저장되었습니다.',
    });
  };

  const handleCancel = () => {
    setEditingConfig(null);
  };

  const handleDelete = (configId: string) => {
    setConfigurations(prev => prev.filter(config => config.id !== configId));
    if (selectedConfig?.id === configId) {
      setSelectedConfig(configurations.find(c => c.id !== configId) || null);
    }
    
    toast({
      title: '삭제 완료',
      description: '챗봇 구성이 삭제되었습니다.',
    });
  };

  const handleTest = async () => {
    if (!selectedConfig || !testMessage.trim()) return;

    setIsTesting(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const { sessionId } = await response.json();

      const chatResponse = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: testMessage,
          chatflowId: selectedConfig.chatflowId 
        })
      });

      const result = await chatResponse.json();
      const responseTime = Date.now() - startTime;

      const newTest: ChatTest = {
        id: `test-${Date.now()}`,
        message: testMessage,
        response: result.botMessage?.message || '응답 없음',
        responseTime,
        timestamp: new Date().toISOString(),
        status: chatResponse.ok ? 'success' : 'error'
      };

      setTestResults(prev => [newTest, ...prev]);
      setTestMessage('');

      toast({
        title: '테스트 완료',
        description: `응답 시간: ${responseTime}ms`,
      });

    } catch (error) {
      const newTest: ChatTest = {
        id: `test-${Date.now()}`,
        message: testMessage,
        response: '오류: 테스트 실패',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        status: 'error'
      };

      setTestResults(prev => [newTest, ...prev]);

      toast({
        title: '테스트 실패',
        description: '챗봇 테스트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }

    setIsTesting(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if file is CSV or Excel
        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
          toast({
            title: '파일 형식 오류',
            description: `${file.name}은(는) 지원되지 않는 파일 형식입니다. CSV 또는 Excel 파일만 업로드 가능합니다.`,
            variant: 'destructive',
          });
          continue;
        }

        const formData = new FormData();
        formData.append('files', file);

        const response = await fetch('/api/upload-to-flowise', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          toast({
            title: '업로드 성공',
            description: `${file.name}이 Flowise 벡터 데이터베이스에 성공적으로 업로드되었습니다.`,
          });
        } else {
          throw new Error('Upload failed');
        }
      }
    } catch (error) {
      toast({
        title: '업로드 실패',
        description: '파일 업로드 중 오류가 발생했습니다. 다시 시도해 주세요.',
        variant: 'destructive',
      });
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleActive = (configId: string) => {
    setConfigurations(prev =>
      prev.map(config => ({
        ...config,
        isActive: config.id === configId ? !config.isActive : config.isActive
      }))
    );
  };

  return (
    <div className="space-y-6" data-testid="ai-chat-interface-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Chat Interface</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Flowise API 기반 챗봇 구성 및 관리
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            data-testid="input-file-upload"
          />
          <Button 
            variant="outline"
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="flex items-center gap-2"
            data-testid="button-upload-data"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>업로드 중...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>데이터 업로드</span>
              </>
            )}
          </Button>
          <Button 
            onClick={handleCreateNew} 
            className="flex items-center gap-2"
            data-testid="button-create-config"
          >
            <Settings className="w-4 h-4" />
            새 구성 생성
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration List */}
        <Card className="lg:col-span-1" data-testid="card-configurations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              챗봇 구성 ({configurations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configurations.map((config) => (
                <div 
                  key={config.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedConfig?.id === config.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedConfig(config)}
                  data-testid={`config-item-${config.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{config.name}</p>
                      <p className="text-xs text-gray-500 truncate">{config.chatflowId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={() => toggleActive(config.id)}
                        data-testid={`switch-active-${config.id}`}
                      />
                      <Badge variant={config.isActive ? 'default' : 'secondary'}>
                        {config.isActive ? '활성' : '비활성'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Details */}
        <Card className="lg:col-span-2" data-testid="card-config-details">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>구성 상세</span>
              {selectedConfig && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingConfig(selectedConfig)}
                    data-testid="button-edit-config"
                  >
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selectedConfig.id)}
                    data-testid="button-delete-config"
                  >
                    삭제
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingConfig ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="config-name">구성 이름</Label>
                  <Input
                    id="config-name"
                    value={editingConfig.name}
                    onChange={(e) => setEditingConfig({...editingConfig, name: e.target.value})}
                    data-testid="input-config-name"
                  />
                </div>

                <div>
                  <Label htmlFor="chatflow-id">Chatflow ID</Label>
                  <Input
                    id="chatflow-id"
                    value={editingConfig.chatflowId}
                    onChange={(e) => setEditingConfig({...editingConfig, chatflowId: e.target.value})}
                    placeholder="9e85772e-dc56-4b4d-bb00-e18aeb80a484"
                    data-testid="input-chatflow-id"
                  />
                </div>

                <div>
                  <Label htmlFor="api-endpoint">API 엔드포인트</Label>
                  <Input
                    id="api-endpoint"
                    value={editingConfig.apiEndpoint}
                    onChange={(e) => setEditingConfig({...editingConfig, apiEndpoint: e.target.value})}
                    data-testid="input-api-endpoint"
                  />
                </div>

                <div>
                  <Label htmlFor="system-prompt">시스템 프롬프트</Label>
                  <Textarea
                    id="system-prompt"
                    value={editingConfig.systemPrompt}
                    onChange={(e) => setEditingConfig({...editingConfig, systemPrompt: e.target.value})}
                    rows={4}
                    data-testid="textarea-system-prompt"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-tokens">최대 토큰</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={editingConfig.maxTokens}
                      onChange={(e) => setEditingConfig({...editingConfig, maxTokens: parseInt(e.target.value)})}
                      data-testid="input-max-tokens"
                    />
                  </div>

                  <div>
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={editingConfig.temperature}
                      onChange={(e) => setEditingConfig({...editingConfig, temperature: parseFloat(e.target.value)})}
                      data-testid="input-temperature"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                    취소
                  </Button>
                  <Button onClick={handleSave} data-testid="button-save-config">
                    <Save className="w-4 h-4 mr-2" />
                    저장
                  </Button>
                </div>
              </div>
            ) : selectedConfig ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>구성 이름</Label>
                    <p className="text-sm font-medium mt-1">{selectedConfig.name}</p>
                  </div>
                  <div>
                    <Label>상태</Label>
                    <div className="mt-1">
                      <Badge variant={selectedConfig.isActive ? 'default' : 'secondary'}>
                        {selectedConfig.isActive ? '활성' : '비활성'}
                      </Badge>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Label>Chatflow ID</Label>
                    <p className="text-sm font-mono mt-1 truncate">{selectedConfig.chatflowId}</p>
                  </div>
                  <div className="min-w-0">
                    <Label>API 엔드포인트</Label>
                    <p className="text-sm font-mono mt-1 truncate">{selectedConfig.apiEndpoint}</p>
                  </div>
                </div>

                <div>
                  <Label>시스템 프롬프트</Label>
                  <div className="text-sm mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border max-h-32 overflow-y-auto">
                    {selectedConfig.systemPrompt || '설정된 시스템 프롬프트가 없습니다.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>최대 토큰</Label>
                    <p className="text-sm font-medium mt-1">{selectedConfig.maxTokens}</p>
                  </div>
                  <div>
                    <Label>Temperature</Label>
                    <p className="text-sm font-medium mt-1">{selectedConfig.temperature}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 border-t pt-4">
                  <p>생성일: {new Date(selectedConfig.createdAt).toLocaleString()}</p>
                  <p>수정일: {new Date(selectedConfig.lastModified).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">구성을 선택하세요</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Status */}
      {isUploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div>
                <p className="font-medium">파일을 Flowise API에 업로드 중입니다...</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  업로드 완료 후 챗봇에서 해당 데이터를 사용할 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Interface */}
      {selectedConfig && (
        <Card data-testid="card-test-interface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              챗봇 테스트 & 데이터 업로드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">데이터 업로드 및 테스트</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  1. 상단의 "데이터 업로드" 버튼으로 CSV/Excel 파일을 Flowise API에 업로드하세요.
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  2. 업로드 완료 후 아래에서 챗봇을 테스트해보세요.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="테스트 메시지를 입력하세요... (예: 업로드한 데이터에서 PVD 시스템 정보를 찾아줘)"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="flex-1"
                  data-testid="input-test-message"
                  onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                />
                <Button 
                  onClick={handleTest}
                  disabled={isTesting || !testMessage.trim()}
                  data-testid="button-test-chat"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isTesting ? '테스트 중...' : '테스트'}
                </Button>
              </div>

              {testResults.length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {testResults.map((test) => (
                    <div key={test.id} className="border rounded-lg p-3" data-testid={`test-result-${test.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {test.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <Badge variant={test.status === 'success' ? 'default' : 'destructive'}>
                            {test.responseTime}ms
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(test.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">질문:</p>
                          <p className="text-sm">{test.message}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">응답:</p>
                          <p className="text-sm">{test.response}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}