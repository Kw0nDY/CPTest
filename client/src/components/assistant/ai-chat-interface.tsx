import React, { useState, useEffect, useRef } from 'react';
import { Settings, MessageCircle, Play, Save, RotateCcw, AlertCircle, CheckCircle, Upload, FileSpreadsheet, X, Trash2, FileText, Edit3, Eye, Download, Database, TestTube2, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: Date;
  status: 'processing' | 'completed' | 'error';
}

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
  uploadedFiles: UploadedFile[];
}

interface ChatTest {
  id: string;
  message: string;
  response: string;
  responseTime: number;
  timestamp: string;
  status: 'success' | 'error';
}

interface ApiConfigFile {
  name: string;
  chatflowId: string;
  apiEndpoint: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  uploadedAt: string;
  status: 'active' | 'inactive';
}

interface KnowledgeBaseItem {
  id: string;
  name: string;
  uploadedAt: string;
  status: 'ready' | 'processing' | 'error';
  configId: string;
}

export function AiChatInterface() {
  // Main states
  const [configurations, setConfigurations] = useState<ChatConfiguration[]>([]);
  
  // Tab management
  const [activeTab, setActiveTab] = useState('configurations');
  
  // Configuration selection for different tabs
  const [selectedConfigForKnowledge, setSelectedConfigForKnowledge] = useState<ChatConfiguration | null>(null);
  const [selectedConfigForTest, setSelectedConfigForTest] = useState<ChatConfiguration | null>(null);
  
  // Knowledge Base management
  // Knowledge Base items per chatbot configuration (separated by configId)
  const [knowledgeBaseItems, setKnowledgeBaseItems] = useState<Record<string, KnowledgeBaseItem[]>>({});
  const knowledgeBaseInputRef = useRef<HTMLInputElement>(null);
  
  // Data Integration management
  const [dataIntegrations, setDataIntegrations] = useState<any[]>([]);
  const [connectedDataIntegrations, setConnectedDataIntegrations] = useState<any[]>([]);
  const [showDataIntegrationModal, setShowDataIntegrationModal] = useState(false);
  const [showDataDetailModal, setShowDataDetailModal] = useState(false);
  const [selectedDataDetail, setSelectedDataDetail] = useState<any>(null);
  
  // Existing states
  const [selectedConfig, setSelectedConfig] = useState<ChatConfiguration | null>(null);
  const [editingConfig, setEditingConfig] = useState<ChatConfiguration | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Test tab states  
  const [testMessage, setTestMessage] = useState('');
  const [testResults, setTestResults] = useState<ChatTest[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  // API Config states
  const [apiConfigFile, setApiConfigFile] = useState<ApiConfigFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiConfigInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load configurations from API with sorting
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        const response = await fetch('/api/chat-configurations');
        if (response.ok) {
          const configs = await response.json();
          
          // Sort configurations: Active first (by name), then inactive (by name)
          const sortedConfigs = configs.sort((a: ChatConfiguration, b: ChatConfiguration) => {
            const aIsActive = a.isActive === true || a.isActive === 1;
            const bIsActive = b.isActive === true || b.isActive === 1;
            
            // If both have same active status, sort by name
            if (aIsActive === bIsActive) {
              return a.name.localeCompare(b.name);
            }
            
            // Active configurations come first
            return bIsActive ? 1 : -1;
          });
          
          setConfigurations(sortedConfigs);
          
          // Set first configuration as selected for editing
          if (sortedConfigs.length > 0) {
            setSelectedConfig(sortedConfigs[0]);
            setSelectedConfigForTest(sortedConfigs[0]);
            setSelectedConfigForKnowledge(sortedConfigs[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load configurations:', error);
        toast({
          title: '구성 로드 실패',
          description: '챗봇 구성을 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      }
    };

    loadConfigurations();
  }, [toast]);

  // Load Data Integration list
  useEffect(() => {
    const loadDataIntegrations = async () => {
      try {
        const response = await fetch('/api/data-sources');
        if (response.ok) {
          const dataSources = await response.json();
          setDataIntegrations(dataSources);
        }
      } catch (error) {
        console.error('Failed to load data integrations:', error);
      }
    };

    loadDataIntegrations();
  }, []);

  // Load connected data integrations for selected chatbot
  useEffect(() => {
    const loadConnectedDataIntegrations = async () => {
      if (!selectedConfigForKnowledge) {
        setConnectedDataIntegrations([]);
        return;
      }

      try {
        const response = await fetch(`/api/chatbot-data-integrations/${selectedConfigForKnowledge.id}`);
        if (response.ok) {
          const connected = await response.json();
          setConnectedDataIntegrations(connected);
        }
      } catch (error) {
        console.error('Failed to load connected data integrations:', error);
      }
    };

    loadConnectedDataIntegrations();
  }, [selectedConfigForKnowledge]);

  // Re-load connected data when Knowledge Base tab becomes active
  useEffect(() => {
    const loadConnectedDataOnTabChange = async () => {
      if (activeTab === 'knowledge' && selectedConfigForKnowledge) {
        try {
          const response = await fetch(`/api/chatbot-data-integrations/${selectedConfigForKnowledge.id}`);
          if (response.ok) {
            const connected = await response.json();
            setConnectedDataIntegrations(connected);
          }
        } catch (error) {
          console.error('Error reloading connected data on tab change:', error);
        }
      }
    };

    loadConnectedDataOnTabChange();
  }, [activeTab, selectedConfigForKnowledge]);

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
      lastModified: new Date().toISOString(),
      uploadedFiles: []
    };
    
    setEditingConfig(newConfig);
    setShowCreateModal(true);
  };


  const handleDelete = async (configId: string) => {
    try {
      const response = await fetch(`/api/chat-configurations/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfigurations(prev => prev.filter(config => config.id !== configId));
        if (selectedConfig?.id === configId) {
          const remainingConfigs = configurations.filter(c => c.id !== configId);
          setSelectedConfig(remainingConfigs[0] || null);
        }
        
        toast({
          title: '삭제 완료',
          description: '챗봇 구성이 삭제되었습니다.',
        });
      } else {
        throw new Error('Failed to delete configuration');
      }
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: '챗봇 구성 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };


  const handleApiConfigUploadForConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !editingConfig) return;

    setIsUploading(true);

    try {
      const file = files[0];
      
      // Check if file is JSON or YAML
      const validExtensions = ['.json', '.yaml', '.yml'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: '파일 형식 오류',
          description: `${file.name}은(는) 지원되지 않는 파일 형식입니다. JSON 또는 YAML 파일만 업로드 가능합니다.`,
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }

      // Parse file content directly
      const fileContent = await file.text();
      let configData: any;

      try {
        if (fileExtension === '.json') {
          configData = JSON.parse(fileContent);
        } else {
          // For YAML files, we'll need to send to server for parsing
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/parse-config', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            configData = result.configData;
          } else {
            throw new Error('Failed to parse YAML file');
          }
        }
      } catch (parseError) {
        toast({
          title: '파일 파싱 오류',
          description: '파일 형식이 올바르지 않습니다.',
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }

      // Update editing config with parsed data
      const updatedConfig = { ...editingConfig };

      if (configData.chatflowId || configData.chatflow_id || configData.flowId || configData.flow_id) {
        updatedConfig.chatflowId = configData.chatflowId || configData.chatflow_id || configData.flowId || configData.flow_id;
      }

      if (configData.endpoint || configData.apiEndpoint || configData.api_endpoint) {
        updatedConfig.apiEndpoint = configData.endpoint || configData.apiEndpoint || configData.api_endpoint;
      }

      if (configData.name || configData.title) {
        updatedConfig.name = configData.name || configData.title || updatedConfig.name;
      }

      if (configData.systemPrompt || configData.system_prompt || configData.prompt) {
        updatedConfig.systemPrompt = configData.systemPrompt || configData.system_prompt || configData.prompt;
      }

      if (configData.maxTokens || configData.max_tokens) {
        updatedConfig.maxTokens = parseInt(configData.maxTokens || configData.max_tokens) || updatedConfig.maxTokens;
      }

      if (configData.temperature !== undefined) {
        updatedConfig.temperature = parseFloat(configData.temperature) || updatedConfig.temperature;
      }

      setEditingConfig(updatedConfig);

      toast({
        title: '설정 불러오기 성공',
        description: `${file.name}에서 설정을 성공적으로 불러왔습니다.`,
      });

    } catch (error) {
      toast({
        title: '업로드 실패',
        description: error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleActive = async (configId: string) => {
    try {
      const response = await fetch(`/api/chat-configurations/${configId}/toggle-active`, {
        method: 'PUT',
      });

      if (response.ok) {
        const updatedConfig = await response.json();
        setConfigurations(prev =>
          prev.map(config => ({
            ...config,
            // Multiple configs can be active at the same time
            isActive: config.id === configId ? updatedConfig.isActive : config.isActive
          }))
        );
        
        // Determine the new status message based on the updated value
        const isNowActive = updatedConfig.isActive === 1 || updatedConfig.isActive === true;
        toast({
          title: '상태 변경 완료',
          description: `${updatedConfig.name}이(가) ${isNowActive ? '활성화' : '비활성화'}되었습니다.`,
        });
      } else {
        throw new Error('Failed to toggle active status');
      }
    } catch (error) {
      toast({
        title: '상태 변경 실패',
        description: '활성화 상태 변경 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const removeFileFromConfig = (fileId: string) => {
    if (!editingConfig) return;
    
    setEditingConfig(prev => prev ? {
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(file => file.id !== fileId)
    } : null);
  };

  const handleSave = async () => {
    if (!editingConfig) return;

    if (editingConfig.name.trim() === '' || editingConfig.chatflowId.trim() === '') {
      toast({
        title: '필수 정보 누락',
        description: '구성 이름과 Chatflow ID는 필수 입력 사항입니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const existingIndex = configurations.findIndex(c => c.id === editingConfig.id);
      
      const apiData = {
        name: editingConfig.name,
        chatflow_id: editingConfig.chatflowId,
        api_endpoint: editingConfig.apiEndpoint,
        system_prompt: editingConfig.systemPrompt,
        max_tokens: editingConfig.maxTokens,
        temperature: editingConfig.temperature,
        is_active: editingConfig.isActive
      };

      let response;
      
      if (existingIndex >= 0) {
        // Update existing
        response = await fetch(`/api/chat-configurations/${editingConfig.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        });
      } else {
        // Add new
        response = await fetch('/api/chat-configurations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        });
      }

      if (response.ok) {
        const savedConfig = await response.json();
        
        if (existingIndex >= 0) {
          // Update existing in state
          setConfigurations(prev => prev.map(config => 
            config.id === editingConfig.id ? savedConfig : config
          ));
        } else {
          // Add new to state
          setConfigurations(prev => [...prev, savedConfig]);
        }

        setSelectedConfig(savedConfig);
        setEditingConfig(null);
        setShowCreateModal(false);

        toast({
          title: '구성 저장 완료',
          description: '챗봇 구성이 성공적으로 저장되었습니다.',
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '챗봇 구성 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditingConfig(null);
    setShowCreateModal(false);
  };

  // API Config Functions
  const handleApiConfigDownload = () => {
    if (!selectedConfig) return;
    
    const configData = {
      name: selectedConfig.name,
      chatflowId: selectedConfig.chatflowId,
      apiEndpoint: selectedConfig.apiEndpoint,
      systemPrompt: selectedConfig.systemPrompt,
      maxTokens: selectedConfig.maxTokens,
      temperature: selectedConfig.temperature,
    };
    
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedConfig.name.replace(/\s+/g, '_')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: '다운로드 완료',
      description: 'API 설정 파일이 다운로드되었습니다.',
    });
  };


  // Test Functions
  const handleTest = async () => {
    if (!selectedConfigForTest || !testMessage.trim()) return;

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
          chatflowId: selectedConfigForTest.chatflowId 
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

  // Knowledge Base Functions
  const handleKnowledgeBaseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedConfigForKnowledge) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const newItem: KnowledgeBaseItem = {
          id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          uploadedAt: new Date().toISOString(),
          status: 'processing',
          configId: selectedConfigForKnowledge.id
        };

        // Add file to the specific chatbot's knowledge base
        setKnowledgeBaseItems(prev => ({
          ...prev,
          [selectedConfigForKnowledge.id]: [newItem, ...(prev[selectedConfigForKnowledge.id] || [])]
        }));

        // Simulate processing (replace with actual upload/processing logic)
        setTimeout(() => {
          setKnowledgeBaseItems(prev => ({
            ...prev,
            [selectedConfigForKnowledge.id]: (prev[selectedConfigForKnowledge.id] || []).map(item => 
              item.id === newItem.id 
                ? { ...item, status: 'ready' as const }
                : item
            )
          }));
        }, 2000);
      }

      toast({
        title: '파일 업로드 시작',
        description: `${files.length}개 파일이 Knowledge Base에 추가되고 있습니다.`,
      });

    } catch (error) {
      toast({
        title: '업로드 실패',
        description: 'Knowledge Base 파일 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeKnowledgeBaseItem = async (itemId: string) => {
    if (!selectedConfigForKnowledge) return;
    
    try {
      setKnowledgeBaseItems(prev => ({
        ...prev,
        [selectedConfigForKnowledge.id]: (prev[selectedConfigForKnowledge.id] || []).filter(item => item.id !== itemId)
      }));
      
      toast({
        title: '파일 삭제',
        description: 'Knowledge Base에서 파일이 제거되었습니다.',
      });
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: 'Knowledge Base 파일 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // Data Integration Functions
  const connectDataIntegration = async (dataSourceId: string) => {
    if (!selectedConfigForKnowledge) return;

    try {
      const response = await fetch('/api/chatbot-data-integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: selectedConfigForKnowledge.id,
          dataSourceId
        })
      });

      if (response.ok) {
        const newIntegration = await response.json();
        
        // Find the data source to get its details
        const dataSource = dataIntegrations.find(ds => ds.id === dataSourceId);
        
        // Add to local state with data source details
        const integrationWithDetails = {
          ...newIntegration,
          name: dataSource?.name || 'Unknown',
          sourceType: dataSource?.sourceType || 'Unknown'
        };
        
        setConnectedDataIntegrations(prev => [...prev, integrationWithDetails]);

        toast({
          title: 'Data Integration 연동 완료',
          description: `${dataSource?.name}이(가) 성공적으로 연동되었습니다.`,
        });
      } else {
        throw new Error('Failed to connect data integration');
      }
    } catch (error) {
      toast({
        title: '연동 실패',
        description: 'Data Integration 연동 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const disconnectDataIntegration = async (dataSourceId: string) => {
    if (!selectedConfigForKnowledge) return;

    try {
      const response = await fetch(`/api/chatbot-data-integrations/${selectedConfigForKnowledge.id}/${dataSourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state - filter by dataSourceId field
        setConnectedDataIntegrations(prev => prev.filter(integration => integration.dataSourceId !== dataSourceId));

        const dataSource = dataIntegrations.find(ds => ds.id === dataSourceId);
        toast({
          title: 'Data Integration 연동 해제',
          description: `${dataSource?.name}의 연동이 해제되었습니다.`,
        });
      } else {
        throw new Error('Failed to disconnect data integration');
      }
    } catch (error) {
      toast({
        title: '연동 해제 실패',
        description: 'Data Integration 연동 해제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-chat-interface-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Flowise API 기반 통합 챗봇 관리 시스템
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleCreateNew} 
            className="flex items-center gap-2"
            data-testid="button-create-config"
          >
            <Bot className="w-4 h-4" />
            새 구성 생성
          </Button>
        </div>
      </div>

      {/* Tab-based Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configurations" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            구성 관리
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube2 className="w-4 h-4" />
            테스트
          </TabsTrigger>
        </TabsList>

        {/* Configuration Management Tab */}
        <TabsContent value="configurations" className="space-y-6 mt-6">
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

                {/* API Configuration Upload */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <Label>API 설정 파일 업로드</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.yaml,.yml"
                      onChange={handleApiConfigUploadForConfig}
                      className="hidden"
                      data-testid="input-api-config-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2"
                      data-testid="button-upload-api-config"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>업로드 중...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>파일에서 설정 불러오기</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JSON 또는 YAML 형식의 Flowise API 설정 파일을 업로드하여 구성을 자동으로 설정할 수 있습니다.
                  </p>
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
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Selector for Knowledge Base */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  챗봇 선택
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configurations.map((config) => (
                    <div 
                      key={config.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedConfigForKnowledge?.id === config.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedConfigForKnowledge(config)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{config.name}</p>
                          <p className="text-xs text-gray-500 truncate">{config.chatflowId}</p>
                        </div>
                        {config.isActive && (
                          <Badge variant="default" className="text-xs">활성</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Base Management */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Knowledge Base</span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={knowledgeBaseInputRef}
                      type="file"
                      accept=".txt,.pdf,.docx,.csv,.xlsx"
                      onChange={handleKnowledgeBaseUpload}
                      className="hidden"
                      multiple
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => knowledgeBaseInputRef.current?.click()}
                      disabled={!selectedConfigForKnowledge || isUploading}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      파일 업로드
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedConfigForKnowledge ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>{selectedConfigForKnowledge.name}</strong>의 Knowledge Base를 관리합니다.
                      </p>
                    </div>

                    {/* Uploaded Files Section */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        업로드된 파일 ({selectedConfigForKnowledge ? (knowledgeBaseItems[selectedConfigForKnowledge.id] || []).length : 0})
                      </h3>
                      
                      {selectedConfigForKnowledge && (knowledgeBaseItems[selectedConfigForKnowledge.id] || []).length > 0 ? (
                        <div className="space-y-2">
                          {(knowledgeBaseItems[selectedConfigForKnowledge.id] || []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(item.uploadedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  item.status === 'ready' ? 'default' : 
                                  item.status === 'processing' ? 'secondary' : 'destructive'
                                }>
                                  {item.status === 'ready' ? '준비됨' : 
                                   item.status === 'processing' ? '처리중' : '오류'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeKnowledgeBaseItem(item.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            {selectedConfigForKnowledge 
                              ? `${selectedConfigForKnowledge.name}에 업로드된 파일이 없습니다`
                              : '챗봇을 선택하면 업로드된 파일을 볼 수 있습니다'
                            }
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Data Integration Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg flex items-center gap-2">
                          <Database className="w-5 h-5" />
                          Data Integration 연동 ({connectedDataIntegrations.length})
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDataIntegrationModal(true)}
                          className="flex items-center gap-2"
                        >
                          <Database className="w-4 h-4" />
                          추가 연동
                        </Button>
                      </div>
                      
                      {connectedDataIntegrations.length > 0 ? (
                        <div className="space-y-2">
                          {connectedDataIntegrations.map((integration) => (
                            <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Database className="w-5 h-5 text-green-500" />
                                <div>
                                  <p className="font-medium text-sm">{integration.name}</p>
                                  <p className="text-xs text-gray-500">
                                    연동됨 • {new Date(integration.connectedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  연결됨
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDataDetail(integration);
                                    setShowDataDetailModal(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="상세 정보 보기"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => disconnectDataIntegration(integration.id)}
                                  className="h-8 w-8 p-0"
                                  title="연동 해제"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                          <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">연동된 Data Integration이 없습니다</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setShowDataIntegrationModal(true)}
                          >
                            Data Integration 연동
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">챗봇을 선택하세요</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Selector for Test */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  테스트할 챗봇 선택
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configurations.map((config) => (
                    <div 
                      key={config.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedConfigForTest?.id === config.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedConfigForTest(config)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{config.name}</p>
                          <p className="text-xs text-gray-500 truncate">{config.chatflowId}</p>
                        </div>
                        {config.isActive && (
                          <Badge variant="default" className="text-xs">활성</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Test Interface */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube2 className="w-5 h-5" />
                  챗봇 테스트
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedConfigForTest ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>{selectedConfigForTest.name}</strong>을(를) 테스트합니다.
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Chatflow ID: {selectedConfigForTest.chatflowId}
                      </p>
                    </div>

                    {/* Test Input */}
                    <div className="space-y-3">
                      <Label>테스트 메시지</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="테스트 메시지를 입력하세요... (예: 업로드한 데이터에서 PVD 시스템 정보를 찾아줘)"
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                        />
                        <Button 
                          onClick={handleTest}
                          disabled={isTesting || !testMessage.trim()}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {isTesting ? '테스트 중...' : '테스트'}
                        </Button>
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResults.length > 0 && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        <Label>테스트 결과</Label>
                        {testResults.map((test) => (
                          <div key={test.id} className="border rounded-lg p-3">
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
                ) : (
                  <div className="text-center py-8">
                    <TestTube2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">테스트할 챗봇을 선택하세요</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Data Integration Connection Modal */}
      <Dialog open={showDataIntegrationModal} onOpenChange={setShowDataIntegrationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Data Integration 연동</DialogTitle>
            <p className="text-sm text-gray-600">
              {selectedConfigForKnowledge?.name}에 연동할 Data Integration을 선택하세요
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {(() => {
              const connectedIds = connectedDataIntegrations.map(di => di.id);
              const availableIntegrations = dataIntegrations.filter(di => !connectedIds.includes(di.id));
              
              if (availableIntegrations.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">연동 가능한 Data Integration이 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      모든 Data Integration이 이미 연동되어 있습니다.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableIntegrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{integration.name}</p>
                          <p className="text-xs text-gray-500">
                            {integration.sourceType} • {integration.connectionString ? '연결됨' : '연결 필요'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          connectDataIntegration(integration.id);
                          setShowDataIntegrationModal(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        연동
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDataIntegrationModal(false)}>
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Configuration Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 챗봇 구성 생성</DialogTitle>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-6">
              {/* Basic Configuration */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="config-name">구성 이름 *</Label>
                  <Input
                    id="config-name"
                    value={editingConfig?.name || ''}
                    onChange={(e) => editingConfig && setEditingConfig({...editingConfig, name: e.target.value})}
                    placeholder="예: 유지보수 전문 챗봇"
                    data-testid="modal-input-config-name"
                  />
                </div>

                <div>
                  <Label htmlFor="chatflow-id">Chatflow ID *</Label>
                  <Input
                    id="chatflow-id"
                    value={editingConfig?.chatflowId || ''}
                    onChange={(e) => editingConfig && setEditingConfig({...editingConfig, chatflowId: e.target.value})}
                    placeholder="9e85772e-dc56-4b4d-bb00-e18aeb80a484"
                    data-testid="modal-input-chatflow-id"
                  />
                </div>

                <div>
                  <Label htmlFor="api-endpoint">API 엔드포인트</Label>
                  <Input
                    id="api-endpoint"
                    value={editingConfig?.apiEndpoint || ''}
                    onChange={(e) => editingConfig && setEditingConfig({...editingConfig, apiEndpoint: e.target.value})}
                    data-testid="modal-input-api-endpoint"
                  />
                </div>

                <div>
                  <Label htmlFor="system-prompt">시스템 프롬프트</Label>
                  <Textarea
                    id="system-prompt"
                    value={editingConfig?.systemPrompt || ''}
                    onChange={(e) => editingConfig && setEditingConfig({...editingConfig, systemPrompt: e.target.value})}
                    rows={4}
                    placeholder="당신은 도움이 되는 AI 어시스턴트입니다..."
                    data-testid="modal-textarea-system-prompt"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-tokens">최대 토큰</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={editingConfig?.maxTokens || 0}
                      onChange={(e) => editingConfig && setEditingConfig({...editingConfig, maxTokens: parseInt(e.target.value)})}
                      data-testid="modal-input-max-tokens"
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
                      value={editingConfig?.temperature || 0}
                      onChange={(e) => editingConfig && setEditingConfig({...editingConfig, temperature: parseFloat(e.target.value)})}
                      data-testid="modal-input-temperature"
                    />
                  </div>
                </div>

                {/* API Config File Section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <Label>API 설정 파일</Label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.yaml,.yml"
                        onChange={handleApiConfigUploadForConfig}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>업로드 중...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            <span>파일에서 설정 불러오기</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApiConfigDownload}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>설정 다운로드</span>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JSON 또는 YAML 형식의 Flowise API 설정 파일을 업로드하여 구성을 자동으로 설정할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  취소
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Data Detail Information Modal */}
      <Dialog open={showDataDetailModal} onOpenChange={setShowDataDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>데이터 연동 상세 정보</DialogTitle>
            <p className="text-sm text-gray-600">
              {selectedDataDetail?.name}의 연동 정보를 확인하세요
            </p>
          </DialogHeader>

          {selectedDataDetail && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">데이터 소스명</Label>
                  <p className="text-sm p-2 bg-gray-50 rounded border">{selectedDataDetail.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">타입</Label>
                  <p className="text-sm p-2 bg-gray-50 rounded border">{selectedDataDetail.type || 'Unknown'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">연동 시간</Label>
                  <p className="text-sm p-2 bg-gray-50 rounded border">
                    {new Date(selectedDataDetail.connectedAt).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">상태</Label>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    연결됨
                  </Badge>
                </div>
              </div>

              {/* Data Schema Information */}
              {selectedDataDetail.dataSchema && selectedDataDetail.dataSchema.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">데이터 스키마</Label>
                  <div className="space-y-3">
                    {selectedDataDetail.dataSchema.map((table: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{table.table || `테이블 ${idx + 1}`}</h4>
                          <Badge variant="outline">
                            {table.recordCount ? `${table.recordCount.toLocaleString()}개 레코드` : '레코드 수 불명'}
                          </Badge>
                        </div>
                        <div className="grid gap-2">
                          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 border-b pb-2">
                            <span>필드명</span>
                            <span>타입</span>
                            <span>설명</span>
                          </div>
                          {table.fields && table.fields.slice(0, 5).map((field: any, fieldIdx: number) => (
                            <div key={fieldIdx} className="grid grid-cols-3 gap-2 text-xs py-1">
                              <span className="font-medium">{field.name}</span>
                              <span className="text-gray-600">{field.type}</span>
                              <span className="text-gray-500 truncate">{field.description || '-'}</span>
                            </div>
                          ))}
                          {table.fields && table.fields.length > 5 && (
                            <div className="text-xs text-gray-500 text-center py-2">
                              ... 및 {table.fields.length - 5}개 필드 더
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Data */}
              {selectedDataDetail.sampleData && Object.keys(selectedDataDetail.sampleData).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">샘플 데이터</Label>
                  <div className="space-y-3">
                    {Object.entries(selectedDataDetail.sampleData).map(([tableName, data]: [string, any]) => (
                      <div key={tableName} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">{tableName}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                {data && data.length > 0 && Object.keys(data[0]).map((key: string) => (
                                  <th key={key} className="text-left p-2 font-medium text-gray-500">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {data && data.slice(0, 3).map((row: any, rowIdx: number) => (
                                <tr key={rowIdx} className="border-b">
                                  {Object.values(row).map((value: any, colIdx: number) => (
                                    <td key={colIdx} className="p-2 text-gray-700 truncate max-w-[150px]">
                                      {String(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {data && data.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-2">
                              ... 및 {data.length - 3}개 행 더
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connection Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">연동 정보</span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  이 데이터는 현재 선택된 챗봇({selectedConfigForKnowledge?.name})에서 사용할 수 있습니다.
                  챗봇 대화 시 이 데이터를 기반으로 질문에 답변합니다.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}