import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, X, Bot, User, Minimize2, Maximize2, Settings } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
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
  uploadedFiles: any[];
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      message: '안녕하세요! DXT Enterprise AI Fabric 어시스턴트입니다. 업로드된 데이터를 기반으로 질문에 답변해 드립니다.\n\n예시:\n• "maintenance 데이터에서 진공시스템 관련 문제점을 알려줘"\n• "업로드된 Excel 파일 내용을 검색해줘"\n\n무엇을 도와드릴까요?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 450, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [configurations, setConfigurations] = useState<ChatConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ChatConfiguration | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load configurations on mount - ONLY active ones
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        console.log('🔄 챗봇 구성 로드 중...');
        const response = await fetch('/api/chat-configurations', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' } // 최신 데이터 강제 로드
        });
        
        if (response.ok) {
          const allConfigs = await response.json();
          console.log(`📋 전체 구성 개수: ${allConfigs.length}개`, allConfigs.map(c => ({ 
            name: c.name, 
            isActive: c.isActive, 
            type: typeof c.isActive,
            files: c.uploadedFiles?.length || 0
          })));
          
          // 🎯 더 포괄적인 활성 상태 확인 (모든 가능한 경우 고려)
          const activeConfigs = allConfigs.filter((config: ChatConfiguration) => {
            // isActive가 true, 1, "1", "true" 또는 null/undefined인 경우 활성으로 간주
            const isActiveValue = config.isActive;
            return isActiveValue === true || 
                   isActiveValue === 1 || 
                   isActiveValue === "1" ||
                   isActiveValue === "true" ||
                   isActiveValue == null || // null 또는 undefined도 활성으로 간주
                   isActiveValue === undefined;
          });
          
          console.log(`✅ 활성 구성 개수: ${activeConfigs.length}개`, activeConfigs.map(c => ({ 
            name: c.name, 
            files: c.uploadedFiles?.length || 0 
          })));
          
          // Sort active configs by name (ascending)
          const sortedActiveConfigs = activeConfigs.sort((a: ChatConfiguration, b: ChatConfiguration) => 
            a.name.localeCompare(b.name)
          );
          
          setConfigurations(sortedActiveConfigs);
          
          // Try to restore previously selected configuration from localStorage
          const savedConfigId = localStorage.getItem('selectedChatbotConfigId');
          let configToSelect = null;
          
          if (savedConfigId) {
            // Find the saved configuration if it still exists and is active
            configToSelect = sortedActiveConfigs.find(config => config.id === savedConfigId);
            console.log(`💾 저장된 구성 복원: ${configToSelect ? configToSelect.name : '찾을 수 없음'}`);
          }
          
          // Fallback to first active configuration if no saved config or saved config not found
          if (!configToSelect && sortedActiveConfigs.length > 0) {
            configToSelect = sortedActiveConfigs[0];
            console.log(`🎯 첫 번째 활성 구성 선택: ${configToSelect.name} (파일 ${configToSelect.uploadedFiles?.length || 0}개)`);
          }
          
          setSelectedConfig(configToSelect);
          
          // Save the selected config to localStorage
          if (configToSelect) {
            localStorage.setItem('selectedChatbotConfigId', configToSelect.id);
          }
        } else {
          console.error('구성 로드 실패:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to load configurations:', error);
        // 에러 발생 시에도 모든 구성을 로드 시도 (isActive 무시)
        try {
          const response = await fetch('/api/chat-configurations');
          if (response.ok) {
            const allConfigs = await response.json();
            console.log('🚨 에러 복구: 모든 구성 로드 (활성 상태 무시)', allConfigs.length);
            setConfigurations(allConfigs);
            if (allConfigs.length > 0) {
              setSelectedConfig(allConfigs[0]);
              localStorage.setItem('selectedChatbotConfigId', allConfigs[0].id);
            }
          }
        } catch (fallbackError) {
          console.error('구성 로드 완전 실패:', fallbackError);
        }
      }
    };

    if (isOpen) {
      loadConfigurations();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    if (!selectedConfig) {
      console.error('No configuration selected for chatbot');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        message: '죄송합니다. 챗봇 구성이 선택되지 않았습니다.\n\n설정 버튼을 클릭하여 사용할 챗봇 구성을 선택해 주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    console.log('Sending message with config:', selectedConfig);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Create or get chat session with selected chatbot config
      console.log('Creating session with configId:', selectedConfig.id);
      const sessionResponse = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          configId: selectedConfig.id
        })
      });

      if (!sessionResponse.ok) throw new Error('Failed to create chat session');
      
      const { sessionId } = await sessionResponse.json();

      // Send message to AI with config information
      console.log('Sending message to session:', sessionId, 'with configId:', selectedConfig.id);
      const response = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentMessage,
          configId: selectedConfig.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // 백엔드 응답 구조: { success: true, message: botMessage }
      const botMessage: ChatMessage = {
        id: data.message.id,
        type: 'bot',
        message: data.message.message,
        timestamp: new Date(data.message.createdAt)
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Extract detailed error information
      let errorDetails = '';
      if (error instanceof Error) {
        errorDetails = error.message;
      } else if (typeof error === 'string') {
        errorDetails = error;
      } else {
        errorDetails = JSON.stringify(error);
      }
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        message: `메시지 전송에 실패했습니다.\n\n오류 정보:\n${errorDetails}\n\n다시 시도해 주세요.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };





  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 마우스로 크기 조정 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !chatContainerRef.current) return;
      
      const rect = chatContainerRef.current.getBoundingClientRect();
      // 좌상단 드래그: 마우스가 왼쪽/위로 갈수록 크기가 커짐
      const newWidth = Math.max(300, Math.min(800, rect.right - e.clientX + 20));
      const newHeight = Math.max(400, Math.min(800, rect.bottom - e.clientY + 20));
      
      setChatSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card 
        ref={chatContainerRef}
        className={`shadow-2xl border-gray-200 ${isMinimized ? 'h-14' : ''} transition-all duration-300 flex flex-col overflow-hidden relative`}
        style={!isMinimized ? { 
          width: `${chatSize.width}px`, 
          height: `${chatSize.height}px`,
        } : { width: '320px' }}
      >
        {/* Header */}
        <CardHeader className={`${isMinimized ? 'pb-0 py-3' : 'pb-2'} bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg flex-shrink-0`}>
          <div className="flex items-center justify-between gap-2 h-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Bot className="w-5 h-5 flex-shrink-0" />
              <div className={`flex ${isMinimized ? 'flex-row items-center gap-2' : 'flex-col'} min-w-0 flex-1`}>
                <CardTitle className="text-sm font-medium truncate">AI Assistant</CardTitle>
                {selectedConfig && !isMinimized && (
                  <p className="text-xs text-blue-100 truncate">
                    {selectedConfig.name}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className={`${isMinimized ? 'text-xs px-2 py-0.5' : 'text-xs'} bg-blue-500 text-white border-blue-400 flex-shrink-0`}>
                {selectedConfig ? 'Ready' : 'No Config'}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white hover:bg-blue-500"
                    title="설정"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>챗봇 설정</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">사용할 구성 선택</label>
                      <Select
                        value={selectedConfig?.id || ''}
                        onValueChange={(value) => {
                          const config = configurations.find(c => c.id === value);
                          setSelectedConfig(config || null);
                          // Save selected config to localStorage
                          if (config) {
                            localStorage.setItem('selectedChatbotConfigId', config.id);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="구성을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {configurations.map((config) => (
                            <SelectItem key={config.id} value={config.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{config.name}</span>
                                {config.isActive && (
                                  <Badge variant="default" className="ml-2 text-xs">활성</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedConfig && (
                      <div className="space-y-3 pt-2 border-t">
                        <div>
                          <label className="text-xs text-gray-500">구성 이름</label>
                          <p className="text-sm font-medium">{selectedConfig.name}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Chatflow ID</label>
                          <p className="text-sm font-mono truncate">{selectedConfig.chatflowId}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">API 엔드포인트</label>
                          <p className="text-sm font-mono truncate">{selectedConfig.apiEndpoint}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">시스템 프롬프트</label>
                          <div className="text-sm bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto">
                            {selectedConfig.systemPrompt || '설정된 시스템 프롬프트가 없습니다.'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">최대 토큰</label>
                            <p className="text-sm">{selectedConfig.maxTokens}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Temperature</label>
                            <p className="text-sm">{selectedConfig.temperature}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {configurations.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">
                          구성된 챗봇이 없습니다.<br />
                          Assistant 모듈에서 챗봇 구성을 먼저 생성해주세요.
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white hover:bg-blue-500"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white hover:bg-blue-500"
                onClick={onClose}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'bot' && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        {message.type === 'user' && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <div className="text-sm whitespace-pre-line max-h-96 overflow-y-auto">{message.message}</div>
                      </div>
                      <div className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Section - Fixed at bottom */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Configuration Status */}
              {!selectedConfig && (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <Settings className="w-3 h-3 inline mr-1" />
                  챗봇 구성을 선택해주세요
                </div>
              )}
              
              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedConfig ? "메시지를 입력하세요..." : "먼저 챗봇 구성을 선택해주세요"}
                  className="flex-1 text-sm"
                  disabled={isLoading || !selectedConfig}
                  data-testid="chat-input"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || !selectedConfig}
                  size="sm"
                  className="px-3 shrink-0"
                  data-testid="chat-send-button"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
        
        {/* 크기 조정 핸들 (최소화되지 않았을 때만 표시) - 좌상단으로 이동 */}
        {!isMinimized && (
          <div 
            ref={resizeRef}
            className={`absolute top-0 left-0 w-4 h-4 bg-blue-600 cursor-nw-resize ${
              isResizing ? 'bg-blue-700' : 'hover:bg-blue-700'
            } transition-colors duration-200`}
            onMouseDown={handleMouseDown}
            style={{
              clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)'
            }}
            title="크기 조정"
          />
        )}
      </Card>
    </div>
  );
}