import axios from 'axios';
import FormData from 'form-data';

/**
 * 🦙 Llama 기반 Flowise API 서비스
 * 
 * 주요 기능:
 * - Vector 데이터 업로드 및 관리
 * - 챗봇 대화 처리
 * - 실제 데이터 기반 응답 생성
 */

export interface FlowiseConfig {
  apiUrl: string;
  chatflowId: string;
}

export interface FlowiseResponse {
  success: boolean;
  response: string;
  confidence: number;
  processingTime: number;
  metadata?: any;
}

export class FlowiseApiService {
  private config: FlowiseConfig;

  constructor(config: FlowiseConfig) {
    this.config = config;
  }

  /**
   * Vector 데이터 업로드 (파일 기반)
   */
  async uploadVectorData(fileData: Buffer, fileName: string, metadata: any = {}): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('files', fileData, fileName);
      formData.append('columnName', fileName.split('.')[0]);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await axios.post(
        `${this.config.apiUrl}/vector/upsert/${this.config.chatflowId}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Flowise Vector 업로드 실패:', error);
      throw error;
    }
  }

  /**
   * 챗봇 대화 처리
   */
  async sendMessage(message: string, sessionId?: string): Promise<FlowiseResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🔥 Flowise API 호출 시작:`);
      console.log(`  📝 메시지: "${message}"`);
      console.log(`  🆔 SessionId: ${sessionId || 'undefined'}`);
      console.log(`  🌐 API URL: ${this.config.apiUrl}/prediction/${this.config.chatflowId}`);
      
      const payload = {
        question: message,
        history: [],
        ...(sessionId && { sessionId }),
      };

      console.log(`  📦 Payload:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.config.apiUrl}/prediction/${this.config.chatflowId}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log(`  ✅ Flowise 응답 성공:`, response.data);

      const processingTime = Date.now() - startTime;

      // 응답 데이터에서 text 추출 시도
      let responseText = response.data.text || response.data.answer || response.data.message || response.data.result;
      
      // 응답이 객체인 경우 텍스트 추출
      if (!responseText && typeof response.data === 'object') {
        if (response.data.response) {
          responseText = response.data.response;
        } else if (response.data.content) {
          responseText = response.data.content;
        } else if (typeof response.data === 'string') {
          responseText = response.data;
        }
      }
      
      // 여전히 응답이 없으면 기본 메시지
      if (!responseText) {
        responseText = 'AI 서비스에서 응답을 받지 못했습니다. 다시 시도해주세요.';
      }

      return {
        success: true,
        response: responseText,
        confidence: 0.9,
        processingTime,
        metadata: response.data,
      };
    } catch (error: any) {
      console.error('❌ Flowise 메시지 전송 실패:', error);
      console.error('  📋 에러 세부사항:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      return {
        success: false,
        response: `AI 서비스 오류: ${error.message}`,
        confidence: 0.1,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 연결 상태 확인
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(this.config.apiUrl, { timeout: 10000 });
      return response.status === 200;
    } catch (error) {
      console.error('❌ Flowise 연결 확인 실패:', error);
      return false;
    }
  }
}

// 기본 Flowise 설정 (새로운 깨끗한 인스턴스 사용)
export const defaultFlowiseConfig: FlowiseConfig = {
  apiUrl: 'http://220.118.23.185:3000/api/v1',
  chatflowId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // 새로운 깨끗한 chatflow ID
};

// 싱글톤 인스턴스
export const flowiseService = new FlowiseApiService(defaultFlowiseConfig);