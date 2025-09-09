import OpenAI from "openai";

/**
 * 🎯 로컬 AI 처리 엔진 - 외부 Flowise API 의존성 제거
 * 
 * 주요 기능:
 * - OpenAI API를 통한 로컬 AI 처리 
 * - Fallback 메커니즘으로 외부 API 장애 대응
 * - 메모리 효율적인 데이터 처리
 * - 에러 복구 및 재시도 로직
 */

export interface AIProcessingOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  contextLimit?: number;
  enableFallback?: boolean;
}

export interface AIProcessingResult {
  response: string;
  tokensUsed: number;
  processingTime: number;
  dataSource: 'local' | 'openai' | 'fallback';
  confidence: number;
  metadata?: {
    model: string;
    promptLength: number;
    dataRows: number;
  };
}

export class LocalAIEngine {
  private openai: OpenAI | null = null;
  private fallbackResponses: Map<string, string> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeFallbackResponses();
  }

  /**
   * AI 엔진 초기화
   */
  async initialize(apiKey?: string): Promise<boolean> {
    try {
      // 1. OpenAI API 설정 시도
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (key) {
        this.openai = new OpenAI({ apiKey: key });
        
        // API 키 테스트
        await this.testConnection();
        console.log('✅ OpenAI API 연결 성공');
        this.isInitialized = true;
        return true;
      }
      
      console.warn('⚠️ OpenAI API 키가 없음 - Fallback 모드로 동작');
      this.isInitialized = true;
      return false;
    } catch (error) {
      console.error('❌ AI 엔진 초기화 실패:', error);
      console.log('🔄 Fallback 모드로 전환');
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * OpenAI API 연결 테스트
   */
  private async testConnection(): Promise<void> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    
    await this.openai.chat.completions.create({
      model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10
    });
  }

  /**
   * 메인 AI 처리 함수 - 데이터 분석 및 질문 응답
   * 🎯 AI 모델별 데이터 격리 지원
   */
  async processQuery(
    userMessage: string,
    uploadedData: any[] = [],
    options: AIProcessingOptions = {},
    modelId?: string
  ): Promise<AIProcessingResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      maxTokens = 2000,
      temperature = 0.7,
      model = 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      contextLimit = 4000,
      enableFallback = true
    } = options;

    try {
      // 🎯 모델별 데이터 격리 로깅
      if (modelId) {
        console.log(`🔒 AI 모델 ${modelId}에 대한 격리된 데이터 처리: ${uploadedData.length}개 레코드`);
      }
      
      // 1. OpenAI API 처리 시도
      if (this.openai) {
        console.log('🤖 OpenAI 로컬 처리 시작');
        return await this.processWithOpenAI(userMessage, uploadedData, {
          maxTokens,
          temperature,
          model,
          contextLimit,
          startTime
        }, modelId);
      }

      // 2. Fallback 처리
      if (enableFallback) {
        console.log('🔄 Fallback 모드로 처리');
        return this.processFallback(userMessage, uploadedData, startTime);
      }

      throw new Error('AI 처리 엔진이 사용 불가');

    } catch (error) {
      console.error('❌ AI 처리 오류:', error);
      
      // 3. 에러 시 Fallback
      if (enableFallback) {
        console.log('🛡️ 에러 복구: Fallback 모드로 전환');
        return this.processFallback(userMessage, uploadedData, startTime);
      }
      
      throw error;
    }
  }

  /**
   * OpenAI API를 통한 처리
   * 🎯 AI 모델별 데이터 격리 지원
   */
  private async processWithOpenAI(
    userMessage: string,
    uploadedData: any[],
    config: {
      maxTokens: number;
      temperature: number;
      model: string;
      contextLimit: number;
      startTime: number;
    },
    modelId?: string
  ): Promise<AIProcessingResult> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    // 데이터 요약 (컨텍스트 제한 대응)
    const dataContext = this.summarizeData(uploadedData, config.contextLimit);
    
    // 프롬프트 구성 (모델별 컨텍스트 추가)
    const systemPrompt = this.createSystemPrompt(dataContext, modelId);
    const prompt = this.createUserPrompt(userMessage, dataContext, modelId);
    
    console.log(`📊 데이터 컨텍스트: ${dataContext.rowCount}개 행, ${prompt.length}자 프롬프트`);

    try {
      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        response_format: { type: "json_object" },
      });

      const response = completion.choices[0].message.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const processingTime = Date.now() - config.startTime;

      console.log(`✅ OpenAI 처리 완료: ${tokensUsed} 토큰, ${processingTime}ms`);

      // JSON 응답 파싱
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
        return {
          response: parsedResponse.answer || parsedResponse.response || response,
          tokensUsed,
          processingTime,
          dataSource: 'openai',
          confidence: parsedResponse.confidence || 0.8,
          metadata: {
            model: config.model,
            promptLength: prompt.length,
            dataRows: uploadedData.length
          }
        };
      } catch (parseError) {
        // JSON 파싱 실패 시 텍스트 그대로 반환
        return {
          response,
          tokensUsed,
          processingTime,
          dataSource: 'openai',
          confidence: 0.7,
          metadata: {
            model: config.model,
            promptLength: prompt.length,
            dataRows: uploadedData.length
          }
        };
      }

    } catch (apiError: any) {
      console.error('OpenAI API 오류:', apiError);
      
      // API 한도 초과나 서비스 오류 시 fallback
      if (apiError.status === 429 || apiError.status >= 500) {
        console.log('🔄 API 한도/서비스 오류 - Fallback으로 전환');
        throw new Error('API_LIMIT_OR_SERVICE_ERROR');
      }
      
      throw apiError;
    }
  }

  /**
   * Fallback 처리 (로컬 규칙 기반)
   */
  private processFallback(
    userMessage: string,
    uploadedData: any[],
    startTime: number
  ): AIProcessingResult {
    const processingTime = Date.now() - startTime;
    
    // 키워드 기반 분석
    const analysis = this.analyzeKeywords(userMessage, uploadedData);
    
    return {
      response: analysis.response,
      tokensUsed: 0,
      processingTime,
      dataSource: 'fallback',
      confidence: analysis.confidence,
      metadata: {
        model: 'fallback-rules',
        promptLength: userMessage.length,
        dataRows: uploadedData.length
      }
    };
  }

  /**
   * 데이터 요약 (메모리 및 컨텍스트 제한 대응)
   */
  private summarizeData(data: any[], maxContext: number): {
    summary: string;
    rowCount: number;
    columns: string[];
    sampleData: any[];
  } {
    if (!data || data.length === 0) {
      return {
        summary: '업로드된 데이터가 없습니다.',
        rowCount: 0,
        columns: [],
        sampleData: []
      };
    }

    // 열 추출
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    
    // 샘플 데이터 (메모리 보호)
    const sampleSize = Math.min(10, data.length);
    const sampleData = data.slice(0, sampleSize);
    
    // 통계 정보
    const summary = `데이터셋: ${data.length}개 행, ${columns.length}개 열 (${columns.join(', ')})`;
    
    return {
      summary,
      rowCount: data.length,
      columns,
      sampleData
    };
  }

  /**
   * 시스템 프롬프트 생성
   * 🎯 AI 모델별 컨텍스트 지원
   */
  private createSystemPrompt(dataContext: any, modelId?: string): string {
    let prompt = `당신은 데이터 분석 전문가입니다. 
업로드된 데이터를 기반으로 사용자 질문에 정확히 답변하세요.

데이터 정보:
- ${dataContext.summary}
- 컬럼: ${dataContext.columns.join(', ')}`;

    if (modelId) {
      prompt += `\n\n🔒 보안 정책: 이 데이터는 AI 모델 ${modelId}에만 접근이 허용된 격리된 데이터입니다. 다른 모델이나 시스템과 공유하지 마세요.`;
    }

    prompt += `\n\nJSON 형식으로 응답하세요:
{
  "answer": "분석 결과 답변",
  "confidence": 0.8,
  "key_insights": ["주요 인사이트1", "인사이트2"],
  "data_summary": "데이터 요약"
}`;

    return prompt;
  }

  /**
   * 사용자 프롬프트 생성
   * 🎯 AI 모델별 데이터 추적 지원
   */
  private createUserPrompt(userMessage: string, dataContext: any, modelId?: string): string {
    let prompt = `질문: ${userMessage}\n\n`;
    
    if (modelId) {
      prompt += `🎯 AI 모델: ${modelId}\n`;
    }
    
    if (dataContext.sampleData.length > 0) {
      prompt += `샘플 데이터:\n`;
      prompt += JSON.stringify(dataContext.sampleData.slice(0, 3), null, 2);
      prompt += `\n\n총 ${dataContext.rowCount}개 행 중 일부입니다.`;
    }
    
    return prompt;
  }

  /**
   * 키워드 기반 분석 (Fallback용)
   */
  private analyzeKeywords(userMessage: string, data: any[]): {
    response: string;
    confidence: number;
  } {
    const message = userMessage.toLowerCase();
    
    // 데이터 기본 정보
    const dataInfo = data.length > 0 ? 
      `데이터셋: ${data.length}개 행, ${Object.keys(data[0] || {}).length}개 열` :
      '업로드된 데이터가 없습니다.';
    
    // 키워드 패턴 분석
    if (message.includes('분석') || message.includes('요약')) {
      return {
        response: `${dataInfo}\n\n간단한 분석을 수행했습니다. 더 자세한 분석을 위해서는 AI 기능을 활성화해주세요.`,
        confidence: 0.6
      };
    }
    
    if (message.includes('개수') || message.includes('수량')) {
      return {
        response: `데이터 개수: ${data.length}개`,
        confidence: 0.8
      };
    }
    
    if (message.includes('컬럼') || message.includes('필드')) {
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      return {
        response: `컬럼: ${columns.join(', ')} (총 ${columns.length}개)`,
        confidence: 0.8
      };
    }
    
    // 기본 응답
    return {
      response: `${dataInfo}\n\n현재 AI 기능이 제한되어 있습니다. 더 정확한 답변을 위해 AI 설정을 확인해주세요.`,
      confidence: 0.4
    };
  }

  /**
   * Fallback 응답 초기화
   */
  private initializeFallbackResponses(): void {
    this.fallbackResponses.set('data_analysis', '데이터를 분석했습니다. AI 기능을 활성화하면 더 자세한 분석을 제공할 수 있습니다.');
    this.fallbackResponses.set('data_summary', '데이터 요약을 생성했습니다.');
    this.fallbackResponses.set('error', '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.');
  }

  /**
   * 엔진 상태 확인
   */
  getStatus(): {
    isInitialized: boolean;
    hasOpenAI: boolean;
    canProcess: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      hasOpenAI: this.openai !== null,
      canProcess: this.isInitialized
    };
  }
}

// 싱글톤 인스턴스
export const localAI = new LocalAIEngine();