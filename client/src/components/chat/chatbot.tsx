import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Bot, User, Minimize2, Maximize2, Upload, FileSpreadsheet } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
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
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Create or get chat session
      const sessionResponse = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!sessionResponse.ok) throw new Error('Failed to create chat session');
      
      const { sessionId } = await sessionResponse.json();

      // Send message to AI
      const response = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentMessage })
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is CSV or Excel
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        message: '죄송합니다. CSV 또는 Excel 파일만 업로드 가능합니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setIsUploading(true);

    try {
      // Add upload notification message
      const uploadMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        message: `📁 "${file.name}" 파일을 업로드하고 AI 데이터베이스에 연동 중입니다...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, uploadMessage]);

      // Upload file to Flowise via backend proxy
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/upload-to-flowise', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'API 업로드 실패');
      }

      const result = await response.json();
      console.log('Flowise 업로드 결과:', result);

      // Add success message
      const successMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        message: `✅ "${file.name}" 파일이 성공적으로 업로드되었습니다!\n\n이제 이 파일의 내용에 대해 질문해 주세요. 예:\n• "업로드한 파일에서 특정 정보를 찾아줘"\n• "데이터 분석 결과를 알려줘"`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);

    } catch (error) {
      console.error('파일 업로드 오류:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        message: '파일 업로드에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('ai 모델') || input.includes('모델')) {
      return 'AI 모델과 관련해서 도움을 드릴 수 있습니다:\n\n• 모델 업로드 및 설정\n• 블록 연결 및 매핑 구성\n• 모델 테스트 및 결과 확인\n• View Setting에 결과 추가\n\n구체적으로 어떤 부분에 대해 알고 싶으신가요?';
    }
    
    if (input.includes('view') || input.includes('뷰') || input.includes('대시보드')) {
      return 'View Setting과 대시보드에 대해 도움을 드릴 수 있습니다:\n\n• 새로운 뷰 생성\n• 컴포넌트 추가 및 배치\n• 데이터 소스 연결\n• AI 모델 결과 시각화\n\n어떤 작업을 진행하고 계신가요?';
    }
    
    if (input.includes('데이터') || input.includes('연결')) {
      return '데이터 통합에 대해 도움을 드릴 수 있습니다:\n\n• SAP, Salesforce, Oracle 등 데이터 소스 연결\n• Google Sheets 및 Excel 파일 통합\n• 필드 매핑 및 변환\n• 자동화 워크플로우 설정\n\n어떤 데이터 소스를 연결하려고 하시나요?';
    }
    
    if (input.includes('테스트') || input.includes('결과')) {
      return 'AI 모델 테스트 결과를 View Setting에 추가하는 방법:\n\n1. AI 모델 구성 탭에서 모델을 테스트합니다\n2. 테스트 완료 후 "Add to View" 버튼을 클릭합니다\n3. 뷰 이름과 시각화 유형을 선택합니다\n4. View Setting에서 새로운 뷰를 확인할 수 있습니다\n\n더 자세한 설명이 필요하시면 말씀해 주세요!';
    }
    
    if (input.includes('안녕') || input.includes('hello')) {
      return '안녕하세요! Collaboration Portal에 오신 것을 환영합니다. 저는 여러분의 AI 어시스턴트입니다. 데이터 통합, AI 모델 관리, 뷰 설정 등에 대해 도움을 드릴 수 있습니다. 무엇을 도와드릴까요?';
    }
    
    return '궁금한 점에 대해 더 구체적으로 설명해 주시면 더 정확한 도움을 드릴 수 있습니다. 다음과 같은 주제들에 대해 도움을 드릴 수 있습니다:\n\n• AI 모델 업로드 및 구성\n• 데이터 소스 연결 및 통합\n• View Setting 및 대시보드 생성\n• 블록 연결 및 매핑\n• 테스트 결과 시각화';
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
              <Badge variant="secondary" className="text-xs bg-blue-500 text-white border-blue-400">
                Online
              </Badge>
            </div>
            <div className="flex items-center gap-1">
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
              {/* File Upload Section */}
              <div className="flex gap-2 mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="file-input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isLoading}
                  className="flex items-center gap-2"
                  data-testid="file-upload-button"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span>업로드 중...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>CSV/Excel 업로드</span>
                    </>
                  )}
                </Button>
              </div>
              
              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 text-sm"
                  disabled={isLoading || isUploading}
                  data-testid="chat-input"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || isUploading}
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