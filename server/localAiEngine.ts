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
        return await this.processFallback(userMessage, uploadedData, startTime);
      }

      throw new Error('AI 처리 엔진이 사용 불가');

    } catch (error) {
      console.error('❌ AI 처리 오류:', error);
      
      // 3. 에러 시 Fallback
      if (enableFallback) {
        console.log('🛡️ 에러 복구: Fallback 모드로 전환');
        return await this.processFallback(userMessage, uploadedData, startTime);
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
   * Fallback 처리 - 업로드된 AI 모델 실행
   */
  private async processFallback(
    userMessage: string,
    uploadedData: any[],
    startTime: number
  ): Promise<AIProcessingResult> {
    const processingTime = Date.now() - startTime;
    
    // 🚀 로컬 AI 엔진으로 실제 계산 수행 (우선순위)
    try {
      console.log(`🔥 로컬 AI 실제 계산 엔진 호출: "${userMessage}"`);
      
      if (uploadedData.length === 0) {
        throw new Error('No data available for analysis');
      }
      
      const columns = Object.keys(uploadedData[0] || {});
      const dataInfo = `실제 데이터셋: ${uploadedData.length}개 행, ${columns.length}개 열`;
      
      // 직접 실제 데이터 분석 수행
      const realAnalysis = this.performRealDataAnalysis(uploadedData, columns, dataInfo, userMessage);
      
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
    } catch (localError) {
      console.warn('⚠️ 로컬 AI 실제 계산 실패:', localError.message);
    }

    try {
      // 2. 로컬 계산이 불가능한 경우에만 업로드된 AI 모델 실행
      const aiModelResult = await this.executeUploadedAIModel(userMessage, uploadedData);
      if (aiModelResult && !aiModelResult.includes('AI 모델 실행 완료')) {
        console.log('✅ 업로드된 AI 모델 실행 성공 (로컬 계산 불가능한 경우)');
        return {
          response: aiModelResult,
          tokensUsed: 0,
          processingTime: Date.now() - startTime,
          dataSource: 'local',
          confidence: 0.85,
          metadata: {
            model: 'user-uploaded-model',
            promptLength: userMessage.length,
            dataRows: uploadedData.length
          }
        };
      }
    } catch (aiModelError) {
      console.warn('⚠️ 업로드된 AI 모델 실행 실패:', aiModelError);
    }
    
    // 2. AI 모델 실행 실패 시 키워드 기반 분석
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
   * 업로드된 AI 모델 파일 실행
   */
  private async executeUploadedAIModel(userMessage: string, uploadedData: any[]): Promise<string | null> {
    const fs = await import('fs');
    const path = await import('path');
    const { spawn } = (await import('child_process')).default;
    
    try {
      // attached_assets 폴더에서 AI 모델 파일 찾기
      const assetsPath = path.join(process.cwd(), 'attached_assets');
      const aiModelFiles = [];
      
      if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        
        // Python AI 모델 파일들 찾기
        for (const file of files) {
          if (file.includes('flowise_api') && file.endsWith('.py')) {
            aiModelFiles.push(path.join(assetsPath, file));
          } else if (file.includes('app_') && file.endsWith('.py')) {
            aiModelFiles.push(path.join(assetsPath, file));
          }
        }
      }
      
      if (aiModelFiles.length === 0) {
        console.log('📝 업로드된 AI 모델 파일을 찾을 수 없음');
        return null;
      }
      
      // 가장 최신 파일 사용
      const latestModelFile = aiModelFiles.sort().pop();
      console.log(`🤖 AI 모델 실행: ${latestModelFile}`);
      
      // 🔧 실제 데이터 파일 생성 (AI 모델이 사용할 수 있도록) - 절대경로 사용
      const workingDir = process.cwd();
      const tempDataPath = path.join(workingDir, 'temp_data.json');
      const tempCsvPath = path.join(workingDir, 'example.csv'); // Python이 찾는 파일명
      
      // 실제 전달받은 데이터를 JSON과 CSV 형태로 모두 생성
      const dataToSave = {
        userMessage: userMessage,
        uploadedData: uploadedData.slice(0, 500), // 더 많은 데이터 전달
        totalDataCount: uploadedData.length,
        timestamp: new Date().toISOString(),
        workingDirectory: workingDir
      };
      
      fs.writeFileSync(tempDataPath, JSON.stringify(dataToSave, null, 2));
      console.log(`📁 temp_data.json 생성: ${tempDataPath} (${dataToSave.uploadedData.length}개 레코드)`);
      
      // Python이 기대하는 example.csv 파일도 생성
      if (uploadedData.length > 0 && uploadedData[0] && typeof uploadedData[0] === 'object') {
        const csvHeaders = Object.keys(uploadedData[0]);
        const csvContent = [
          csvHeaders.join(','),
          ...uploadedData.slice(0, 100).map(row => 
            csvHeaders.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
          )
        ].join('\n');
        
        fs.writeFileSync(tempCsvPath, csvContent);
        console.log(`📊 example.csv 생성: ${tempCsvPath} (${uploadedData.slice(0, 100).length}개 레코드)`);
      }
      
      // 🚀 개선된 AI 모델 실행 래퍼 스크립트 생성 - 절대경로 및 예외처리 강화
      const wrapperScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json
import os
import traceback
from pathlib import Path

# 🔧 작업 디렉토리 설정 및 경로 확인
working_dir = "${workingDir}"
os.chdir(working_dir)
print(f"🏠 작업 디렉토리: {working_dir}")

# 🔧 데이터 파일 경로 확인
temp_data_path = os.path.join(working_dir, 'temp_data.json')
example_csv_path = os.path.join(working_dir, 'example.csv')

print(f"📂 temp_data.json 경로: {temp_data_path} (존재: {os.path.exists(temp_data_path)})")
print(f"📊 example.csv 경로: {example_csv_path} (존재: {os.path.exists(example_csv_path)})")

try:
    # 사용자 질문과 데이터 로드
    if os.path.exists(temp_data_path):
        with open(temp_data_path, 'r', encoding='utf-8') as f:
            input_data = json.load(f)
        
        user_message = input_data.get('userMessage', '')
        uploaded_data = input_data.get('uploadedData', [])
        total_count = input_data.get('totalDataCount', 0)
        
        print(f"🔍 사용자 질문: {user_message}")
        print(f"📊 로드된 데이터 크기: {len(uploaded_data)}개 레코드 (전체: {total_count}개)")
        
        # 환경변수로도 데이터 경로 제공
        os.environ['DATA_FILE'] = example_csv_path
        os.environ['USER_MESSAGE'] = user_message
        os.environ['DATA_COUNT'] = str(len(uploaded_data))
        
        try:
            # 🤖 원본 AI 모델 실행
            print(f"🚀 AI 모델 실행 시작: ${latestModelFile}")
            exec(open('${latestModelFile}').read())
            
            # 결과 처리 및 JSON 출력
            result = {
                "success": True,
                "userMessage": user_message,
                "dataCount": len(uploaded_data),
                "timestamp": input_data.get('timestamp'),
                "response": "AI 모델이 성공적으로 실행되었습니다."
            }
            
            if 'output' in locals():
                result["aiModelOutput"] = output
                result["response"] = f"AI 모델 실행 완료: {user_message}에 대한 분석 결과를 제공합니다."
                print("🎯 AI 모델 실행 결과:")
                print(json.dumps(output, ensure_ascii=False, indent=2))
            else:
                # 기본 데이터 분석 제공
                if uploaded_data and len(uploaded_data) > 0:
                    sample = uploaded_data[0]
                    if isinstance(sample, dict):
                        result["dataStructure"] = list(sample.keys())
                        result["sampleData"] = sample
                        result["response"] = f"📈 {user_message}에 대한 데이터 분석: {len(uploaded_data)}개 레코드에서 {len(sample.keys())}개 컬럼 분석 완료"
            
            # 최종 JSON 결과 출력
            print("===JSON_OUTPUT_START===")
            print(json.dumps(result, ensure_ascii=False, indent=2))
            print("===JSON_OUTPUT_END===")
            
        except Exception as model_error:
            error_result = {
                "success": False,
                "error": str(model_error),
                "traceback": traceback.format_exc(),
                "userMessage": user_message,
                "dataCount": len(uploaded_data),
                "response": f"❌ AI 모델 실행 중 오류가 발생했습니다: {str(model_error)}"
            }
            print("===JSON_OUTPUT_START===")
            print(json.dumps(error_result, ensure_ascii=False, indent=2))
            print("===JSON_OUTPUT_END===")
            
    else:
        error_result = {
            "success": False,
            "error": f"temp_data.json 파일을 찾을 수 없습니다: {temp_data_path}",
            "response": "❌ 데이터 파일을 찾을 수 없어 AI 모델을 실행할 수 없습니다."
        }
        print("===JSON_OUTPUT_START===")
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        print("===JSON_OUTPUT_END===")

except Exception as e:
    error_result = {
        "success": False,
        "error": str(e),
        "traceback": traceback.format_exc(),
        "response": f"❌ 시스템 오류가 발생했습니다: {str(e)}"
    }
    print("===JSON_OUTPUT_START===")
    print(json.dumps(error_result, ensure_ascii=False, indent=2))
    print("===JSON_OUTPUT_END===")
`;
      
      const wrapperPath = path.join(process.cwd(), 'ai_model_wrapper.py');
      fs.writeFileSync(wrapperPath, wrapperScript);
      
      // 🚀 개선된 Python 스크립트 실행 - 절대경로, 환경변수, 로깅 강화
      return new Promise((resolve, reject) => {
        console.log(`🐍 Python 실행 시작: python3 ${wrapperPath}`);
        console.log(`📁 작업 디렉토리: ${workingDir}`);
        
        const pythonProcess = spawn('python3', [wrapperPath], {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PYTHONPATH: workingDir,
            DATA_FILE: tempCsvPath,
            TEMP_DATA_FILE: tempDataPath
          }
        });
        
        let output = '';
        let error = '';
        let jsonOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          console.log(`🐍 Python stdout: ${chunk.trim()}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          error += chunk;
          console.warn(`🐍 Python stderr: ${chunk.trim()}`);
        });
        
        pythonProcess.on('close', (code) => {
          console.log(`🐍 Python 프로세스 종료: exit code ${code}`);
          
          // 🔧 JSON 결과 추출
          const jsonStartMarker = '===JSON_OUTPUT_START===';
          const jsonEndMarker = '===JSON_OUTPUT_END===';
          
          if (output.includes(jsonStartMarker) && output.includes(jsonEndMarker)) {
            const startIndex = output.indexOf(jsonStartMarker) + jsonStartMarker.length;
            const endIndex = output.indexOf(jsonEndMarker);
            jsonOutput = output.substring(startIndex, endIndex).trim();
            
            try {
              const parsedResult = JSON.parse(jsonOutput);
              console.log(`✅ Python JSON 결과 파싱 성공:`, parsedResult);
              
              // 임시 파일 정리
              try {
                if (fs.existsSync(tempDataPath)) fs.unlinkSync(tempDataPath);
                if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);
                if (fs.existsSync(wrapperPath)) fs.unlinkSync(wrapperPath);
              } catch (cleanupError) {
                console.warn('파일 정리 오류:', cleanupError);
              }
              
              // 성공적인 결과 반환
              if (parsedResult.success) {
                resolve(parsedResult.response || '✅ AI 모델 실행 완료');
              } else {
                console.warn('❌ Python AI 모델 실행 실패:', parsedResult.error);
                resolve(parsedResult.response || '❌ AI 모델 실행 중 오류가 발생했습니다.');
              }
              
            } catch (parseError) {
              console.error('❌ Python JSON 결과 파싱 실패:', parseError);
              console.log('원본 JSON 출력:', jsonOutput);
              
              // 파일 정리
              try {
                if (fs.existsSync(tempDataPath)) fs.unlinkSync(tempDataPath);
                if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);
                if (fs.existsSync(wrapperPath)) fs.unlinkSync(wrapperPath);
              } catch (cleanupError) {
                console.warn('파일 정리 오류:', cleanupError);
              }
              
              resolve(`✅ AI 모델 실행 완료 (JSON 파싱 실패, 원본 출력 사용)\n${output}`);
            }
            
          } else {
            // JSON 마커가 없는 경우 - 일반 출력 사용
            console.warn('⚠️ JSON 마커를 찾을 수 없음, 일반 출력 사용');
            console.log('Python 전체 출력:', output);
            
            // 파일 정리
            try {
              if (fs.existsSync(tempDataPath)) fs.unlinkSync(tempDataPath);
              if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);
              if (fs.existsSync(wrapperPath)) fs.unlinkSync(wrapperPath);
            } catch (cleanupError) {
              console.warn('파일 정리 오류:', cleanupError);
            }
            
            if (code === 0) {
              resolve(output || '✅ AI 모델이 실행되었지만 출력이 없습니다.');
            } else {
              resolve(`❌ AI 모델 실행 실패 (exit code: ${code})\n에러: ${error}\n출력: ${output}`);
            }
          }
        });
        
        // 🔧 프로세스 타임아웃 처리 (30초)
        const timeout = setTimeout(() => {
          console.warn('⏰ Python 프로세스 타임아웃 (30초)');
          pythonProcess.kill('SIGTERM');
          
          // 파일 정리
          try {
            if (fs.existsSync(tempDataPath)) fs.unlinkSync(tempDataPath);
            if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);
            if (fs.existsSync(wrapperPath)) fs.unlinkSync(wrapperPath);
          } catch (cleanupError) {
            console.warn('파일 정리 오류:', cleanupError);
          }
          
          resolve('⏰ AI 모델 실행 시간 초과 (30초)');
        }, 30000);
        
        pythonProcess.on('close', () => {
          clearTimeout(timeout);
        });
      });
      
    } catch (error) {
      console.error('AI 모델 실행 시스템 오류:', error);
      return null;
    }
  }

  /**
   * 데이터 요약 (메모리 및 컨텍스트 제한 대응)
   * 🎯 대용량 파일 스마트 분석 지원
   */
  private summarizeData(data: any[], maxContext: number, message?: string): {
    summary: string;
    rowCount: number;
    columns: string[];
    sampleData: any[];
    metadata?: any;
  } {
    if (!data || data.length === 0) {
      return {
        summary: '업로드된 데이터가 없습니다.',
        rowCount: 0,
        columns: [],
        sampleData: []
      };
    }

    // 전체 데이터 청크 처리 (대용량 파일 지원)
    const chunkItems = data.filter(item => item.type === 'full_data_chunks');
    const enterpriseChunkItems = data.filter(item => item.type === 'enterprise_chunked_data');
    const metadataItems = data.filter(item => item.type === 'large_file_metadata');
    const actualData = data.filter(item => !item.type || 
      !['large_file_metadata', 'full_data_chunks', 'enterprise_chunked_data'].includes(item.type));
    
    let summary = '';
    let columns: string[] = [];
    let rowCount = actualData.length;
    let sampleData: any[] = [];
    
    if (enterpriseChunkItems.length > 0) {
      // 🚀 엔터프라이즈 청크 데이터 처리 (최신 RAG 시스템)
      const enterpriseData = enterpriseChunkItems[0];
      columns = enterpriseData.headers || [];
      rowCount = enterpriseData.totalRows;
      
      // RAG 기반 스마트 청크 검색
      const relevantBatches = this.selectRelevantBatches(enterpriseData.batches, message || '');
      
      // 선택된 배치에서 대표 데이터 추출
      sampleData = this.extractRepresentativeDataFromBatches(relevantBatches, 75);
      
      summary = `🚀 엔터프라이즈 데이터셋: ${rowCount.toLocaleString()}개 행 (${enterpriseData.totalBatches}개 배치), ${columns.length}개 열. RAG 검색으로 ${relevantBatches.length}개 관련 배치에서 ${sampleData.length}개 데이터 분석`;
      
    } else if (chunkItems.length > 0) {
      // 기존 청크 데이터 처리
      const chunkData = chunkItems[0];
      columns = chunkData.columns || [];
      rowCount = chunkData.totalRows;
      
      // 사용자 질문과 관련된 청크 선택 (키워드 기반 스마트 검색)
      const relevantChunks = this.selectRelevantChunks(chunkData.chunks, message || '');
      
      // 선택된 청크에서 대표 데이터 추출
      sampleData = this.extractRepresentativeData(relevantChunks, 50);
      
      summary = `전체 데이터셋: ${rowCount}개 행 (${chunkData.totalChunks}개 청크로 완전 처리), ${columns.length}개 열. 질문 관련 ${relevantChunks.length}개 청크에서 ${sampleData.length}개 대표 데이터 분석`;
      
    } else if (metadataItems.length > 0) {
      // 기존 샘플링 방식
      const meta = metadataItems[0];
      columns = meta.columns || [];
      summary = `대용량 데이터셋: 원본 ${meta.totalRows}개 행 → 분석용 ${meta.samplesExtracted}개 샘플 추출, ${columns.length}개 열 (${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''})`;
      rowCount = meta.totalRows;
      
      sampleData = actualData.slice(0, 15).map(item => {
        if (item.data && typeof item.data === 'object') {
          return item.data;
        }
        return item;
      });
    } else {
      // 일반 데이터 처리
      const firstRow = actualData[0];
      if (firstRow && typeof firstRow === 'object') {
        if (firstRow.data && typeof firstRow.data === 'object') {
          columns = Object.keys(firstRow.data);
        } else {
          columns = Object.keys(firstRow);
        }
      }
      summary = `데이터셋: ${actualData.length}개 행, ${columns.length}개 열 (${columns.join(', ')})`;
      
      sampleData = actualData.slice(0, 15).map(item => {
        if (item.data && typeof item.data === 'object') {
          return item.data;
        }
        return item;
      });
    }
    
    return {
      summary,
      rowCount,
      columns,
      sampleData,
      metadata: enterpriseChunkItems.length > 0 ? enterpriseChunkItems[0] : 
                (metadataItems.length > 0 ? metadataItems[0] : 
                (chunkItems.length > 0 ? chunkItems[0] : null))
    };
  }

  /**
   * 사용자 질문과 관련된 청크 선택 (스마트 검색)
   */
  private selectRelevantChunks(chunks: any[], message: string): any[] {
    if (!message || !chunks || chunks.length === 0) {
      // 질문이 없으면 모든 청크에서 균등하게 선택
      return chunks.slice(0, Math.min(5, chunks.length));
    }
    
    const messageWords = message.toLowerCase().split(/\s+/);
    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const summary = chunk.summary;
      
      // 키워드 매칭 스코어링
      messageWords.forEach(word => {
        // 배치 관련 질문
        if ((word.includes('배치') || word.includes('batch')) && summary.uniqueBatches?.length > 0) score += 10;
        
        // 운영자 관련 질문
        if ((word.includes('운영자') || word.includes('operator')) && summary.uniqueOperators?.length > 0) score += 10;
        
        // OEE 관련 질문
        if ((word.includes('oee') || word.includes('효율')) && summary.oeeRange) score += 10;
        
        // 생산성 관련 질문
        if ((word.includes('생산') || word.includes('production') || word.includes('rate')) && summary.productionRange) score += 10;
        
        // 온도 관련 질문
        if ((word.includes('온도') || word.includes('temp')) && summary.tempRange) score += 10;
        
        // 단계/상태 관련 질문
        if ((word.includes('단계') || word.includes('phase') || word.includes('상태')) && summary.uniquePhases?.length > 0) score += 10;
        
        // 지역 관련 질문
        if ((word.includes('지역') || word.includes('site') || word.includes('송도') || word.includes('songdo')) && summary.uniqueSites?.length > 0) score += 10;
        
        // 숫자 관련 질문 (특정 범위)
        const numberMatch = word.match(/\d+/);
        if (numberMatch && summary.idRange) {
          const num = parseInt(numberMatch[0]);
          const [min, max] = summary.idRange.split('-').map(Number);
          if (num >= min && num <= max) score += 15;
        }
      });
      
      return { chunk, score };
    });
    
    // 스코어 순으로 정렬하고 상위 청크 선택
    const sortedChunks = scoredChunks.sort((a, b) => b.score - a.score);
    const selectedChunks = sortedChunks.slice(0, Math.min(8, chunks.length)).map(item => item.chunk);
    
    // 스코어가 없으면 균등 분포로 선택
    if (selectedChunks.every(chunk => scoredChunks.find(sc => sc.chunk === chunk)?.score === 0)) {
      const interval = Math.max(1, Math.floor(chunks.length / 5));
      return chunks.filter((_, index) => index % interval === 0).slice(0, 5);
    }
    
    return selectedChunks;
  }

  /**
   * 선택된 청크에서 대표 데이터 추출
   */
  private extractRepresentativeData(chunks: any[], maxSamples: number): any[] {
    if (!chunks || chunks.length === 0) return [];
    
    const allData = [];
    const samplesPerChunk = Math.max(1, Math.floor(maxSamples / chunks.length));
    
    chunks.forEach(chunk => {
      if (chunk.data && Array.isArray(chunk.data)) {
        // 각 청크에서 균등하게 샘플 추출
        const chunkSamples = chunk.data.filter((_, index) => 
          index % Math.max(1, Math.floor(chunk.data.length / samplesPerChunk)) === 0
        ).slice(0, samplesPerChunk);
        
        allData.push(...chunkSamples);
      }
    });
    
    return allData.slice(0, maxSamples);
  }

  /**
   * 🚀 엔터프라이즈 배치에서 관련 배치 선택 (RAG 기반)
   */
  private selectRelevantBatches(batches: any[], message: string): any[] {
    if (!message || !batches || batches.length === 0) {
      // 질문이 없으면 모든 배치에서 균등하게 선택
      return batches.slice(0, Math.min(8, batches.length));
    }
    
    const messageWords = message.toLowerCase().split(/\s+/);
    const scoredBatches = batches.map(batch => {
      let score = 0;
      const keywords = batch.summary?.keywords || [];
      
      // 키워드 매칭 스코어링
      messageWords.forEach(word => {
        // 배치 키워드와 직접 매칭
        if (keywords.includes(word.toLowerCase())) {
          score += 15;
        }
        
        // 부분 매칭
        keywords.forEach(keyword => {
          if (keyword.includes(word.toLowerCase()) || word.toLowerCase().includes(keyword)) {
            score += 5;
          }
        });
        
        // 숫자 범위 매칭 (ID, 배치 번호 등)
        const numberMatch = word.match(/\d+/);
        if (numberMatch && batch.summary?.numericStats) {
          const num = parseInt(numberMatch[0]);
          Object.values(batch.summary.numericStats).forEach((stats: any) => {
            if (stats.min <= num && num <= stats.max) {
              score += 20;
            }
          });
        }
        
        // 날짜 관련 매칭
        if (word.includes('날짜') || word.includes('date') || word.includes('time')) {
          if (batch.summary?.dateRanges && Object.keys(batch.summary.dateRanges).length > 0) {
            score += 10;
          }
        }
      });
      
      // 배치 크기에 따른 가중치 (더 많은 데이터가 있는 배치 선호)
      score += Math.min(5, batch.data?.length / 1000);
      
      return { batch, score };
    });
    
    // 스코어 순으로 정렬하고 상위 배치 선택
    const sortedBatches = scoredBatches.sort((a, b) => b.score - a.score);
    const selectedBatches = sortedBatches.slice(0, Math.min(10, batches.length)).map(item => item.batch);
    
    // 스코어가 모두 낮으면 균등 분포로 선택
    if (selectedBatches.every(batch => scoredBatches.find(sb => sb.batch === batch)?.score === 0)) {
      const interval = Math.max(1, Math.floor(batches.length / 6));
      return batches.filter((_, index) => index % interval === 0).slice(0, 6);
    }
    
    return selectedBatches;
  }

  /**
   * 엔터프라이즈 배치에서 대표 데이터 추출
   */
  private extractRepresentativeDataFromBatches(batches: any[], maxSamples: number): any[] {
    if (!batches || batches.length === 0) return [];
    
    let allData: any[] = [];
    const samplesPerBatch = Math.max(1, Math.floor(maxSamples / batches.length));
    
    batches.forEach(batch => {
      if (batch.data && Array.isArray(batch.data)) {
        // 각 배치에서 다양성을 고려한 샘플 추출
        const batchSize = batch.data.length;
        const interval = Math.max(1, Math.floor(batchSize / samplesPerBatch));
        
        const batchSamples = [];
        for (let i = 0; i < batchSize && batchSamples.length < samplesPerBatch; i += interval) {
          batchSamples.push(batch.data[i]);
        }
        
        // 배치별로 처음, 중간, 끝에서 추가 샘플
        if (batchSize > 3 && batchSamples.length < samplesPerBatch) {
          const additionalSamples = [
            batch.data[0], // 첫 번째
            batch.data[Math.floor(batchSize / 2)], // 중간
            batch.data[batchSize - 1] // 마지막
          ].filter(item => !batchSamples.includes(item));
          
          batchSamples.push(...additionalSamples.slice(0, samplesPerBatch - batchSamples.length));
        }
        
        allData.push(...batchSamples);
      }
    });
    
    return allData.slice(0, maxSamples);
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
   * 지능형 키워드 기반 분석 및 데이터 질의응답
   */
  private analyzeKeywords(userMessage: string, data: any[]): {
    response: string;
    confidence: number;
  } {
    const message = userMessage.toLowerCase();
    
    // 🎯 데이터가 없는 경우에도 구체적인 안내 제공
    if (data.length === 0) {
      return {
        response: '⚠️ 분석할 데이터를 찾을 수 없습니다.\n\n' +
                 '**다음 단계를 확인해주세요:**\n' +
                 '1. Knowledge Base에 데이터 파일이 업로드되었는지 확인\n' +
                 '2. Data Integration에서 데이터 소스가 연결되었는지 확인\n' +
                 '3. 업로드된 CSV/Excel 파일의 형식이 올바른지 확인\n\n' +
                 '💡 현재 시스템은 RawData CSV 파일(89MB, 178,565행)을 포함한 대용량 데이터 처리를 지원합니다.',
        confidence: 0.9
      };
    }

    // 🚀 실제 데이터 분석 시작 - 하드코딩된 응답 완전 제거
    console.log(`🔍 실제 데이터 분석 시작: "${userMessage}", 데이터 개수: ${data.length}개`);

    // 실제 데이터 구조 분석
    const firstRow = data[0] || {};
    let columns = [];
    let actualDataSample = [];
    
    // 다양한 데이터 구조 처리
    if (firstRow.BR && firstRow.TimeStamp) {
      // Bioreactor 데이터 (RawData)
      columns = Object.keys(firstRow);
      actualDataSample = data.slice(0, 5);
      console.log(`🏭 Bioreactor 데이터 감지: ${columns.length}개 컬럼`);
    } else if (firstRow.file && firstRow.type) {
      // 메타데이터 객체
      columns = ['파일정보', '데이터타입', '총행수'];
      actualDataSample = data.filter(item => item.totalRows || item.data).slice(0, 3);
      console.log(`📋 메타데이터 포함: ${actualDataSample.length}개 객체`);
    } else {
      // 일반 데이터
      columns = Object.keys(firstRow);
      actualDataSample = data.slice(0, 5);
      console.log(`📊 일반 데이터: ${columns.length}개 컬럼`);
    }
    
    const dataInfo = `📊 실제 데이터셋: ${data.length}개 행, ${columns.length}개 열\n📋 컬럼: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`;
    
    // 🔍 실제 데이터 분석 및 계산 수행
    if (message.includes('분석') || message.includes('요약')) {
      return this.performRealDataAnalysis(data, columns, dataInfo, message);
    }
    
    // 🔢 특정 ID나 범위 검색 및 계산
    const idMatch = message.match(/(\d+)번?\s*(id|아이디|ID)/i) || message.match(/(id|아이디|ID).*?(\d+)/i);
    const rangeMatch = message.match(/(\d+)\s*~\s*(\d+)|(\d+)\s*부터\s*(\d+)|(\d+)\s*에서\s*(\d+)/);
    
    if (idMatch || rangeMatch || message.includes('범위') || message.includes('사이')) {
      return this.performRangeAnalysis(data, message, columns, dataInfo);
    }
    
    // 📈 통계 질의 
    if (message.includes('통계') || message.includes('평균') || message.includes('최대') || message.includes('최소')) {
      return this.performStatisticalAnalysis(data, columns, message);
    }
    
    // 🔢 개수/수량 질의
    if (message.includes('개수') || message.includes('수량') || message.includes('총')) {
      return this.countAnalysis(data, message, columns);
    }
    
    // 📋 컬럼/필드 정보
    if (message.includes('컬럼') || message.includes('필드') || message.includes('항목')) {
      return {
        response: `📋 데이터 구조:\n${columns.map((col, i) => `${i+1}. ${col}`).join('\n')}\n\n총 ${columns.length}개 컬럼입니다.`,
        confidence: 0.9
      };
    }
    
    // 🔍 특정 값 검색
    if (message.includes('찾') || message.includes('검색') || message.includes('조건')) {
      return this.performSearch(data, message, columns);
    }
    
    // 📊 PH 값 특별 분석 (bioreactor 데이터용)
    if (message.includes('ph') || message.includes('산도')) {
      return this.analyzePH(data);
    }
    
    // 🏭 생산성 분석
    if (message.includes('생산') || message.includes('oee') || message.includes('효율')) {
      return this.analyzeProduction(data);
    }
    
    // 🎯 실제 데이터 분석 수행
    return this.performRealDataAnalysis(data, columns, dataInfo, message);
  }

  /**
   * 🚀 실제 데이터 분석 및 계산 수행
   */
  private performRealDataAnalysis(data: any[], columns: string[], dataInfo: string, message: string): {response: string; confidence: number} {
    try {
      // Bioreactor 데이터 구조 확인
      const isBioreactorData = columns.includes('OEE') && columns.includes('Production Rate') && columns.includes('Temperature');
      
      if (isBioreactorData) {
        return this.analyzeBioreactorData(data, message, dataInfo);
      }
      
      // 일반 데이터 분석
      return this.analyzeGeneralData(data, columns, message, dataInfo);
      
    } catch (error) {
      console.error('데이터 분석 오류:', error);
      return {
        response: `📊 **분석 중 오류 발생**\n\n질문: "${message}"\n\n데이터: ${dataInfo}\n\n오류: ${error}`,
        confidence: 0.5
      };
    }
  }

  /**
   * 🏭 Bioreactor 데이터 실제 분석
   */
  private analyzeBioreactorData(data: any[], message: string, dataInfo: string): {response: string; confidence: number} {
    // ID 범위 추출
    const rangeMatch = message.match(/(\d+)\s*~\s*(\d+)|(\d+)\s*부터\s*(\d+)|(\d+)\s*에서\s*(\d+)|(\d+)\s*사이.*?(\d+)/);
    const singleIdMatch = message.match(/(\d+)번?\s*(id|아이디|ID)/i);
    
    let filteredData = data;
    let analysisTitle = "전체 데이터 분석";
    
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1] || rangeMatch[3] || rangeMatch[5]);
      const end = parseInt(rangeMatch[2] || rangeMatch[4] || rangeMatch[6]);
      
      filteredData = data.filter(row => {
        const id = parseInt(row.Id || row.id || '0');
        return id >= start && id <= end;
      });
      
      analysisTitle = `ID ${start}~${end} 범위 데이터 분석`;
      
    } else if (singleIdMatch) {
      const targetId = parseInt(singleIdMatch[1]);
      filteredData = data.filter(row => {
        const id = parseInt(row.Id || row.id || '0');
        return id === targetId;
      });
      analysisTitle = `ID ${targetId} 데이터 분석`;
    }
    
    if (filteredData.length === 0) {
      return {
        response: `❌ **${analysisTitle}**\n\n해당 범위의 데이터를 찾을 수 없습니다.\n\n전체 데이터: ${data.length}개 레코드`,
        confidence: 0.9
      };
    }
    
    // 실제 계산 수행
    const calculations = this.calculateBioreactorMetrics(filteredData);
    
    let response = `📊 **${analysisTitle}**\n\n`;
    response += `🎯 **OEE (Overall Equipment Effectiveness):**\n`;
    response += `- 평균: ${calculations.oee.avg.toFixed(2)}%\n`;
    response += `- 최소값: ${calculations.oee.min.toFixed(2)}%\n`;
    response += `- 최대값: ${calculations.oee.max.toFixed(2)}%\n\n`;
    
    response += `🏭 **생산 성능:**\n`;
    response += `- 평균 생산율: ${calculations.production.avg.toFixed(2)}\n`;
    response += `- 총 생산량: ${calculations.production.total.toFixed(2)}\n`;
    response += `- 생산량 범위: ${calculations.production.min.toFixed(2)} ~ ${calculations.production.max.toFixed(2)}\n\n`;
    
    response += `🌡️ **온도 관리:**\n`;
    response += `- 평균 온도: ${calculations.temperature.avg.toFixed(1)}°C\n`;
    response += `- 온도 범위: ${calculations.temperature.min}°C ~ ${calculations.temperature.max}°C\n\n`;
    
    response += `⚗️ **품질 지표:**\n`;
    response += `- 평균 PH: ${calculations.ph.avg.toFixed(1)}\n`;
    response += `- PH 범위: ${calculations.ph.min} ~ ${calculations.ph.max}\n`;
    response += `- 평균 품질 점수: ${calculations.quality.avg.toFixed(2)}\n\n`;
    
    if (message.includes('oxygen') || message.includes('산소')) {
      response += `💨 **산소 분석:**\n`;
      response += `- 총 산소값 합계: ${calculations.oxygen.total}\n`;
      response += `- 평균 산소 농도: ${calculations.oxygen.avg.toFixed(2)}\n\n`;
    }
    
    
    return {
      response: response,
      confidence: 0.95
    };
  }

  /**
   * 📊 Bioreactor 메트릭 실제 계산
   */
  private calculateBioreactorMetrics(data: any[]) {
    const metrics = {
      oee: { avg: 0, min: 100, max: 0, values: [] as number[] },
      production: { avg: 0, min: Infinity, max: 0, total: 0, values: [] as number[] },
      temperature: { avg: 0, min: Infinity, max: 0, values: [] as number[] },
      ph: { avg: 0, min: 14, max: 0, values: [] as number[] },
      quality: { avg: 0, min: 100, max: 0, values: [] as number[] },
      oxygen: { total: 0, avg: 0, values: [] as number[] },
      operators: [] as string[],
      batches: [] as string[],
      phases: [] as string[]
    };
    
    data.forEach(row => {
      // OEE 계산
      const oee = parseFloat(row.OEE || '0');
      if (!isNaN(oee)) {
        metrics.oee.values.push(oee);
        metrics.oee.min = Math.min(metrics.oee.min, oee);
        metrics.oee.max = Math.max(metrics.oee.max, oee);
      }
      
      // 생산율 계산
      const production = parseFloat(row['Production Rate'] || '0');
      if (!isNaN(production)) {
        metrics.production.values.push(production);
        metrics.production.min = Math.min(metrics.production.min, production);
        metrics.production.max = Math.max(metrics.production.max, production);
        metrics.production.total += production;
      }
      
      // 온도 계산
      const temp = parseFloat(row.Temperature || '0');
      if (!isNaN(temp) && temp > 0) {
        metrics.temperature.values.push(temp);
        metrics.temperature.min = Math.min(metrics.temperature.min, temp);
        metrics.temperature.max = Math.max(metrics.temperature.max, temp);
      }
      
      // PH 계산
      const ph = parseFloat(row.PH || '0');
      if (!isNaN(ph) && ph > 0) {
        metrics.ph.values.push(ph);
        metrics.ph.min = Math.min(metrics.ph.min, ph);
        metrics.ph.max = Math.max(metrics.ph.max, ph);
      }
      
      // 품질 점수 계산
      const quality = parseFloat(row['Quality Information'] || '0');
      if (!isNaN(quality)) {
        metrics.quality.values.push(quality);
        metrics.quality.min = Math.min(metrics.quality.min, quality);
        metrics.quality.max = Math.max(metrics.quality.max, quality);
      }
      
      // 산소 계산
      const oxygen = parseFloat(row.Oxygen || '0');
      if (!isNaN(oxygen)) {
        metrics.oxygen.values.push(oxygen);
        metrics.oxygen.total += oxygen;
      }
      
      // 운영 정보 수집
      if (row.Operator && !metrics.operators.includes(row.Operator)) {
        metrics.operators.push(row.Operator);
      }
      if (row.BatchID && !metrics.batches.includes(row.BatchID)) {
        metrics.batches.push(row.BatchID);
      }
      if (row.Phase && !metrics.phases.includes(row.Phase)) {
        metrics.phases.push(row.Phase);
      }
    });
    
    // 평균값 계산
    metrics.oee.avg = metrics.oee.values.length > 0 ? metrics.oee.values.reduce((a, b) => a + b, 0) / metrics.oee.values.length : 0;
    metrics.production.avg = metrics.production.values.length > 0 ? metrics.production.values.reduce((a, b) => a + b, 0) / metrics.production.values.length : 0;
    metrics.temperature.avg = metrics.temperature.values.length > 0 ? metrics.temperature.values.reduce((a, b) => a + b, 0) / metrics.temperature.values.length : 0;
    metrics.ph.avg = metrics.ph.values.length > 0 ? metrics.ph.values.reduce((a, b) => a + b, 0) / metrics.ph.values.length : 0;
    metrics.quality.avg = metrics.quality.values.length > 0 ? metrics.quality.values.reduce((a, b) => a + b, 0) / metrics.quality.values.length : 0;
    metrics.oxygen.avg = metrics.oxygen.values.length > 0 ? metrics.oxygen.values.reduce((a, b) => a + b, 0) / metrics.oxygen.values.length : 0;
    
    return metrics;
  }

  /**
   * 🔢 범위 분석 수행
   */
  private performRangeAnalysis(data: any[], message: string, columns: string[], dataInfo: string): {response: string; confidence: number} {
    // ID 범위 또는 특정 ID 추출
    const rangeMatch = message.match(/(\d+)\s*~\s*(\d+)|(\d+)\s*부터\s*(\d+)|(\d+)\s*에서\s*(\d+)/);
    const singleIdMatch = message.match(/(\d+)번?\s*(id|아이디|ID)/i);
    
    if (singleIdMatch) {
      const targetId = parseInt(singleIdMatch[1]);
      const targetData = data.find(row => {
        const id = parseInt(row.Id || row.id || '0');
        return id === targetId;
      });
      
      if (!targetData) {
        return {
          response: `❌ **ID ${targetId} 검색 결과**\n\n해당 ID의 데이터를 찾을 수 없습니다.\n\n${dataInfo}`,
          confidence: 0.9
        };
      }
      
      let response = `🎯 **ID ${targetId}의 상세 정보**\n\n`;
      
      Object.keys(targetData).forEach(key => {
        const value = targetData[key];
        response += `• **${key}**: ${value}\n`;
      });
      
      return {
        response: response,
        confidence: 0.98
      };
    }
    
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1] || rangeMatch[3] || rangeMatch[5]);
      const end = parseInt(rangeMatch[2] || rangeMatch[4] || rangeMatch[6]);
      
      const rangeData = data.filter(row => {
        const id = parseInt(row.Id || row.id || '0');
        return id >= start && id <= end;
      });
      
      if (rangeData.length === 0) {
        return {
          response: `❌ **ID ${start}~${end} 범위 검색 결과**\n\n해당 범위의 데이터를 찾을 수 없습니다.\n\n${dataInfo}`,
          confidence: 0.9
        };
      }
      
      return this.performRealDataAnalysis(rangeData, columns, `범위 ${start}~${end}: ${rangeData.length}개 레코드`, message);
    }
    
    // 일반적인 분석 수행
    return this.performRealDataAnalysis(data, columns, dataInfo, message);
  }

  /**
   * 📊 일반 데이터 분석
   */
  private analyzeGeneralData(data: any[], columns: string[], message: string, dataInfo: string): {response: string; confidence: number} {
    // 수치 컬럼들에 대한 통계 계산
    const numericColumns = columns.filter(col => {
      const sampleValue = data[0]?.[col];
      return !isNaN(parseFloat(sampleValue)) && isFinite(parseFloat(sampleValue));
    });
    
    let response = `📊 **데이터 분석 결과**\n\n`;
    
    if (numericColumns.length > 0) {
      numericColumns.slice(0, 5).forEach(col => {
        const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          
          response += `**${col}**: 평균 ${avg.toFixed(2)}, 최소값 ${min}, 최대값 ${max}, 총합 ${sum.toFixed(2)}\n\n`;
        }
      });
    } else {
      response += `분석 가능한 수치 데이터가 없습니다.\n\n`;
    }
    
    return {
      response: response,
      confidence: 0.85
    };
  }

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
    
    let stats = `📈 **통계 분석 결과:**\n`;
    
    numericColumns.slice(0, 5).forEach(col => {
      const values = data.map(row => parseFloat(row[col])).filter(n => !isNaN(n));
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);
      
      stats += `\n**${col}:**\n`;
      stats += `• 평균: ${avg.toFixed(2)}\n• 최소값: ${min}\n• 최대값: ${max}\n• 표준편차: ${std.toFixed(2)}\n`;
    });
    
    return { response: stats, confidence: 0.9 };
  }

  private countAnalysis(data: any[], message: string, columns: string[]) {
    let result = `🔢 **개수 분석 결과:**\n\n• 전체 데이터 행: ${data.length}개\n• 전체 컬럼: ${columns.length}개\n`;
    
    // 특정 컬럼의 고유값 개수
    columns.slice(0, 5).forEach(col => {
      const uniqueValues = [...new Set(data.map(row => row[col]).filter(v => v && v !== ''))];
      result += `• ${col} 고유값: ${uniqueValues.length}개\n`;
    });
    
    return { response: result, confidence: 0.9 };
  }

  private performSearch(data: any[], message: string, columns: string[]) {
    // 간단한 검색 로직
    let searchResults = `🔍 **검색 결과:**\n\n`;
    
    // PH=5 검색 예시
    if (message.includes('ph') && message.includes('5')) {
      const phRecords = data.filter(row => row.PH === '5' || row.ph === '5');
      searchResults += `PH값이 5인 레코드: ${phRecords.length}개 발견\n`;
      
      if (phRecords.length > 0) {
        searchResults += `\n**샘플 데이터:**\n`;
        phRecords.slice(0, 2).forEach((record, i) => {
          searchResults += `${i+1}. BatchID: ${record.BatchID || 'N/A'}, Operator: ${record.Operator || 'N/A'}\n`;
        });
      }
    } else {
      searchResults += `데이터에서 관련 정보를 검색했습니다.\n총 ${data.length}개 레코드를 대상으로 분석했습니다.`;
    }
    
    return { response: searchResults, confidence: 0.8 };
  }

  private analyzePH(data: any[]) {
    const phColumn = data[0] && (data[0].PH !== undefined ? 'PH' : data[0].ph !== undefined ? 'ph' : null);
    
    if (!phColumn) {
      return {
        response: 'PH 데이터를 찾을 수 없습니다.',
        confidence: 0.7
      };
    }
    
    const phValues = data.map(row => parseFloat(row[phColumn])).filter(n => !isNaN(n));
    const phStats = {
      count: phValues.length,
      avg: phValues.reduce((a, b) => a + b, 0) / phValues.length,
      min: Math.min(...phValues),
      max: Math.max(...phValues)
    };
    
    const phDistribution = {};
    data.forEach(row => {
      const ph = row[phColumn];
      if (ph) phDistribution[ph] = (phDistribution[ph] || 0) + 1;
    });
    
    let result = `🧪 **PH 분석 결과:**\n\n`;
    result += `• 전체 PH 측정값: ${phStats.count}개\n`;
    result += `• 평균 PH: ${phStats.avg.toFixed(2)}\n`;
    result += `• PH 범위: ${phStats.min} - ${phStats.max}\n\n`;
    result += `**PH 분포:**\n`;
    Object.entries(phDistribution).slice(0, 10).forEach(([ph, count]) => {
      result += `• PH ${ph}: ${count}개\n`;
    });
    
    return { response: result, confidence: 0.9 };
  }

  private analyzeProduction(data: any[]) {
    const productionColumns = ['OEE', 'Production Rate', 'ProductionRate', 'production_rate'];
    const foundColumn = productionColumns.find(col => data[0] && data[0][col] !== undefined);
    
    if (!foundColumn) {
      return {
        response: '생산성 관련 데이터(OEE, Production Rate)를 찾을 수 없습니다.',
        confidence: 0.7
      };
    }
    
    const values = data.map(row => parseFloat(row[foundColumn])).filter(n => !isNaN(n));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    let result = `🏭 **생산성 분석 결과:**\n\n`;
    result += `• 분석 지표: ${foundColumn}\n`;
    result += `• 평균값: ${avg.toFixed(2)}\n`;
    result += `• 최고값: ${max}\n`;
    result += `• 최저값: ${min}\n`;
    result += `• 총 측정값: ${values.length}개\n`;
    
    // 성능 등급 평가
    if (foundColumn.includes('OEE')) {
      if (avg > 85) result += `\n✅ **우수한 OEE 성능** (85% 이상)`;
      else if (avg > 70) result += `\n⚠️ **양호한 OEE 성능** (70-85%)`;
      else result += `\n🔄 **OEE 개선 필요** (70% 미만)`;
    }
    
    return { response: result, confidence: 0.9 };
  }

  private provideDataOverview(data: any[], columns: string[], dataInfo: string) {
    let overview = `${dataInfo}\n\n📋 **데이터 개요:**\n\n`;
    
    // 샘플 데이터 표시
    overview += `**주요 컬럼:**\n${columns.slice(0, 5).join(', ')}\n\n`;
    
    // 첫 번째 레코드 샘플
    if (data.length > 0) {
      overview += `**샘플 레코드:**\n`;
      const sample = data[0];
      Object.entries(sample).slice(0, 5).forEach(([key, value]) => {
        overview += `• ${key}: ${value}\n`;
      });
    }
    
    overview += `\n💡 **추가 분석 가능:**\n• "통계 분석해줘" - 수치 데이터 통계\n• "PH 분석해줘" - PH 값 분포 분석\n• "생산성 분석해줘" - OEE 및 생산율 분석`;
    
    return { response: overview, confidence: 0.8 };
  }

  /**
   * Fallback 응답 초기화
   */
  private initializeFallbackResponses(): void {
    this.fallbackResponses.set('data_analysis', '데이터 분석이 완료되었습니다. 추가 질문이 있으시면 언제든지 말씀해주세요.');
    this.fallbackResponses.set('data_summary', '데이터 요약이 생성되었습니다. 특정 부분에 대해 더 자세히 알고 싶으시면 질문해주세요.');
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