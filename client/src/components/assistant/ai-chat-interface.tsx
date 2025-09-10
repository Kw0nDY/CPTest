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
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'error';
  type?: string;
  language?: string;
  content?: string;
  metadata?: any;
  isExecutable?: boolean;
  isLoadable?: boolean;
  requiresSpecialHandling?: boolean;
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
  
  // Persistent state management
  const STORAGE_KEY_PREFIX = 'ai-chat-interface';

  // File Analysis Functions
  const analyzeSourceCode = (content: string, extension: string) => {
    const language = extension.substring(1);
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    let functions: string[] = [];
    let classes: string[] = [];
    let imports: string[] = [];
    let hasExecutableCode = false;
    
    if (language === 'py') {
      // Python analysis
      functions = lines.filter(line => line.trim().startsWith('def ')).map(line => 
        line.trim().match(/def\s+(\w+)/)?.[1] || ''
      ).filter(f => f);
      
      classes = lines.filter(line => line.trim().startsWith('class ')).map(line => 
        line.trim().match(/class\s+(\w+)/)?.[1] || ''
      ).filter(c => c);
      
      imports = lines.filter(line => 
        line.trim().startsWith('import ') || line.trim().startsWith('from ')
      );
      
      hasExecutableCode = functions.includes('main') || functions.includes('process_message') || 
                         content.includes('if __name__ == "__main__"');
    } else if (language === 'js' || language === 'ts') {
      // JavaScript/TypeScript analysis
      functions = [
        ...lines.filter(line => /function\s+\w+/.test(line.trim())).map(line => 
          line.match(/function\s+(\w+)/)?.[1] || ''
        ),
        ...lines.filter(line => /const\s+\w+\s*=\s*\(/.test(line.trim())).map(line => 
          line.match(/const\s+(\w+)/)?.[1] || ''
        ),
        ...lines.filter(line => /\w+\s*:\s*\(/.test(line.trim())).map(line => 
          line.match(/(\w+)\s*:/)?.[1] || ''
        )
      ].filter(f => f);
      
      classes = lines.filter(line => line.trim().startsWith('class ')).map(line => 
        line.trim().match(/class\s+(\w+)/)?.[1] || ''
      ).filter(c => c);
      
      imports = lines.filter(line => 
        line.trim().startsWith('import ') || line.trim().startsWith('const') && line.includes('require(')
      );
      
      hasExecutableCode = functions.includes('main') || functions.includes('processMessage') ||
                         content.includes('module.exports') || content.includes('export');
    }
    
    return {
      language,
      lineCount: lines.length,
      nonEmptyLineCount: nonEmptyLines.length,
      functions,
      classes,
      imports: imports.slice(0, 10), // Limit imports shown
      functionCount: functions.length,
      classCount: classes.length,
      importCount: imports.length,
      hasExecutableCode,
      isValid: content.trim().length > 0 && !content.includes('syntax error'),
      complexity: functions.length + classes.length
    };
  };

  const analyzeJupyterNotebook = (notebook: any) => {
    const cells = notebook.cells || [];
    const codeCells = cells.filter((cell: any) => cell.cell_type === 'code');
    const markdownCells = cells.filter((cell: any) => cell.cell_type === 'markdown');
    
    let totalLines = 0;
    let executableCells = 0;
    
    codeCells.forEach((cell: any) => {
      if (cell.source && Array.isArray(cell.source)) {
        totalLines += cell.source.length;
        if (cell.source.some((line: string) => line.trim().length > 0)) {
          executableCells++;
        }
      }
    });
    
    return {
      totalCells: cells.length,
      codeCells: codeCells.length,
      markdownCells: markdownCells.length,
      totalLines,
      executableCells,
      hasCodeCells: codeCells.length > 0,
      kernelspec: notebook.metadata?.kernelspec?.name || 'unknown',
      language: notebook.metadata?.kernelspec?.language || 'python',
      notebookVersion: notebook.nbformat || 'unknown',
      isValid: cells.length > 0
    };
  };

  const analyzeModelFile = (file: File, extension: string) => {
    const format = extension.substring(1);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    
    let modelType = 'unknown';
    let framework = 'unknown';
    let isValid = true;
    
    switch (format) {
      case 'pth':
      case 'pt':
        modelType = 'PyTorch Model';
        framework = 'PyTorch';
        break;
      case 'pkl':
      case 'pickle':
        modelType = 'Pickle Model';
        framework = 'Scikit-learn/General';
        break;
      case 'onnx':
        modelType = 'ONNX Model';
        framework = 'ONNX Runtime';
        break;
      case 'h5':
        modelType = 'Keras/HDF5 Model';
        framework = 'TensorFlow/Keras';
        break;
      case 'pb':
        modelType = 'TensorFlow SavedModel';
        framework = 'TensorFlow';
        break;
      case 'tflite':
        modelType = 'TensorFlow Lite Model';
        framework = 'TensorFlow Lite';
        break;
    }
    
    // Basic size validation
    if (file.size < 1024) {
      isValid = false; // Too small to be a real model
    } else if (file.size > 500 * 1024 * 1024) {
      isValid = false; // Too large (>500MB)
    }
    
    return {
      format,
      modelType,
      framework,
      sizeInMB,
      sizeBytes: file.size,
      isValid,
      canExecute: ['pth', 'pt', 'pkl', 'pickle', 'onnx'].includes(format),
      estimatedComplexity: file.size > 50 * 1024 * 1024 ? 'high' : 
                          file.size > 10 * 1024 * 1024 ? 'medium' : 'low'
    };
  };

  // API_URL extraction function
  const extractApiUrlFromCode = (code: string) => {
    // Look for API_URL patterns in the code
    const apiUrlPattern = /API_URL\s*[=:]\s*['"](.*?)['"]|api_url\s*[=:]\s*['"](.*?)['"]|apiUrl\s*[=:]\s*['"](.*?)['"]/gi;
    const match = apiUrlPattern.exec(code);
    
    if (match) {
      const fullUrl = match[1] || match[2] || match[3];
      console.log('Found API_URL:', fullUrl);
      
      if (fullUrl) {
        // Parse the URL according to user's specification
        // Example: http://220.118.23.185:3000/api/v1/vector/upsert/9e85772e-dc56-4b4d-bb00-e18aeb80a484
        const urlParts = fullUrl.split('/');
        
        if (urlParts.length >= 2) {
          // chatflow ID is the last part
          const chatflowId = urlParts[urlParts.length - 1];
          // api endpoint is everything except the last part
          const apiEndpoint = urlParts.slice(0, -1).join('/');
          
          return {
            fullUrl,
            chatflowId,
            apiEndpoint
          };
        }
      }
    }
    
    return null;
  };
  
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
        // 🚀 캐시 무효화 로직 개선 (삭제 문제 해결)
        const cacheKey = 'chat-configurations-cache';
        const cachedData = sessionStorage.getItem(cacheKey);
        const cacheTime = sessionStorage.getItem(cacheKey + '-time');
        const forceRefresh = sessionStorage.getItem('force-config-refresh');
        
        // 강제 새로고침이 필요하거나 1분 캐시 초과 시 API 호출
        if (forceRefresh || !cachedData || !cacheTime || (Date.now() - parseInt(cacheTime)) > 60 * 1000) {
          console.log('🔄 강제 새로고침 또는 캐시 만료 - API 호출');
          // 강제 새로고침 플래그 제거
          sessionStorage.removeItem('force-config-refresh');
        } else {
          console.log('💾 캐시된 데이터 사용');
          const configs = JSON.parse(cachedData);
          setConfigurations(configs);
          if (configs.length > 0) {
            setSelectedConfig(configs[0]);
            setSelectedConfigForTest(configs[0]);
            setSelectedConfigForKnowledge(configs[0]);
          }
          return; // 캐시된 데이터 사용, API 호출 건너뛰기
        }

        const response = await fetch('/api/chat-configurations', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('Content-Type');
        if (!contentType?.includes('application/json')) {
          throw new Error(`Expected JSON response, got ${contentType}`);
        }
        
        const configs = await response.json();
        
        // Convert server data to client format
        const convertedConfigs = configs.map((config: any) => ({
          ...config,
          temperature: config.temperature || 70, // Keep as integer for internal use
          isActive: config.isActive === 1 || config.isActive === true
        }));
        
        // Sort configurations: Active first (by name), then inactive (by name)
        const sortedConfigs = convertedConfigs.sort((a: ChatConfiguration, b: ChatConfiguration) => {
          const aIsActive = Boolean(a.isActive);
          const bIsActive = Boolean(b.isActive);
          
          // If both have same active status, sort by name
          if (aIsActive === bIsActive) {
            return a.name.localeCompare(b.name);
          }
          
          // Active configurations come first
          return bIsActive ? 1 : -1;
        });
        
        setConfigurations(sortedConfigs);
        
        // 캐시에 저장 (다음 로드 시 즉시 표시)
        sessionStorage.setItem(cacheKey, JSON.stringify(sortedConfigs));
        sessionStorage.setItem(cacheKey + '-time', Date.now().toString());
        
        // Set first configuration as selected for editing
        if (sortedConfigs.length > 0) {
          setSelectedConfig(sortedConfigs[0]);
          setSelectedConfigForTest(sortedConfigs[0]);
          setSelectedConfigForKnowledge(sortedConfigs[0]);
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
  }, []); // 컴포넌트 마운트 시에만 로드

  // Load Data Integration list
  useEffect(() => {
    const loadDataIntegrations = async () => {
      try {
        const response = await fetch('/api/data-sources', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('Content-Type');
        if (!contentType?.includes('application/json')) {
          throw new Error(`Expected JSON response, got ${contentType}`);
        }
        
        const dataSources = await response.json();
        setDataIntegrations(dataSources);
      } catch (error) {
        console.error('Failed to load data integrations:', error);
      }
    };

    loadDataIntegrations();
  }, []);

  // 🔧 Knowledge Base 파일 복원 (영속성 보장)
  useEffect(() => {
    if (configurations.length > 0) {
      const restoredKnowledgeBase: Record<string, KnowledgeBaseItem[]> = {};
      
      configurations.forEach(config => {
        if (config.uploadedFiles && config.uploadedFiles.length > 0) {
          restoredKnowledgeBase[config.id] = config.uploadedFiles.filter(file => file && file.id).map(file => ({
            id: file.id || `kb-restored-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            uploadedAt: file.uploadedAt || new Date().toISOString(),
            status: 'ready' as const,
            configId: config.id
          }));
          console.log(`✅ AI 모델 "${config.name}"의 Knowledge Base 파일 ${config.uploadedFiles.length}개 복원 완료 (모델별 격리됨)`);
        }
      });
      
      setKnowledgeBaseItems(restoredKnowledgeBase);
    }
  }, [configurations]);

  // 🔧 개선된 Data Integration 상태 관리 및 캐싱
  const [dataIntegrationCache, setDataIntegrationCache] = useState<{[key: string]: any[]}>({});
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  // 🔧 localStorage에 Data Integration 상태도 저장
  const saveDataIntegrationState = (configId: string, integrations: any[]) => {
    try {
      localStorage.setItem(`dataIntegrations_${configId}`, JSON.stringify(integrations));
    } catch (error) {
      console.warn('localStorage 저장 실패:', error);
    }
  };

  const loadDataIntegrationState = (configId: string): any[] => {
    try {
      const saved = localStorage.getItem(`dataIntegrations_${configId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('localStorage 로드 실패:', error);
      return [];
    }
  };

  const loadConnectedDataIntegrationsOptimized = async (configId: string, forceRefresh = false) => {
    // 🔧 localStorage에서 복원 시도 (캐시보다 우선)
    if (!forceRefresh) {
      const savedState = loadDataIntegrationState(configId);
      if (savedState.length > 0) {
        console.log(`💾 localStorage에서 Data Integration 복원: ${savedState.length}개`);
        setConnectedDataIntegrations(savedState);
        setDataIntegrationCache(prev => ({ ...prev, [configId]: savedState }));
        return;
      }
      
      // 메모리 캐시 확인
      if (dataIntegrationCache[configId]?.length > 0) {
        setConnectedDataIntegrations(dataIntegrationCache[configId]);
        return;
      }
    }

    setIsLoadingIntegrations(true);
    try {
      console.log(`🔄 Data Integration API 호출: ${configId}`);
      const response = await fetch(`/api/chatbot-data-integrations/${configId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('Content-Type');
      if (!contentType?.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType}`);
      }
      
      const connected = await response.json();
      console.log(`✅ Data Integration 로드 성공: ${connected.length}개`);
      
      // 🔧 데이터 소스 정보 보강 (Unknown 방지)
      const enrichedConnections = await Promise.all(connected.map(async (integration: any) => {
        if (!integration.dataSourceName || integration.dataSourceName === 'Unknown') {
          try {
            const dsResponse = await fetch(`/api/data-sources/${integration.dataSourceId}`);
            if (dsResponse.ok) {
              const dataSource = await dsResponse.json();
              return {
                ...integration,
                dataSourceName: dataSource.name || integration.dataSourceName || 'Unknown',
                dataSourceType: dataSource.sourceType || integration.dataSourceType || 'Unknown',
                name: dataSource.name || integration.name || 'Unknown',
                sourceType: dataSource.sourceType || integration.sourceType || 'Unknown'
              };
            }
          } catch (dsError) {
            console.warn(`데이터 소스 정보 조회 실패: ${integration.dataSourceId}`, dsError);
          }
        }
        return integration;
      }));
      
      setConnectedDataIntegrations(enrichedConnections);
      
      // 캐시와 localStorage에 저장
      setDataIntegrationCache(prev => ({ ...prev, [configId]: enrichedConnections }));
      saveDataIntegrationState(configId, enrichedConnections);
      
    } catch (error) {
      console.error('❌ Data Integration 로드 실패:', error);
      
      // 🔧 에러 시에도 localStorage에서 복원 시도
      const savedState = loadDataIntegrationState(configId);
      if (savedState.length > 0) {
        console.log(`⚠️ 에러 복구: localStorage에서 ${savedState.length}개 복원`);
        setConnectedDataIntegrations(savedState);
      } else {
        setConnectedDataIntegrations([]);
      }
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  // Load connected data integrations for selected chatbot (with caching)
  useEffect(() => {
    if (!selectedConfigForKnowledge) {
      setConnectedDataIntegrations([]);
      return;
    }

    loadConnectedDataIntegrationsOptimized(selectedConfigForKnowledge.id);
  }, [selectedConfigForKnowledge]);

  // Always reload when Knowledge Base tab becomes active
  useEffect(() => {
    if (activeTab === 'knowledge' && selectedConfigForKnowledge) {
      // Always refresh to ensure up-to-date data
      loadConnectedDataIntegrationsOptimized(selectedConfigForKnowledge.id, true);
    }
  }, [activeTab]);

  const handleCreateNew = () => {
    const newConfig: ChatConfiguration = {
      id: `config-${Date.now()}`,
      name: '새 챗봇 구성',
      chatflowId: '',
      apiEndpoint: 'http://220.118.23.185:3000/api/v1/prediction',
      systemPrompt: '',
      maxTokens: 2000,
      temperature: 70,
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
        // 🚀 캐시 무효화 - 삭제 후 강제 새로고침 설정
        sessionStorage.setItem('force-config-refresh', 'true');
        sessionStorage.removeItem('chat-configurations-cache');
        sessionStorage.removeItem('chat-configurations-cache-time');
        
        setConfigurations(prev => prev.filter(config => config.id !== configId));
        if (selectedConfig?.id === configId) {
          const remainingConfigs = configurations.filter(c => c.id !== configId);
          setSelectedConfig(remainingConfigs[0] || null);
        }
        
        toast({
          title: '삭제 완료',
          description: '챗봇 구성이 삭제되었습니다.',
        });
        
        // 즉시 새로운 데이터 로드
        setTimeout(() => {
          window.location.reload();
        }, 1000);
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
      
      // Check if file is supported AI source file
      const validExtensions = ['.json', '.yaml', '.yml', '.py', '.js', '.ts', '.ipynb', '.pth', '.pkl', '.pickle', '.onnx', '.h5', '.pb', '.tflite'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: '파일 형식 오류',
          description: `${file.name}은(는) 지원되지 않는 파일 형식입니다. 지원 형식: ${validExtensions.join(', ')}`,
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }

      // Parse file content based on file type
      let configData: any;
      let fileMetadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: fileExtension,
        uploadedAt: new Date().toISOString()
      };

      try {
        if (fileExtension === '.json') {
          const fileContent = await file.text();
          configData = JSON.parse(fileContent);
        } else if (fileExtension === '.yaml' || fileExtension === '.yml') {
          // For YAML files, send to server for parsing
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
        } else if (['.py', '.js', '.ts'].includes(fileExtension)) {
          // For source code files with enhanced validation
          const fileContent = await file.text();
          const sourceAnalysis = analyzeSourceCode(fileContent, fileExtension);
          configData = {
            type: 'source_code',
            language: fileExtension.substring(1),
            content: fileContent,
            metadata: {
              ...fileMetadata,
              ...sourceAnalysis
            },
            isExecutable: sourceAnalysis.isValid && sourceAnalysis.hasExecutableCode
          };
        } else if (fileExtension === '.ipynb') {
          // For Jupyter notebooks with validation
          const fileContent = await file.text();
          const notebook = JSON.parse(fileContent);
          const notebookAnalysis = analyzeJupyterNotebook(notebook);
          configData = {
            type: 'jupyter_notebook',
            cells: notebook.cells?.length || 0,
            kernelspec: notebook.metadata?.kernelspec,
            metadata: {
              ...fileMetadata,
              ...notebookAnalysis
            },
            content: notebook,
            isExecutable: notebookAnalysis.hasCodeCells
          };
        } else if (['.pth', '.pkl', '.pickle', '.onnx', '.h5', '.pb', '.tflite'].includes(fileExtension)) {
          // For model files with enhanced metadata
          const modelAnalysis = analyzeModelFile(file, fileExtension);
          configData = {
            type: 'model_file',
            format: fileExtension.substring(1),
            metadata: {
              ...fileMetadata,
              ...modelAnalysis
            },
            requiresSpecialHandling: true,
            isLoadable: modelAnalysis.isValid
          };
        } else {
          throw new Error('지원되지 않는 파일 형식입니다');
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

      // Check for API_URL in source code and auto-parse
      if (configData.type === 'source_code' && configData.content) {
        const apiUrlInfo = extractApiUrlFromCode(configData.content);
        if (apiUrlInfo) {
          configData.apiUrlInfo = apiUrlInfo;
        }
      }

      // Update editing config with parsed data
      const updatedConfig = { ...editingConfig };

      // Auto-fill from API_URL if available
      if (configData.apiUrlInfo) {
        updatedConfig.chatflowId = configData.apiUrlInfo.chatflowId;
        updatedConfig.apiEndpoint = configData.apiUrlInfo.apiEndpoint;
        
        toast({
          title: 'API 설정 자동 적용',
          description: `API_URL에서 자동으로 추출: Chatflow ID (${configData.apiUrlInfo.chatflowId.substring(0, 8)}...)`,
        });
      }

      // Manual config data parsing (fallback)
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

      // Add uploaded file to the list
      const newUploadedFile: UploadedFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toISOString(),
        status: 'completed',
        type: configData.type || 'config',
        language: configData.language,
        content: configData.content,
        metadata: configData.metadata || configData.apiUrlInfo,
        isExecutable: configData.isExecutable,
        isLoadable: configData.isLoadable,
        requiresSpecialHandling: configData.requiresSpecialHandling
      };

      // Add to uploadedFiles array
      updatedConfig.uploadedFiles = [...(updatedConfig.uploadedFiles || []), newUploadedFile];

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
        
        // 즉시 상태 업데이트 및 리렌더링 강제
        setConfigurations(prev => {
          const updatedConfigs = prev.map(config => ({
            ...config,
            // Multiple configs can be active at the same time
            isActive: config.id === configId ? updatedConfig.isActive : config.isActive
          }));
          
          // 활성화 상태 변경 시 정렬 다시 적용
          return updatedConfigs.sort((a: ChatConfiguration, b: ChatConfiguration) => {
            const aIsActive = Boolean(a.isActive);
            const bIsActive = Boolean(b.isActive);
            
            // If both have same active status, sort by name
            if (aIsActive === bIsActive) {
              return a.name.localeCompare(b.name);
            }
            
            // Active configurations come first
            return bIsActive ? 1 : -1;
          });
        });
        
        // 선택된 구성도 업데이트
        if (selectedConfig?.id === configId) {
          setSelectedConfig(updatedConfig);
        }
        
        // Determine the new status message based on the updated value
        const isNowActive = Boolean(updatedConfig.isActive);
        
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
        chatflowId: editingConfig.chatflowId,
        apiEndpoint: editingConfig.apiEndpoint,
        systemPrompt: editingConfig.systemPrompt,
        maxTokens: Math.round(editingConfig.maxTokens || 2000),
        temperature: Math.min(Math.round((editingConfig.temperature || 0.7) * 100), 200), // Convert 0.7 to 70, cap at 200
        isActive: editingConfig.isActive ? 1 : 0, // Convert boolean to integer
        uploadedFiles: editingConfig.uploadedFiles || []
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
        // Get detailed error message from server response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || errorData?.details || `HTTP ${response.status} 오류`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: '저장 실패',
        description: error instanceof Error ? error.message : '챗봇 구성 저장 중 오류가 발생했습니다.',
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
      temperature: selectedConfig.temperature / 100,
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
      console.log(`🧪 테스트 시작: "${testMessage}" with config "${selectedConfigForTest.name}"`);
      
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`세션 생성 실패: ${response.status}`);
      }

      const { sessionId } = await response.json();
      console.log(`📝 세션 생성 완료: ${sessionId}`);

      const chatResponse = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: testMessage,
          configId: selectedConfigForTest.id  // configId 사용으로 변경
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`메시지 전송 실패: ${chatResponse.status}`);
      }

      const result = await chatResponse.json();
      console.log(`💬 응답 받음:`, result);
      
      const responseTime = Date.now() - startTime;
      
      // 응답 텍스트 추출 개선 - 백엔드 응답 구조: { success: true, message: botMessage }
      const aiResponse = result.message?.message || 
                        result.response || 
                        result.answer || 
                        result.text || 
                        '응답을 받지 못했습니다.';

      const newTest: ChatTest = {
        id: `test-${Date.now()}`,
        message: testMessage,
        response: aiResponse,
        responseTime,
        timestamp: new Date().toISOString(),
        status: aiResponse && aiResponse !== '응답을 받지 못했습니다.' ? 'success' : 'error'
      };

      setTestResults(prev => [newTest, ...prev]);
      setTestMessage('');

      toast({
        title: newTest.status === 'success' ? '테스트 완료' : '테스트 경고',
        description: `응답 시간: ${responseTime}ms`,
        variant: newTest.status === 'success' ? 'default' : 'destructive'
      });

    } catch (error) {
      console.error('❌ 테스트 실패:', error);
      
      const responseTime = Date.now() - startTime;
      const newTest: ChatTest = {
        id: `test-${Date.now()}`,
        message: testMessage,
        response: `오류: ${error?.message || '테스트 실패'}`,
        responseTime,
        timestamp: new Date().toISOString(),
        status: 'error'
      };

      setTestResults(prev => [newTest, ...prev]);

      toast({
        title: '테스트 실패',
        description: '챗봇 테스트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      // 반드시 상태를 리셋하여 "테스트 중..." 상태에서 벗어나게 함
      setIsTesting(false);
      console.log(`🏁 테스트 완료, 상태 리셋됨`);
    }
  };

  // CSV 파싱 함수
  const parseCSVContent = (csvText: string, fileName: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return { error: 'CSV 파일에 데이터가 충분하지 않습니다.' };
      }

      // 헤더 파싱
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // 데이터 파싱 (최대 100개 레코드)
      const sampleData = lines.slice(1, 101).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, headerIndex) => {
          row[header] = values[headerIndex] || '';
        });
        return row;
      });

      // 스키마 생성
      const dataSchema = headers.map(header => ({
        name: header,
        type: 'VARCHAR(255)',
        description: `${header} field from ${fileName}`
      }));

      return {
        headers,
        sampleData,
        dataSchema,
        recordCount: sampleData.length,
        totalLines: lines.length - 1,
        fileName
      };
    } catch (error) {
      console.error('CSV 파싱 오류:', error);
      return { 
        error: `CSV 파싱 중 오류 발생: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
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

        // Process actual file content based on type - 성능 최적화
        try {
          const extension = file.name.split('.').pop()?.toLowerCase();
          let processedData: any = null;
          let fileType = 'file';
          let fileContent = '';

          if (extension === 'csv') {
            fileType = 'csv';
            fileContent = await file.text();
            processedData = parseCSVContent(fileContent, file.name);
            console.log(`📊 CSV 파일 처리 완료: ${file.name} → ${processedData?.sampleData?.length || 0}개 레코드`);
          } else if (extension === 'xlsx' || extension === 'xls') {
            fileType = 'excel';
            fileContent = await file.text();
            processedData = { 
              error: 'Excel 파일 파싱은 아직 구현되지 않았습니다. CSV 파일을 사용해주세요.',
              rawContent: fileContent.substring(0, 1000) 
            };
            console.log(`⚠️ Excel 파일은 아직 지원되지 않음: ${file.name}`);
          } else if (extension === 'json') {
            fileType = 'json';
            fileContent = await file.text();
            try {
              const jsonData = JSON.parse(fileContent);
              processedData = {
                sampleData: Array.isArray(jsonData) ? jsonData.slice(0, 1000) : [jsonData],
                totalRecords: Array.isArray(jsonData) ? jsonData.length : 1
              };
              console.log(`📊 JSON 파일 처리 완료: ${file.name} → ${processedData.sampleData.length}개 레코드`);
            } catch (jsonError) {
              processedData = { error: 'JSON 파싱 실패', rawContent: fileContent.substring(0, 1000) };
            }
          } else {
            // Handle other file types (text files, etc.)
            fileContent = await file.text();
            processedData = { rawContent: fileContent.substring(0, 5000) };
            console.log(`📝 텍스트 파일 처리: ${file.name} (${fileContent.length} 문자)`);
          }

          // Create uploaded file entry for the chatbot configuration
          const newUploadedFile: UploadedFile = {
            id: newItem.id,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            uploadedAt: new Date().toISOString(),
            status: 'completed',
            type: fileType,
            content: fileType === 'csv' ? await file.text() : undefined,
            metadata: {
              processedData,
              recordCount: processedData?.sampleData?.length || 0,
              fileSize: file.size,
              originalName: file.name
            }
          };

          // Update the chatbot configuration with the uploaded file
          const updatedConfig = { ...selectedConfigForKnowledge };
          updatedConfig.uploadedFiles = [...(updatedConfig.uploadedFiles || []), newUploadedFile];

          // Save updated configuration
          try {
            const response = await fetch(`/api/chat-configurations/${selectedConfigForKnowledge.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedConfig)
            });

            if (response.ok) {
              // Update local state
              setConfigurations(prev => prev.map(config => 
                config.id === selectedConfigForKnowledge.id ? updatedConfig : config
              ));
              setSelectedConfigForKnowledge(updatedConfig);
              
              console.log(`Knowledge Base 파일 ${file.name} 처리 완료:`, processedData);
            }
          } catch (saveError) {
            console.error('Error saving file to configuration:', saveError);
          }

          // Update knowledge base item status to ready
          setKnowledgeBaseItems(prev => ({
            ...prev,
            [selectedConfigForKnowledge.id]: (prev[selectedConfigForKnowledge.id] || []).map(item => 
              item.id === newItem.id 
                ? { ...item, status: 'ready' as const }
                : item
            )
          }));

        } catch (processingError) {
          console.error('Error processing file:', processingError);
          // Update status to error
          setKnowledgeBaseItems(prev => ({
            ...prev,
            [selectedConfigForKnowledge.id]: (prev[selectedConfigForKnowledge.id] || []).map(item => 
              item.id === newItem.id 
                ? { ...item, status: 'error' as const }
                : item
            )
          }));
        }
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
      // UI 상태에서 파일 제거
      setKnowledgeBaseItems(prev => ({
        ...prev,
        [selectedConfigForKnowledge.id]: (prev[selectedConfigForKnowledge.id] || []).filter(item => item.id !== itemId)
      }));

      // 챗봇 구성에서도 파일 제거 (실제 저장소에서 삭제)
      const updatedConfig = {
        ...selectedConfigForKnowledge,
        uploadedFiles: selectedConfigForKnowledge.uploadedFiles?.filter(file => file.id !== itemId) || []
      };

      // 서버에 업데이트된 구성 저장
      const response = await fetch(`/api/chat-configurations/${selectedConfigForKnowledge.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedConfig.name,
          chatflowId: updatedConfig.chatflowId,
          apiEndpoint: updatedConfig.apiEndpoint,
          systemPrompt: updatedConfig.systemPrompt,
          maxTokens: updatedConfig.maxTokens,
          temperature: updatedConfig.temperature,
          isActive: updatedConfig.isActive ? 1 : 0,
          uploadedFiles: updatedConfig.uploadedFiles
        })
      });

      if (response.ok) {
        // 로컬 상태 업데이트
        setConfigurations(prev => prev.map(config => 
          config.id === selectedConfigForKnowledge.id ? updatedConfig : config
        ));
        setSelectedConfigForKnowledge(updatedConfig);
        
        console.log(`✅ Knowledge Base 파일 삭제 완료: ${itemId}`);
      }
      
      toast({
        title: '파일 삭제',
        description: 'Knowledge Base에서 파일이 완전히 제거되었습니다.',
      });
    } catch (error) {
      console.error('Knowledge Base 파일 삭제 오류:', error);
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
          dataSourceName: dataSource?.name || 'Unknown',
          dataSourceType: dataSource?.sourceType || 'Unknown',
          name: dataSource?.name || 'Unknown',
          sourceType: dataSource?.sourceType || 'Unknown'
        };
        
        setConnectedDataIntegrations(prev => [...prev, integrationWithDetails]);

        // Update cache immediately for real-time feel
        setDataIntegrationCache(prev => ({
          ...prev,
          [selectedConfigForKnowledge.id]: [...(prev[selectedConfigForKnowledge.id] || []), integrationWithDetails]
        }));

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
      console.log('Disconnecting:', { configId: selectedConfigForKnowledge.id, dataSourceId });
      
      const response = await fetch(`/api/chatbot-data-integrations/${selectedConfigForKnowledge.id}/${dataSourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state - filter by dataSourceId field
        setConnectedDataIntegrations(prev => prev.filter(integration => 
          (integration.dataSourceId || integration.id) !== dataSourceId
        ));
        
        // Update cache immediately
        setDataIntegrationCache(prev => ({
          ...prev,
          [selectedConfigForKnowledge.id]: (prev[selectedConfigForKnowledge.id] || []).filter(integration => 
            (integration.dataSourceId || integration.id) !== dataSourceId
          )
        }));

        const dataSource = dataIntegrations.find(ds => ds.id === dataSourceId);
        toast({
          title: 'Data Integration 연동 해제',
          description: `${dataSource?.name}의 연동이 해제되었습니다.`,
        });
      } else {
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
        throw new Error(`Failed to disconnect integration: ${response.status}`);
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
              <AnimatePresence>
                {configurations.map((config) => (
                  <motion.div 
                    key={config.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.3,
                      ease: "easeInOut",
                      layout: { duration: 0.4, ease: "easeInOut" }
                    }}
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
                  </motion.div>
                ))}
              </AnimatePresence>
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
                      value={(editingConfig.temperature / 100).toFixed(1)}
                      onChange={(e) => setEditingConfig({...editingConfig, temperature: Math.round(parseFloat(e.target.value) * 100)})}
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
                      accept=".json,.yaml,.yml,.py,.js,.ts,.ipynb,.pth,.pkl,.pickle,.onnx,.h5,.pb,.tflite"
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
                    다양한 AI 모델 파일을 업로드할 수 있습니다: 설정 파일 (JSON, YAML), 소스 코드 (.py, .js, .ts, .ipynb), 모델 파일 (.pth, .pkl, .onnx, .h5 등)
                  </p>

                  {/* 업로드된 파일 목록 표시 */}
                  {editingConfig && editingConfig.uploadedFiles && editingConfig.uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label>업로드된 파일 목록 ({editingConfig.uploadedFiles.length}개)</Label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2 bg-gray-50 dark:bg-gray-800">
                        {editingConfig.uploadedFiles.map((file, index) => (
                          <div key={file.id || index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {file.type === 'source_code' && (
                                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                    {file.language?.toUpperCase() || 'CODE'}
                                  </span>
                                )}
                                {file.type === 'model_file' && (
                                  <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                    MODEL
                                  </span>
                                )}
                                {file.type === 'jupyter_notebook' && (
                                  <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                                    NOTEBOOK
                                  </span>
                                )}
                                {(!file.type || file.type === 'config') && (
                                  <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                    CONFIG
                                  </span>
                                )}
                                <span className="text-sm font-medium truncate">{file.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{file.size}</span>
                                {file.isExecutable && (
                                  <span className="text-xs px-1 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                    실행가능
                                  </span>
                                )}
                                {file.type === 'source_code' && file.metadata?.apiUrlInfo && (
                                  <span className="text-xs px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                                    API 자동설정
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant={file.status === 'completed' ? 'default' : 
                                     file.status === 'error' ? 'destructive' : 'secondary'}
                            >
                              {file.status === 'completed' ? '완료' : 
                               file.status === 'error' ? '오류' : '처리중'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    <p className="text-sm font-medium mt-1">{(selectedConfig.temperature / 100).toFixed(1)}</p>
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
                        업로드된 파일 ({selectedConfigForKnowledge ? (knowledgeBaseItems[selectedConfigForKnowledge.id] || []).filter(item => {
                          const isAISourceFile = item.name.endsWith('.py') || 
                                                item.name.endsWith('.js') || 
                                                item.name.endsWith('.ts') || 
                                                (item as any).type === 'source_code' ||
                                                (item as any).language === 'py' ||
                                                (item as any).language === 'js' ||
                                                (item as any).language === 'ts';
                          return !isAISourceFile;
                        }).length : 0})
                      </h3>
                      
                      {selectedConfigForKnowledge && (knowledgeBaseItems[selectedConfigForKnowledge.id] || []).length > 0 ? (
                        <div className="space-y-2">
                          {(knowledgeBaseItems[selectedConfigForKnowledge.id] || [])
                            .filter(item => {
                              // 🚨 AI 소스 파일은 Knowledge Base 관리에서 숨김
                              const isAISourceFile = item.name.endsWith('.py') || 
                                                    item.name.endsWith('.js') || 
                                                    item.name.endsWith('.ts') || 
                                                    (item as any).type === 'source_code' ||
                                                    (item as any).language === 'py' ||
                                                    (item as any).language === 'js' ||
                                                    (item as any).language === 'ts';
                              return !isAISourceFile; // AI 소스 파일 제외
                            })
                            .map((item) => (
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
                        <div className="flex items-center gap-2">
                          {connectedDataIntegrations.length > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm('모든 데이터 연동을 해제하시겠습니까?')) {
                                  connectedDataIntegrations.forEach(integration => {
                                    disconnectDataIntegration(integration.dataSourceId || integration.id);
                                  });
                                }
                              }}
                              className="flex items-center gap-2"
                              title="모든 연동 해제"
                            >
                              <X className="w-4 h-4" />
                              전체 해제
                            </Button>
                          )}
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
                      </div>
                      
                      {connectedDataIntegrations.length > 0 ? (
                        <div className="space-y-2">
                          {connectedDataIntegrations.map((integration) => (
                            <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Database className="w-5 h-5 text-green-500" />
                                <div>
                                  <p className="font-medium text-sm">{integration.dataSourceName || integration.name || 'Unknown'}</p>
                                  <p className="text-xs text-gray-500">
                                    {integration.dataSourceType || integration.type} • 연동: {new Date(integration.connectedAt).toLocaleString()}
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
                                  onClick={async () => {
                                    // Get detailed data source information
                                    try {
                                      // Find the data source detail from dataIntegrations list
                                      const dataSourceDetail = dataIntegrations.find(ds => ds.id === (integration.dataSourceId || integration.id));
                                      if (dataSourceDetail) {
                                        setSelectedDataDetail({
                                          ...integration,
                                          // Merge data source details including schema and sample data
                                          name: dataSourceDetail.name,
                                          type: dataSourceDetail.sourceType,
                                          dataSchema: dataSourceDetail.dataSchema,
                                          sampleData: dataSourceDetail.sampleData,
                                          // Keep integration-specific fields
                                          connectedAt: integration.connectedAt,
                                          configId: integration.configId
                                        });
                                      } else {
                                        setSelectedDataDetail(integration);
                                      }
                                    } catch (error) {
                                      console.error('Failed to get data source details:', error);
                                      setSelectedDataDetail(integration);
                                    }
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
                                  onClick={() => disconnectDataIntegration(integration.dataSourceId || integration.id)}
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
        <DialogContent className="max-w-2xl" aria-describedby="integration-modal-description">
          <DialogHeader>
            <DialogTitle>Data Integration 연동</DialogTitle>
            <p id="integration-modal-description" className="text-sm text-gray-600">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="new-chatbot-description">
          <DialogHeader>
            <DialogTitle>새 챗봇 구성 생성</DialogTitle>
            <p id="new-chatbot-description" className="text-sm text-gray-600">
              새로운 챗봇 구성을 생성하여 AI 어시스턴트를 설정하세요.
            </p>
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
                      onChange={(e) => editingConfig && setEditingConfig({...editingConfig, maxTokens: parseInt(e.target.value) || 2000})}
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
                      value={((editingConfig?.temperature || 70) / 100).toFixed(1)}
                      onChange={(e) => editingConfig && setEditingConfig({...editingConfig, temperature: Math.round((parseFloat(e.target.value) || 0.7) * 100)})}
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
                        accept=".json,.yaml,.yml,.py,.js,.ts,.ipynb,.pth,.pkl,.pickle,.onnx,.h5,.pb,.tflite"
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
                    다양한 AI 모델 파일을 업로드할 수 있습니다: 설정 파일 (JSON, YAML), 소스 코드 (.py, .js, .ts, .ipynb), 모델 파일 (.pth, .pkl, .onnx, .h5 등)
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="data-detail-description">
          <DialogHeader>
            <DialogTitle>데이터 연동 상세 정보</DialogTitle>
            <p id="data-detail-description" className="text-sm text-gray-600">
              {selectedDataDetail?.name}의 연동 정보를 확인하세요
            </p>
          </DialogHeader>

          {selectedDataDetail && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">데이터 소스명</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">{selectedDataDetail.name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">타입</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    {selectedDataDetail.type === 'excel' && <FileText className="w-4 h-4 text-green-500" />}
                    {selectedDataDetail.type === 'google_sheets' && <FileText className="w-4 h-4 text-blue-500" />}
                    {selectedDataDetail.type === 'database' && <Database className="w-4 h-4 text-purple-500" />}
                    {!['excel', 'google_sheets', 'database'].includes(selectedDataDetail.type) && <FileText className="w-4 h-4 text-gray-500" />}
                    <span className="text-sm">{selectedDataDetail.type || selectedDataDetail.sourceType || 'Unknown'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">연동 시간</Label>
                  <p className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    {new Date(selectedDataDetail.connectedAt).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">상태</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      연결됨
                    </Badge>
                  </div>
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
                        <div className="overflow-x-auto border rounded">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr className="border-b">
                                {data && data.length > 0 && Object.keys(data[0]).map((key: string) => (
                                  <th key={key} className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 border-r last:border-r-0">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {data && data.slice(0, 5).map((row: any, rowIdx: number) => (
                                <tr key={rowIdx} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
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