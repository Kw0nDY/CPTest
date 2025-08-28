import { db } from './db';
import { chatConversations, chatMessages, type InsertChatConversation, type InsertChatMessage } from '@shared/schema';
import { MaintenanceService } from './maintenanceService';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export class ChatService {
  private maintenanceService: MaintenanceService;
  
  constructor() {
    this.maintenanceService = new MaintenanceService();
  }
  
  // 새로운 대화 시작
  async createConversation(userId?: string): Promise<string> {
    const conversationId = randomUUID();
    const sessionId = randomUUID();
    
    const conversation: InsertChatConversation = {
      id: conversationId,
      userId: userId || null,
      sessionId: sessionId
    };
    
    await db.insert(chatConversations).values(conversation);
    return conversationId;
  }
  
  // 메시지 저장
  async saveMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: any): Promise<void> {
    const messageId = randomUUID();
    
    const message: InsertChatMessage = {
      id: messageId,
      conversationId,
      role,
      content,
      metadata
    };
    
    await db.insert(chatMessages).values(message);
  }
  
  // 대화 기록 조회
  async getConversationHistory(conversationId: string): Promise<any[]> {
    return await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }
  
  // 설비 유지보수 질문 처리
  async processMaintenanceQuery(conversationId: string, userMessage: string): Promise<string> {
    try {
      // 사용자 메시지 저장
      await this.saveMessage(conversationId, 'user', userMessage);
      
      // 설비 유지보수 데이터 검색
      const searchResults = await this.maintenanceService.searchMaintenanceKnowledge(userMessage);
      
      // AI 응답 생성
      const assistantResponse = await this.maintenanceService.generateMaintenanceAdvice(userMessage);
      
      // 응답 메시지 저장 (메타데이터 포함)
      await this.saveMessage(conversationId, 'assistant', assistantResponse, {
        searchResults: searchResults.map(r => ({
          equipmentType: r.equipmentType,
          faultDescription: r.faultDescription,
          solution: r.solution,
          score: r.score
        })),
        confidence: searchResults.length > 0 ? searchResults[0].score / 10 : 0
      });
      
      return assistantResponse;
      
    } catch (error) {
      console.error('챗봇 쿼리 처리 실패:', error);
      const errorMessage = "죄송합니다. 시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      
      await this.saveMessage(conversationId, 'assistant', errorMessage, {
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
      
      return errorMessage;
    }
  }
  
  // Flowise API와 연동하는 함수 (향후 확장용)
  async queryFlowiseAPI(query: string, vectorStoreId: string): Promise<any> {
    try {
      // Flowise API 엔드포인트 (외부 API 사용 시)
      const apiUrl = `http://220.118.23.185:3000/api/v1/vector/upsert/${vectorStoreId}`;
      
      // 현재는 내부 데이터만 사용하므로 주석 처리
      /*
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: query
        })
      });
      
      return await response.json();
      */
      
      // 내부 데이터베이스만 사용
      return await this.maintenanceService.searchMaintenanceKnowledge(query);
      
    } catch (error) {
      console.error('Flowise API 호출 실패:', error);
      throw error;
    }
  }
}