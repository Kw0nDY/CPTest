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
  const [configurations, setConfigurations] = useState<ChatConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ChatConfiguration | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        const response = await fetch('/api/chat-configurations');
        if (response.ok) {
          const allConfigs = await response.json();
          
          // Filter only active configurations (isActive is boolean, but stored as integer)
          const activeConfigs = allConfigs.filter((config: ChatConfiguration) => 
            config.isActive === true || config.isActive === 1
          );
          
          // Sort active configs by name (ascending)
          const sortedActiveConfigs = activeConfigs.sort((a: ChatConfiguration, b: ChatConfiguration) => 
            a.name.localeCompare(b.name)
          );
          
          setConfigurations(sortedActiveConfigs);
          
          // Set the first active configuration as selected
          if (sortedActiveConfigs.length > 0) {
            setSelectedConfig(sortedActiveConfigs[0]);
          } else {
            setSelectedConfig(null);
          }
        }
      } catch (error) {
        console.error('Failed to load configurations:', error);
      }
    };

    if (isOpen) {
      loadConfigurations();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

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
      const sessionResponse = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          configId: selectedConfig?.id || null 
        })
      });

      if (!sessionResponse.ok) throw new Error('Failed to create chat session');
      
      const { sessionId } = await sessionResponse.json();

      // Send message to AI with config information
      const response = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentMessage,
          configId: selectedConfig?.id || null
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      
      const botMessage: ChatMessage = {
        id: data.botMessage.id,
        type: 'bot',
        message: data.botMessage.message,
        timestamp: new Date(data.botMessage.createdAt)
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        message: '죄송합니다. 메시지 전송에 실패했습니다. 다시 시도해 주세요.',
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

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-80 shadow-2xl border-gray-200 ${isMinimized ? 'h-14' : 'h-[800px]'} transition-all duration-300`}>
        {/* Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Bot className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <CardTitle className="text-sm font-medium truncate">AI Assistant</CardTitle>
                {selectedConfig && (
                  <p className="text-xs text-blue-100 truncate">
                    {selectedConfig.name}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs bg-blue-500 text-white border-blue-400 flex-shrink-0">
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
          <CardContent className="p-0 flex flex-col h-[750px]">
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
                        <div className="text-sm whitespace-pre-line">{message.message}</div>
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

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 text-sm"
                  disabled={isLoading}
                  data-testid="chat-input"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                  className="px-3"
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
      </Card>
    </div>
  );
}