import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Bot, User, Minimize2, Maximize2, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: string;
  sessionId: string;
  type: 'user' | 'bot';
  message: string;
  timestamp?: string;
  createdAt?: string;
  metadata?: any;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 세션 생성
  const createSession = async () => {
    try {
      const response = await apiRequest('POST', '/api/chat/session');
      setSessionId(response.sessionId);
      console.log('세션 생성됨:', response.sessionId);
      return response.sessionId;
    } catch (error) {
      console.error('세션 생성 실패:', error);
      return null;
    }
  };

  // 메시지 불러오기
  const loadMessages = async (sessionId: string) => {
    try {
      const response = await apiRequest('GET', `/api/chat/${sessionId}/messages`);
      setMessages(response || []);
    } catch (error) {
      console.error('메시지 로드 실패:', error);
      setMessages([]);
    }
  };

  // 컴포넌트 마운트 시 세션 생성
  useEffect(() => {
    if (isOpen && !sessionId) {
      createSession();
    }
  }, [isOpen]);

  // 세션이 생성되면 메시지 로드
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    }
  }, [sessionId]);

  // 메시지 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      let currentSessionId = sessionId;
      
      // 세션이 없으면 생성
      if (!currentSessionId) {
        currentSessionId = await createSession();
        if (!currentSessionId) {
          throw new Error('세션 생성 실패');
        }
      }

      // 사용자 메시지를 즉시 UI에 추가
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sessionId: currentSessionId,
        type: 'user',
        message: messageText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // 서버로 메시지 전송
      const response = await apiRequest('POST', `/api/chat/${currentSessionId}/message`, { 
        message: messageText 
      });

      // 응답 메시지를 UI에 추가
      if (response.botMessage) {
        const botMessage: ChatMessage = {
          id: response.botMessage.id || `bot-${Date.now()}`,
          sessionId: currentSessionId,
          type: 'bot',
          message: response.botMessage.message,
          timestamp: response.botMessage.timestamp || response.botMessage.createdAt,
          metadata: response.botMessage.metadata
        };
        setMessages(prev => [...prev, botMessage]);
      }

    } catch (error) {
      console.error('메시지 전송 실패:', error);
      // 에러 메시지 추가
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sessionId: sessionId || 'unknown',
        type: 'bot',
        message: '죄송합니다. 메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 엔터키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // CSV 파일 업로드
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      alert('CSV 파일만 업로드 가능합니다.');
    }
  };

  // CSV 업로드 실행
  const handleUploadCsv = async () => {
    if (!csvFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      
      const response = await fetch('/api/uploaded-data/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setCsvFile(null);
        
        // 성공 메시지를 채팅에 추가
        const successMessage: ChatMessage = {
          id: `upload-${Date.now()}`,
          sessionId: sessionId || 'unknown',
          type: 'bot',
          message: `CSV 파일이 성공적으로 업로드되었습니다! ${result.recordCount}개의 레코드가 저장되었습니다. 이제 업로드된 데이터에 대해 질문해보세요.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        throw new Error('업로드 실패');
      }
    } catch (error) {
      console.error('CSV 업로드 실패:', error);
      alert('CSV 파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-96 ${isMinimized ? 'h-14' : 'h-[600px]'} shadow-lg border border-gray-200 bg-white transition-all duration-200`}>
        {/* Header */}
        <CardHeader className="p-3 border-b border-gray-200 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Assistant
            {sessionId && <Badge variant="outline" className="text-xs">연결됨</Badge>}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(600px-60px)]">
            {/* CSV Upload Section */}
            {csvFile && (
              <div className="p-3 bg-blue-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{csvFile.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUploadCsv}
                      disabled={isUploading}
                      size="sm"
                      className="h-6 text-xs"
                    >
                      {isUploading ? '업로드 중...' : '업로드'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCsvFile(null)}
                      className="h-6 text-xs"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-[75%]">
                      <div className="flex items-start gap-2">
                        <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          안녕하세요! AI Assistant입니다. CSV 파일을 업로드하고 데이터에 대해 질문해보세요.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
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
                        {new Date(message.timestamp || message.createdAt || Date.now()).toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {message.metadata?.confidence && (
                        <div className="text-xs mt-1 text-gray-500">
                          신뢰도: {(message.metadata.confidence * 100).toFixed(0)}%
                        </div>
                      )}
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
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="질문을 입력하세요..."
                  className="flex-1 text-sm"
                  disabled={isLoading}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                  className="px-3"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3"
                  data-testid="button-upload-csv"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </Card>
    </div>
  );
}