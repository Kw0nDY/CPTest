import { flowiseService, FlowiseApiService } from './flowiseApiService';

/**
 * 🦙 Llama 기반 AI 처리 엔진 - Flowise API 연동
 * 
 * 주요 기능:
 * - Flowise API를 통한 Llama 모델 AI 처리 
 * - Fallback 메커니즘으로 API 장애 대응
 * - 메모리 효율적인 데이터 처리
 * - 실제 데이터 기반 계산 및 분석
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
  dataSource: 'local' | 'flowise' | 'fallback';
  confidence: number;
  metadata?: {
    model: string;
    promptLength: number;
    dataRows: number;
  };
}

export class LocalAIEngine {
  private flowiseService: FlowiseApiService;
  private fallbackResponses: Map<string, string> = new Map();
  private isInitialized = false;

  constructor() {
    this.flowiseService = flowiseService;
    this.initializeFallbackResponses();
  }

  /**
   * AI 엔진 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      // Flowise API 연결 테스트
      const isConnected = await this.flowiseService.checkConnection();
      
      if (isConnected) {
        console.log('✅ Flowise API 연결 성공');
        this.isInitialized = true;
        return true;
      }
      
      console.warn('⚠️ Flowise API 연결 실패 - Fallback 모드로 동작');
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
      model = 'llama',
      contextLimit = 4000,
      enableFallback = true
    } = options;

    try {
      // 🎯 모델별 데이터 격리 로깅
      if (modelId) {
        console.log(`🔒 AI 모델 ${modelId}에 대한 격리된 데이터 처리: ${uploadedData.length}개 레코드`);
      }
      
      // 1. 먼저 로컬 실제 계산 시도 (최우선)
      console.log(`🔥 로컬 AI 실제 계산 엔진 호출: "${userMessage}"`);
      
      if (uploadedData.length > 0) {
        const columns = Object.keys(uploadedData[0] || {});
        const dataInfo = `실제 데이터셋: ${uploadedData.length}개 행, ${columns.length}개 열`;
        
        // 직접 실제 데이터 분석 수행
        const realAnalysis = this.performRealDataAnalysis(uploadedData, columns, dataInfo, userMessage);
        
        if (realAnalysis.confidence > 0.8) {
          console.log(`✅ 로컬 AI 실제 계산 완료: ${realAnalysis.confidence * 100}% 신뢰도`);
          return {
            response: realAnalysis.response,
            tokensUsed: 0,
            processingTime: Date.now() - startTime,
            dataSource: 'local',
            confidence: realAnalysis.confidence,
            metadata: {
              model: 'local-computation',
              promptLength: userMessage.length,
              dataRows: uploadedData.length
            }
          };
        }
      }
      
      // 2. Flowise API 처리 시도
      console.log('🦙 Flowise Llama 모델 처리 시작');
      const flowiseResult = await this.processWithFlowise(userMessage, uploadedData, {
        maxTokens,
        temperature,
        model,
        contextLimit,
        startTime
      }, modelId);
      
      if (flowiseResult.success) {
        return flowiseResult;
      }
      
      // 3. Fallback 처리
      if (enableFallback) {
        console.log('🔄 Fallback 모드로 전환');
        return await this.processFallback(userMessage, uploadedData, startTime);
      }
      
      throw new Error('모든 AI 처리 방법이 실패했습니다.');
      
    } catch (error) {
      console.error('❌ AI 처리 실패:', error);
      
      if (enableFallback) {
        console.log('🔄 Fallback 모드로 전환');
        return await this.processFallback(userMessage, uploadedData, startTime);
      }
      
      throw error;
    }
  }

  /**
   * Flowise API 처리
   */
  private async processWithFlowise(
    userMessage: string,
    uploadedData: any[],
    options: any,
    modelId?: string
  ): Promise<AIProcessingResult> {
    const { startTime, maxTokens } = options;
    
    try {
      // 데이터 컨텍스트 포함한 프롬프트 생성
      let enhancedMessage = userMessage;
      
      if (uploadedData.length > 0) {
        const dataContext = this.generateDataContext(uploadedData);
        enhancedMessage = `${dataContext}\n\n사용자 질문: ${userMessage}\n\n위 데이터를 기반으로 정확한 답변을 제공해주세요.`;
      }
      
      // Flowise API 호출
      console.log(`🚀 Flowise API 호출 준비:`);
      console.log(`  📝 Enhanced Message 길이: ${enhancedMessage.length} 문자`);
      console.log(`  🆔 Model ID: ${modelId || 'undefined'}`);
      console.log(`  📊 Upload Data 개수: ${uploadedData.length}개`);
      
      const result = await this.flowiseService.sendMessage(enhancedMessage, modelId);
      
      if (result.success) {
        return {
          response: result.response,
          tokensUsed: Math.floor(enhancedMessage.length / 4), // 대략적인 토큰 수
          processingTime: Date.now() - startTime,
          dataSource: 'flowise',
          confidence: result.confidence,
          metadata: {
            model: 'llama',
            promptLength: enhancedMessage.length,
            dataRows: uploadedData.length
          }
        };
      } else {
        throw new Error('Flowise API 응답 실패');
      }
    } catch (error) {
      console.error('❌ Flowise 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 실제 데이터 분석 수행
   */
  private performRealDataAnalysis(data: any[], columns: string[], dataInfo: string, message: string) {
    try {
      console.log(`📊 실제 데이터 분석 시작: ${data.length}개 레코드`);
      
      // 특정 ID 조회 처리
      const idMatch = message.match(/ID\s*(\d+)/i);
      if (idMatch) {
        return this.performIdQuery(data, idMatch[1], message);
      }
      
      // 평균값 계산 처리
      if (message.includes('평균') || message.includes('average')) {
        return this.performAverageCalculation(data, columns, message);
      }
      
      // 범위 계산 처리
      const rangeMatch = message.match(/(\d+)[-~](\d+)/);
      if (rangeMatch) {
        return this.performRangeCalculation(data, parseInt(rangeMatch[1]), parseInt(rangeMatch[2]), message);
      }
      
      // 통계 분석 처리
      if (message.includes('통계') || message.includes('분석') || message.includes('요약')) {
        return this.performStatisticalAnalysis(data, columns, message);
      }
      
      // 기본 데이터 분석
      return this.performDataAnalysis(data, columns, dataInfo);
      
    } catch (error) {
      console.error('❌ 실제 데이터 분석 실패:', error);
      return {
        response: '데이터 분석 중 오류가 발생했습니다.',
        confidence: 0.1
      };
    }
  }

  /**
   * ID 기반 조회
   */
  private performIdQuery(data: any[], targetId: string, message: string) {
    const record = data.find(row => row.Id === targetId || row.id === targetId);
    
    if (!record) {
      return {
        response: `❌ ID ${targetId}에 해당하는 데이터를 찾을 수 없습니다.`,
        confidence: 0.9
      };
    }
    
    let response = `📋 **ID ${targetId} 정보:**\n\n`;
    
    // OEE 관련 질문
    if (message.includes('OEE') || message.includes('oee')) {
      if (record.OEE) {
        response += `🎯 **OEE**: ${parseFloat(record.OEE).toFixed(2)}%\n`;
        if (record['OEE Availabllity']) response += `• 가용성: ${parseFloat(record['OEE Availabllity']).toFixed(2)}%\n`;
        if (record['OEE Performance']) response += `• 성능: ${parseFloat(record['OEE Performance']).toFixed(2)}%\n`;
        if (record['OEE Quality']) response += `• 품질: ${parseFloat(record['OEE Quality']).toFixed(2)}%\n`;
      } else {
        response += `❌ OEE 데이터가 없습니다.\n`;
      }
    }
    
    // 온도 관련 질문
    if (message.includes('온도') || message.includes('Temperature')) {
      if (record.Temperature) {
        response += `🌡️ **온도**: ${record.Temperature}°C\n`;
      } else {
        response += `❌ 온도 데이터가 없습니다.\n`;
      }
    }
    
    // 생산율 관련 질문
    if (message.includes('생산') || message.includes('Production')) {
      if (record['Production Rate']) {
        response += `⚙️ **생산율**: ${parseFloat(record['Production Rate']).toFixed(2)}\n`;
      }
      if (record['Target Production Rate']) {
        response += `🎯 **목표 생산율**: ${record['Target Production Rate']}\n`;
      }
    }
    
    // 추가 정보
    if (record.Operator) response += `👤 **운영자**: ${record.Operator}\n`;
    if (record.Status) response += `📊 **상태**: ${record.Status}\n`;
    if (record.Phase) response += `🔄 **단계**: ${record.Phase}\n`;
    
    return {
      response: response,
      confidence: 0.95
    };
  }

  /**
   * 평균값 계산
   */
  private performAverageCalculation(data: any[], columns: string[], message: string) {
    let response = `📊 **평균값 계산 결과:**\n\n`;
    
    // 온도 평균
    if (message.includes('온도') || message.includes('Temperature')) {
      const temps = data.map(row => parseFloat(row.Temperature)).filter(t => !isNaN(t));
      if (temps.length > 0) {
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
        response += `🌡️ **온도 평균**: ${avg.toFixed(2)}°C (${temps.length}개 데이터)\n`;
        response += `📈 **최소값**: ${Math.min(...temps)}°C\n`;
        response += `📈 **최대값**: ${Math.max(...temps)}°C\n\n`;
        
        return {
          response: response,
          confidence: 0.95
        };
      }
    }
    
    // OEE 평균
    if (message.includes('OEE') || message.includes('oee')) {
      const oees = data.map(row => parseFloat(row.OEE)).filter(o => !isNaN(o));
      if (oees.length > 0) {
        const avg = oees.reduce((a, b) => a + b, 0) / oees.length;
        response += `🎯 **OEE 평균**: ${avg.toFixed(2)}% (${oees.length}개 데이터)\n`;
        response += `📈 **최소값**: ${Math.min(...oees).toFixed(2)}%\n`;
        response += `📈 **최대값**: ${Math.max(...oees).toFixed(2)}%\n\n`;
        
        return {
          response: response,
          confidence: 0.95
        };
      }
    }
    
    // 생산율 평균
    if (message.includes('생산') || message.includes('Production')) {
      const rates = data.map(row => parseFloat(row['Production Rate'])).filter(r => !isNaN(r));
      if (rates.length > 0) {
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        response += `⚙️ **생산율 평균**: ${avg.toFixed(2)} (${rates.length}개 데이터)\n`;
        response += `📈 **최소값**: ${Math.min(...rates).toFixed(2)}\n`;
        response += `📈 **최대값**: ${Math.max(...rates).toFixed(2)}\n\n`;
        
        return {
          response: response,
          confidence: 0.95
        };
      }
    }
    
    return {
      response: '요청하신 평균값을 계산할 수 있는 데이터를 찾지 못했습니다.',
      confidence: 0.3
    };
  }

  /**
   * 범위 계산
   */
  private performRangeCalculation(data: any[], startId: number, endId: number, message: string) {
    const rangeData = data.filter(row => {
      const id = parseInt(row.Id || row.id);
      return id >= startId && id <= endId;
    });
    
    if (rangeData.length === 0) {
      return {
        response: `❌ ID ${startId}~${endId} 범위의 데이터를 찾을 수 없습니다.`,
        confidence: 0.9
      };
    }
    
    let response = `📊 **ID ${startId}~${endId} 범위 분석 (${rangeData.length}개 데이터):**\n\n`;
    
    // 생산율 평균
    if (message.includes('생산') || message.includes('Production')) {
      const rates = rangeData.map(row => parseFloat(row['Production Rate'])).filter(r => !isNaN(r));
      if (rates.length > 0) {
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        response += `⚙️ **생산율 평균**: ${avg.toFixed(2)}\n`;
        response += `📈 **최소값**: ${Math.min(...rates).toFixed(2)}\n`;
        response += `📈 **최대값**: ${Math.max(...rates).toFixed(2)}\n`;
        response += `📊 **데이터 개수**: ${rates.length}개\n\n`;
      }
    }
    
    // OEE 평균
    if (message.includes('OEE')) {
      const oees = rangeData.map(row => parseFloat(row.OEE)).filter(o => !isNaN(o));
      if (oees.length > 0) {
        const avg = oees.reduce((a, b) => a + b, 0) / oees.length;
        response += `🎯 **OEE 평균**: ${avg.toFixed(2)}%\n`;
        response += `📈 **최소값**: ${Math.min(...oees).toFixed(2)}%\n`;
        response += `📈 **최대값**: ${Math.max(...oees).toFixed(2)}%\n`;
        response += `📊 **데이터 개수**: ${oees.length}개\n\n`;
      }
    }
    
    return {
      response: response,
      confidence: 0.9
    };
  }

  /**
   * 통계 분석
   */
  private performStatisticalAnalysis(data: any[], columns: string[], message: string) {
    const numericColumns = columns.filter(col => {
      const values = data.slice(0, 10).map(row => parseFloat(row[col])).filter(n => !isNaN(n));
      return values.length > 5;
    });
    
    if (numericColumns.length === 0) {
      return {
        response: '통계 분석을 위한 수치 데이터가 없습니다.',
        confidence: 0.8
      };
    }
    
    let stats = `📈 **통계 분석 결과:**\n\n`;
    
    numericColumns.slice(0, 5).forEach(col => {
      const values = data.map(row => parseFloat(row[col])).filter(n => !isNaN(n));
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
      
      stats += `📊 **${col}**:\n`;
      stats += `  • 평균: ${avg.toFixed(2)}\n`;
      stats += `  • 중간값: ${median.toFixed(2)}\n`;
      stats += `  • 최소값: ${min}\n`;
      stats += `  • 최대값: ${max}\n`;
      stats += `  • 데이터 개수: ${values.length}개\n\n`;
    });
    
    return {
      response: stats,
      confidence: 0.9
    };
  }

  /**
   * 기본 데이터 분석
   */
  private performDataAnalysis(data: any[], columns: string[], dataInfo: string) {
    const sampleData = data.slice(0, 3);
    let analysis = `${dataInfo}\n\n📊 **데이터 분석 결과:**\n`;
    
    // 수치형 컬럼 분석
    const numericColumns = columns.filter(col => {
      const values = data.slice(0, 10).map(row => parseFloat(row[col])).filter(n => !isNaN(n));
      return values.length > 5;
    });
    
    if (numericColumns.length > 0) {
      analysis += `\n🔢 **수치 데이터 (${numericColumns.length}개 컬럼):**\n`;
      numericColumns.slice(0, 3).forEach(col => {
        const values = data.map(row => parseFloat(row[col])).filter(n => !isNaN(n));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        analysis += `• ${col}: 평균 ${avg.toFixed(2)}, 범위 ${min}-${max}\n`;
      });
    }
    
    // 텍스트 컬럼 분석
    const textColumns = columns.filter(col => !numericColumns.includes(col));
    if (textColumns.length > 0) {
      analysis += `\n📝 **텍스트 데이터 (${textColumns.length}개 컬럼):**\n`;
      textColumns.slice(0, 3).forEach(col => {
        const uniqueValues = [...new Set(data.map(row => row[col]).filter(v => v))];
        analysis += `• ${col}: ${uniqueValues.length}개 고유값\n`;
      });
    }
    
    analysis += `\n💡 **주요 발견사항:**\n• 전체 ${data.length}개의 레코드가 분석되었습니다.\n• ${numericColumns.length}개의 수치 컬럼과 ${textColumns.length}개의 텍스트 컬럼을 포함합니다.`;
    
    return { response: analysis, confidence: 0.9 };
  }

  /**
   * 데이터 컨텍스트 생성
   */
  private generateDataContext(data: any[]): string {
    if (data.length === 0) return '';
    
    const sample = data.slice(0, 3);
    const columns = Object.keys(sample[0] || {});
    
    let context = `📊 **데이터 컨텍스트:**\n`;
    context += `- 총 레코드: ${data.length}개\n`;
    context += `- 컬럼: ${columns.join(', ')}\n`;
    context += `- 샘플 데이터:\n`;
    
    sample.forEach((row, index) => {
      context += `  ${index + 1}. ${JSON.stringify(row, null, 2)}\n`;
    });
    
    return context;
  }

  /**
   * Fallback 처리
   */
  private async processFallback(
    userMessage: string,
    uploadedData: any[],
    startTime: number
  ): Promise<AIProcessingResult> {
    
    // 로컬 데이터 분석 시도
    if (uploadedData.length > 0) {
      const columns = Object.keys(uploadedData[0] || {});
      const dataInfo = `실제 데이터셋: ${uploadedData.length}개 행, ${columns.length}개 열`;
      
      const analysis = this.performRealDataAnalysis(uploadedData, columns, dataInfo, userMessage);
      
      return {
        response: analysis.response,
        tokensUsed: 0,
        processingTime: Date.now() - startTime,
        dataSource: 'fallback',
        confidence: analysis.confidence,
        metadata: {
          model: 'fallback-local',
          promptLength: userMessage.length,
          dataRows: uploadedData.length
        }
      };
    }
    
    // 키워드 기반 응답
    const analysis = this.analyzeKeywords(userMessage, uploadedData);
    
    return {
      response: analysis.response,
      tokensUsed: 0,
      processingTime: Date.now() - startTime,
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
   * 키워드 기반 분석 (최종 fallback)
   */
  private analyzeKeywords(message: string, data: any[]) {
    const lowerMessage = message.toLowerCase();
    
    // 기본 응답
    if (this.fallbackResponses.has(lowerMessage)) {
      return {
        response: this.fallbackResponses.get(lowerMessage) || '응답을 찾을 수 없습니다.',
        confidence: 0.6
      };
    }
    
    // 패턴 매칭
    if (lowerMessage.includes('안녕') || lowerMessage.includes('hello')) {
      return {
        response: '안녕하세요! 데이터 분석에 도움을 드리겠습니다.',
        confidence: 0.8
      };
    }
    
    if (lowerMessage.includes('도움') || lowerMessage.includes('help')) {
      return {
        response: '다음과 같은 질문을 할 수 있습니다:\n- ID별 정보 조회\n- 평균값 계산\n- 통계 분석\n- 데이터 요약',
        confidence: 0.7
      };
    }
    
    return {
      response: `죄송합니다. "${message}"에 대한 답변을 찾을 수 없습니다. 좀 더 구체적인 질문을 해주세요.`,
      confidence: 0.3
    };
  }

  /**
   * Fallback 응답 초기화
   */
  private initializeFallbackResponses(): void {
    this.fallbackResponses.set('데이터', '업로드된 데이터를 분석해드릴 수 있습니다.');
    this.fallbackResponses.set('분석', '데이터 분석 기능을 제공합니다.');
    this.fallbackResponses.set('통계', '기본적인 통계 분석이 가능합니다.');
    this.fallbackResponses.set('평균', '평균값 계산을 지원합니다.');
    this.fallbackResponses.set('합계', '합계 계산을 지원합니다.');
  }

  // 외부에서 직접 호출할 수 있는 메서드들
  analyzeBioreactorData(data: any[], message: string, dataInfo: string) {
    return this.performRealDataAnalysis(data, Object.keys(data[0] || {}), dataInfo, message);
  }

  analyzeGeneralData(data: any[], columns: string[], message: string, dataInfo: string) {
    return this.performRealDataAnalysis(data, columns, dataInfo, message);
  }
}

// 싱글톤 인스턴스
export const localAI = new LocalAIEngine();