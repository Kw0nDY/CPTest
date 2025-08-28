import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, Settings, Bot, User, Wrench, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    searchResults?: any[];
    confidence?: number;
    equipmentType?: string;
    faultType?: string;
  };
  createdAt: string;
}

export default function ChatbotPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 대화 기록 조회
  const { data: conversationData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return { messages: [] };
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      return response.json();
    },
    enabled: !!conversationId
  });

  // 새 대화 시작
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/chat/conversations', {
        method: 'POST',
        body: { userId: 'guest' }
      });
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      toast({
        title: "새 대화 시작",
        description: "설비 유지보수 챗봇과의 대화를 시작합니다."
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "대화 시작에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!conversationId) throw new Error('대화가 시작되지 않았습니다.');
      return apiRequest(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { message }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      setInputMessage('');
    },
    onError: () => {
      toast({
        title: "오류",
        description: "메시지 전송에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 설비 데이터 초기화
  const initializeDataMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/maintenance/import', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      setIsInitialized(true);
      toast({
        title: "설비 데이터 초기화 완료",
        description: "설비 유지보수 데이터를 성공적으로 로드했습니다."
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "설비 데이터 초기화에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 메시지 전송 처리
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    if (!conversationId) {
      toast({
        title: "대화 시작 필요",
        description: "먼저 새 대화를 시작해주세요.",
        variant: "destructive"
      });
      return;
    }

    sendMessageMutation.mutate(inputMessage);
  };

  // 엔터 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 자동 스크롤
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversationData?.messages]);

  const messages = conversationData?.messages || [];

  // 메시지 렌더링
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-start space-x-2 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* 아바타 */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-500' : isSystem ? 'bg-gray-500' : 'bg-green-500'
          }`}>
            {isUser ? <User className="w-4 h-4 text-white" /> : 
             isSystem ? <Settings className="w-4 h-4 text-white" /> :
             <Bot className="w-4 h-4 text-white" />}
          </div>
          
          {/* 메시지 버블 */}
          <div className={`rounded-lg p-3 ${
            isUser ? 'bg-blue-500 text-white' : 
            isSystem ? 'bg-gray-100 text-gray-700' :
            'bg-white border border-gray-200'
          }`}>
            <div className="whitespace-pre-wrap text-sm">{message.content}</div>
            
            {/* 메타데이터 표시 */}
            {message.metadata && !isUser && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                {message.metadata.confidence && (
                  <Badge variant="secondary" className="mr-2">
                    신뢰도: {Math.round(message.metadata.confidence * 100)}%
                  </Badge>
                )}
                {message.metadata.searchResults && message.metadata.searchResults.length > 0 && (
                  <Badge variant="outline">
                    {message.metadata.searchResults.length}개 관련 결과
                  </Badge>
                )}
              </div>
            )}
            
            <div className="text-xs opacity-70 mt-1">
              {new Date(message.createdAt).toLocaleTimeString('ko-KR')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 사이드바 */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Wrench className="w-6 h-6 mr-2 text-blue-500" />
            설비 유지보수 챗봇
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            설비 문제 해결을 도와드립니다
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* 데이터 초기화 */}
          {!isInitialized && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">데이터 초기화 필요</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  설비 유지보수 데이터를 로드해야 챗봇이 작동합니다.
                </p>
                <Button 
                  onClick={() => initializeDataMutation.mutate()}
                  disabled={initializeDataMutation.isPending}
                  className="w-full"
                  size="sm"
                  data-testid="button-initialize-data"
                >
                  {initializeDataMutation.isPending ? '로딩중...' : '데이터 초기화'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 새 대화 시작 */}
          <Button 
            onClick={() => createConversationMutation.mutate()}
            disabled={createConversationMutation.isPending}
            className="w-full"
            variant="outline"
            data-testid="button-new-conversation"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            새 대화 시작
          </Button>

          {/* 현재 대화 정보 */}
          {conversationId && (
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  대화 ID: {conversationId.slice(-8)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  메시지: {messages.length}개
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator className="mt-auto" />
        
        {/* 예시 질문 */}
        <div className="p-4">
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">예시 질문</h3>
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              "MFC 가스 공급에 퍼지 실패 문제가 있어"
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              "진공 시스템에서 압력이 불안정해"
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              "RF 매칭에서 플라스마 점화가 안돼"
            </div>
          </div>
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 채팅 헤더 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                설비 유지보수 상담
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {conversationId ? '설비 문제에 대해 질문해보세요' : '새 대화를 시작해주세요'}
              </p>
            </div>
            <Badge variant={conversationId ? "default" : "secondary"}>
              {conversationId ? '활성' : '대기'}
            </Badge>
          </div>
        </div>

        {/* 메시지 영역 */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 dark:text-gray-400">메시지를 불러오는 중...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-center">
              <div className="text-gray-500 dark:text-gray-400">
                <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>설비 문제에 대해 질문해보세요.</p>
                <p className="text-sm mt-2">예: "MFC에서 가스 누설이 의심돼요"</p>
              </div>
            </div>
          ) : (
            <div>
              {messages.map(renderMessage)}
            </div>
          )}
        </ScrollArea>

        {/* 입력 영역 */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={conversationId ? "설비 문제에 대해 질문해보세요..." : "먼저 새 대화를 시작해주세요"}
              disabled={!conversationId || sendMessageMutation.isPending}
              className="flex-1"
              data-testid="input-message"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!conversationId || !inputMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {sendMessageMutation.isPending && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              AI가 답변을 생성하고 있습니다...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}