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
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Create chat session on component mount
  useEffect(() => {
    if (isOpen && !sessionId) {
      createSession();
    }
  }, [isOpen]);

  // Chat session query
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/chat', sessionId, 'messages'],
    enabled: !!sessionId
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/chat/session'),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => 
      apiRequest('POST', `/api/chat/${sessionId}/message`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId, 'messages'] });
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    }
  });

  // CSV upload mutation
  const uploadCsvMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      return fetch('/api/maintenance/upload', {
        method: 'POST',
        body: formData
      }).then(res => res.json());
    },
    onSuccess: () => {
      setIsUploading(false);
      setCsvFile(null);
      // Add success message to chat
      sendMessageMutation.mutate('CSV 파일이 성공적으로 업로드되었습니다. 이제 설비 유지보수 관련 질문을 하실 수 있습니다.');
    },
    onError: () => {
      setIsUploading(false);
    }
  });

  const createSession = () => {
    createSessionMutation.mutate();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Create session if it doesn't exist
    if (!sessionId) {
      createSession();
      // Wait a bit for session creation and then send message
      setTimeout(() => {
        if (sessionId) {
          setInputMessage('');
          setIsLoading(true);
          sendMessageMutation.mutate(inputMessage.trim());
        }
      }, 1000);
      return;
    }

    setInputMessage('');
    setIsLoading(true);
    sendMessageMutation.mutate(inputMessage.trim());
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      alert('CSV 파일만 업로드 가능합니다.');
    }
  };

  const handleUploadCsv = () => {
    if (csvFile) {
      setIsUploading(true);
      uploadCsvMutation.mutate(csvFile);
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
      <Card className={`w-80 shadow-2xl border-gray-200 ${isMinimized ? 'h-14' : 'h-96'} transition-all duration-300`}>
        {/* Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
              <Badge variant="secondary" className="text-xs bg-green-500 text-white border-green-400">
                {sessionId ? 'Online' : 'Connecting...'}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white hover:bg-blue-500"
                onClick={() => fileInputRef.current?.click()}
                title="데이터 파일 업로드"
              >
                <Upload className="w-3 h-3" />
              </Button>
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
          <CardContent className="p-0 flex flex-col h-80">
            {/* CSV Upload Section */}
            {csvFile && (
              <div className="p-3 bg-yellow-50 border-b border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-yellow-800">
                    선택된 파일: {csvFile.name}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleUploadCsv}
                      disabled={isUploading}
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
                {!sessionId && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-[75%]">
                      <div className="flex items-start gap-2">
                        <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          안녕하세요! AI Assistant입니다. CSV 파일을 업로드하거나 데이터 관련 질문을 해주세요.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {messages.map((message: any) => (
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
                        {new Date(message.timestamp || message.createdAt).toLocaleTimeString('ko-KR', { 
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
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send className="w-4 h-4" />
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