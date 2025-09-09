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
      const payload = {
        question: message,
        history: [],
        ...(sessionId && { sessionId }),
      };

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

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        response: response.data.text || response.data.answer || '응답을 받지 못했습니다.',
        confidence: 0.9,
        processingTime,
        metadata: response.data,
      };
    } catch (error) {
      console.error('❌ Flowise 메시지 전송 실패:', error);
      
      return {
        success: false,
        response: '죄송합니다. 현재 서비스에 문제가 있습니다.',
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

// 기본 Flowise 설정
export const defaultFlowiseConfig: FlowiseConfig = {
  apiUrl: 'http://220.118.23.185:3000/api/v1',
  chatflowId: '9e85772e-dc56-4b4d-bb00-e18aeb80a484',
};

// 싱글톤 인스턴스
export const flowiseService = new FlowiseApiService(defaultFlowiseConfig);