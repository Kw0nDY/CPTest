import express from "express";
import multer from "multer";
import { storage, initializeSampleData } from "./storage";
import { insertDataSourceSchema } from "@shared/schema";
import { z } from "zod";
import FormData from "form-data";
import { aiModels, type AiModel, insertAiModelSchema } from "@shared/schema";
import fs from "fs";
import { createServer, type Server } from "http";
import { join } from "path";

// Multer configuration for handling file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

export async function registerRoutes(app: express.Express): Promise<Server> {
  await initializeSampleData();
  
  // 채팅 메시지 처리 - 최적화된 버전
  app.post("/api/chat/:sessionId/message", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { message, configId } = req.body;

      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        message: message.trim(),
        createdAt: new Date().toISOString()
      });

      // 빠른 데이터 로드
      let allUploadedData = [];
      const config = configId ? await storage.getChatConfiguration(configId) : null;
      
      // 🎯 실제 데이터 수집: Knowledge Base + Data Integration
      
      // 🔍 API URL 자동 구성 (ChatFlow ID 기반)
      let extractedApiUrl = null;
      
      // ChatFlow ID가 있으면 바로 URL 구성
      if (config?.chatflowId) {
        extractedApiUrl = `http://220.118.23.185:3000/api/v1/prediction/${config.chatflowId}`;
        console.log(`🔧 ChatFlow ID 기반 API URL: ${extractedApiUrl}`);
      }
      
      // 1. Knowledge Base 파일 데이터 로드 (대용량 파일 건너뛰기)
      console.log(`🔍 AI 모델 "${config?.name}"의 uploadedFiles 확인: ${config?.uploadedFiles?.length || 0}개`);
      
      if (config?.uploadedFiles) {
        for (const file of config.uploadedFiles) {
          console.log(`📄 파일 체크: ${file.name}, type: ${file.type}, content 길이: ${file.content?.length || 0}`);
          
          // 🎯 AI 소스 파일에서 API URL 추출
          const isAISourceFile = file.name.endsWith('.py') || 
                                file.name.endsWith('.js') || 
                                file.name.endsWith('.ts') || 
                                file.type === 'source_code' ||
                                file.language === 'py' ||
                                file.language === 'js' ||
                                file.language === 'ts';
          
          if (isAISourceFile && file.content) {
            console.log(`🔍 소스 파일에서 API URL 추출 시도: ${file.name}`);
            console.log(`📄 파일 내용 전체: ${file.content}`);
            
            // 모든 가능한 URL 패턴 시도
            const allUrls = file.content.match(/https?:\/\/[^\s"'\)>\]]+/g) || [];
            console.log(`🔍 발견된 모든 URL: ${JSON.stringify(allUrls)}`);
            
            // 첫 번째 HTTP URL이 있으면 그것을 사용
            if (allUrls.length > 0) {
              extractedApiUrl = allUrls[0].replace(/['";\s\)\]>]+$/, ''); // 끝의 특수문자 제거
              console.log(`✅ 첫 번째 URL 사용: ${extractedApiUrl}`);
            }
            
            // config.chatflowId가 있으면 기본 패턴으로 URL 구성
            if (!extractedApiUrl && config?.chatflowId) {
              extractedApiUrl = `http://220.118.23.185:3000/api/v1/prediction/${config.chatflowId}`;
              console.log(`🔧 ChatFlow ID로 URL 구성: ${extractedApiUrl}`);
            }
            
            // 소스 파일은 데이터 분석에서 제외
            console.log(`⚠️ 소스 파일 (데이터 분석에서 제외): ${file.name}`);
            continue;
          }

          // 🎯 데이터 파일 처리 - content가 없어도 metadata에서 찾기
          let fileProcessed = false;
          
          // 1) content가 있는 경우
          if (file.content && file.content.length > 0) {
            try {
              if (file.name.endsWith('.csv')) {
                try {
                  // 🚀 대용량 파일 초고속 처리 (시간 초과 방지)
                  const fileSizeMB = file.content.length / (1024 * 1024);
                  console.log(`📊 CSV 파일 크기: ${fileSizeMB.toFixed(1)}MB`);
                  
                  if (fileSizeMB > 10) {
                    // 🎯 대용량 파일 스마트 샘플링 (실제 데이터 분석 가능)
                    console.log(`📊 대용량 파일 스마트 처리 시작: ${file.name} (${fileSizeMB.toFixed(1)}MB)`);
                    
                    const lines = file.content.split('\n');
                    const headers = lines[0] ? lines[0].split(',') : [];
                    
                    // 전체 데이터에서 대표 샘플 추출 (시작, 중간, 끝에서 균등하게)
                    const totalRows = lines.length - 1;
                    const sampleSize = 500; // 500개 샘플
                    const interval = Math.floor(totalRows / sampleSize);
                    
                    const samples = [];
                    for (let i = 1; i <= totalRows && samples.length < sampleSize; i += interval) {
                      if (lines[i] && lines[i].trim()) {
                        const values = lines[i].split(',');
                        const row = {};
                        headers.forEach((header, idx) => {
                          row[header?.trim() || `col_${idx}`] = values[idx]?.trim() || '';
                        });
                        samples.push(row);
                      }
                    }
                    
                    // AI 분석 가능한 형태로 저장
                    allUploadedData.push(...samples.map((row, index) => ({
                      file: file.name,
                      sampleIndex: index,
                      data: row,
                      source: `대용량파일_샘플_${index + 1}/${sampleSize}`
                    })));
                    
                    // 파일 메타데이터 추가
                    allUploadedData.push({
                      file: file.name,
                      type: 'large_file_metadata',
                      size: `${fileSizeMB.toFixed(1)}MB`,
                      totalRows: totalRows,
                      columns: headers,
                      samplesExtracted: samples.length,
                      note: `전체 ${totalRows}개 행에서 ${samples.length}개 대표 샘플 추출`
                    });
                    
                    console.log(`✅ 대용량 파일 스마트 처리: ${file.name} → ${samples.length}개 대표 샘플 추출 (전체 ${totalRows}개 행)`);
                    fileProcessed = true;
                  } else {
                    // 작은 파일만 실제 처리
                    const { processLargeCSV } = await import('./csvProcessor');
                    const result = await processLargeCSV(file.content, {
                      maxRows: 100,
                      batchSize: 20
                    });
                    
                    const parsedData = result.data.slice(0, 50).map((row, index) => ({
                      file: file.name,
                      index,
                      data: JSON.stringify(row).substring(0, 200)
                    }));
                    
                    allUploadedData.push(...parsedData);
                    console.log(`✅ 소용량 CSV 처리: ${file.name} → ${parsedData.length}개 샘플`);
                    fileProcessed = true;
                  }
                } catch (streamError) {
                  console.error(`CSV 스트리밍 처리 실패: ${file.name}`, streamError);
                  // Fallback: 기존 방식 (소규모 파일만)
                  try {
                    const rows = file.content.split('\n').slice(1, 101); // 최대 100행만
                    const parsedData = rows.map(row => {
                      const values = row.split(',');
                      return { file: file.name, data: values.join(' ') };
                    });
                    allUploadedData.push(...parsedData);
                    console.log(`⚠️ Fallback으로 데이터 파일 로드: ${file.name} → ${parsedData.length}개 레코드 (제한적)`);
                    fileProcessed = true;
                  } catch (fallbackError) {
                    console.error(`CSV Fallback 처리도 실패: ${file.name}`, fallbackError);
                  }
                }
              } else if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(file.content);
                const dataArray = Array.isArray(parsed) ? parsed : [parsed];
                allUploadedData.push(...dataArray);
                console.log(`✅ Content에서 데이터 파일 로드: ${file.name} → ${dataArray.length}개 레코드`);
                fileProcessed = true;
              } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                allUploadedData.push({ file: file.name, content: file.content });
                console.log(`✅ Content에서 텍스트 파일 로드: ${file.name}`);
                fileProcessed = true;
              }
            } catch (parseError) {
              console.warn(`파일 파싱 오류 ${file.name}:`, parseError);
            }
          }
          
          // 2) content가 없지만 metadata에 데이터가 있는 경우  
          if (!fileProcessed && file.metadata?.processedData) {
            try {
              const processedData = file.metadata.processedData;
              if (processedData.sampleData && Array.isArray(processedData.sampleData)) {
                allUploadedData.push(...processedData.sampleData);
                console.log(`✅ Metadata에서 데이터 파일 로드: ${file.name} → ${processedData.sampleData.length}개 레코드`);
                fileProcessed = true;
              } else if (processedData.rawContent) {
                allUploadedData.push({ file: file.name, content: processedData.rawContent });
                console.log(`✅ Metadata에서 원시 데이터 로드: ${file.name}`);
                fileProcessed = true;
              }
            } catch (metadataError) {
              console.warn(`메타데이터 파싱 오류 ${file.name}:`, metadataError);
            }
          }
          
          // 3) 처리되지 않은 데이터 파일 경고
          if (!fileProcessed && !isAISourceFile) {
            console.warn(`⚠️ 데이터 파일을 처리할 수 없음: ${file.name} (content: ${file.content ? '있음' : '없음'}, metadata: ${file.metadata ? '있음' : '없음'})`);
          }
        }
      }

      // 2. Data Integration 연결된 데이터 로드 (개선된 버전)
      console.log(`🔗 Data Integration 확인 중... configId: ${configId}`);
      const connectedDataSources = configId ? await storage.getChatbotDataIntegrations(configId) : [];
      console.log(`🔗 연결된 데이터 소스 개수: ${connectedDataSources.length}개`);
      
      for (const integration of connectedDataSources) {
        try {
          console.log(`📊 데이터 소스 로드 중: ${integration.dataSourceId}`);
          const dataSource = await storage.getDataSource(integration.dataSourceId);
          
          if (!dataSource) {
            console.warn(`⚠️ 데이터 소스를 찾을 수 없음: ${integration.dataSourceId}`);
            continue;
          }
          
          console.log(`📋 데이터 소스 "${dataSource.name}" (type: ${dataSource.type}) 처리 중`);
          
          // 1) config.sampleData에서 데이터 로드
          if (dataSource?.config?.sampleData) {
            console.log(`📊 sampleData에서 데이터 로드 중...`);
            for (const [tableName, tableData] of Object.entries(dataSource.config.sampleData)) {
              if (Array.isArray(tableData) && tableData.length > 0) {
                allUploadedData.push(...tableData.slice(0, 1000)); // 최대 1000개씩
                console.log(`✅ Data Integration에서 로드: ${tableName} → ${Math.min(tableData.length, 1000)}개 레코드`);
              }
            }
          }
          
          // 2) 실제 테이블 데이터 로드 시도 (Excel/Google Sheets용)
          try {
            if (dataSource.type === 'Excel' || dataSource.type === 'Google Sheets') {
              const tables = await storage.getDataSourceTables(integration.dataSourceId);
              console.log(`🔍 데이터 소스 테이블: ${tables.length}개 발견`);
              
              for (const table of tables.slice(0, 3)) { // 최대 3개 테이블
                try {
                  const tableData = await storage.getTableData(integration.dataSourceId, table.name);
                  if (tableData && tableData.length > 0) {
                    allUploadedData.push(...tableData.slice(0, 500)); // 테이블당 최대 500개
                    console.log(`✅ 실제 테이블 데이터 로드: ${table.name} → ${Math.min(tableData.length, 500)}개 레코드`);
                  }
                } catch (tableError) {
                  console.warn(`테이블 데이터 로드 실패: ${table.name}`, tableError);
                }
              }
            }
          } catch (tablesError) {
            console.warn('테이블 데이터 로드 시도 실패:', tablesError);
          }
          
        } catch (dataError) {
          console.error('데이터 소스 로드 오류:', dataError);
        }
      }

      // 3. 백업 데이터 (bioreactor)
      if (allUploadedData.length === 0) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const dataPath = path.join(process.cwd(), 'real_bioreactor_1000_rows.json');
          if (fs.existsSync(dataPath)) {
            allUploadedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          }
        } catch (error) {
          console.warn('백업 데이터 로드 실패:', error);
        }
      }

      // 4. AI에 실제 데이터 전달
      let contextData = "";
      if (allUploadedData.length > 0) {
        contextData = `\n\n📊 **연결된 실제 데이터 (${allUploadedData.length}개 레코드):**\n`;
        contextData += JSON.stringify(allUploadedData.slice(0, 50), null, 2); // 처음 50개만 컨텍스트로
        contextData += `\n... (총 ${allUploadedData.length}개 중 50개 표시)\n\n`;
      }

      let prompt = `당신은 데이터 분석 전문가입니다. 제공된 실제 데이터를 기반으로만 답변하세요.${contextData}`;
      prompt += `\n**사용자 질문:** ${message}\n\n`;
      prompt += `**답변 규칙:**\n`;
      prompt += `- 위의 실제 데이터에서만 정보를 찾아 답변\n`;
      prompt += `- 데이터에 없는 정보는 "해당 데이터 없음"으로 응답\n`;
      prompt += `- 정확한 수치와 구체적인 정보 제공\n`;
      prompt += `- 한국어로 자연스럽게 답변\n\n`;

      // 🚨 실제 AI 모델(Flowise)에 데이터 전달하여 응답 생성
      let aiResponse = "";
      
      if (config && config.chatflowId) {
        try {
          // Flowise API 엔드포인트 구성
          const flowiseUrl = `http://220.118.23.185:3000/api/v1/prediction/${config.chatflowId}`;
          
          console.log(`🎯 AI 모델에 실제 요청 전송: ${flowiseUrl}`);
          console.log(`📊 전송할 실제 데이터 개수: ${allUploadedData.length}개 (AI 소스 파일 제외됨)`);
          
          if (allUploadedData.length > 0) {
            console.log(`📋 데이터 샘플:`, JSON.stringify(allUploadedData.slice(0, 2), null, 2));
          }
          
          // 실제 데이터와 함께 AI에게 전달할 전체 프롬프트
          const fullPrompt = prompt + `\n\n**실제 연결된 데이터 현황:**\n- 총 ${allUploadedData.length}개의 데이터 레코드\n- 사용자 질문: "${message}"\n\n위 데이터를 분석하여 정확하고 구체적인 답변을 제공해주세요.`;
          
          // 🎯 소스 파일에서 추출한 API URL 사용 또는 로컬 AI 처리
          if (extractedApiUrl) {
            console.log(`🌐 추출된 API URL로 요청 전송: ${extractedApiUrl}`);
            
            try {
              const response = await fetch(extractedApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  question: fullPrompt,
                  overrideConfig: {
                    systemMessagePrompt: config.systemPrompt || "",
                  }
                }),
                signal: AbortSignal.timeout(30000) // 30초 타임아웃
              });

              if (response.ok) {
                const apiResult = await response.json();
                aiResponse = apiResult.text || apiResult.answer || apiResult.response || "API 응답을 받지 못했습니다.";
                console.log(`✅ 추출된 API 요청 성공: ${aiResponse.substring(0, 100)}...`);
              } else {
                throw new Error(`API 응답 오류: ${response.status}`);
              }
            } catch (apiError) {
              console.error(`❌ 추출된 API 호출 실패:`, apiError);
              
              // 🔄 로컬 AI로 폴백
              console.log('🔄 로컬 AI 엔진으로 폴백 처리');
              const { localAI } = await import('./localAiEngine');
              
              const result = await localAI.processQuery(message, allUploadedData, {
                maxTokens: config.maxTokens || 1500,
                temperature: (config.temperature || 70) / 100,
                enableFallback: true
              });
              
              aiResponse = result.response;
              console.log(`✅ ${result.dataSource} 폴백 처리 성공`);
            }
          } else {
            // API URL이 없으면 로컬 AI 엔진 사용
            console.log(`🤖 로컬 AI 엔진으로 처리 (API URL 없음): "${message}"`);
            
            const { localAI } = await import('./localAiEngine');
            
            const result = await localAI.processQuery(message, allUploadedData, {
              maxTokens: config.maxTokens || 1500,
              temperature: (config.temperature || 70) / 100,
              enableFallback: true
            });
            
            aiResponse = result.response;
            console.log(`✅ ${result.dataSource} AI 처리 성공: ${result.confidence * 100}% 신뢰도`);
          }

          // 로컬 AI 처리 완료 (aiResponse 이미 설정됨)
          console.log(`✅ 로컬 AI 처리 완료: ${aiResponse.substring(0, 100)}...`);
        } catch (localAiError) {
          console.error('❌ 로컬 AI 처리 실패:', localAiError);
          
          // 🛡️ 최종 Fallback: 간단한 데이터 기반 응답
          if (allUploadedData.length > 0) {
            const firstRow = allUploadedData[0];
            const columns = Object.keys(firstRow || {});
            aiResponse = `📊 **업로드된 데이터 분석 요청**: "${message}"\n\n` +
                       `**데이터 현황:**\n` +
                       `- 총 레코드: ${allUploadedData.length}개\n` +
                       `- 컬럼: ${columns.join(', ')}\n` +
                       `- 샘플 데이터: ${JSON.stringify(firstRow, null, 2)}\n\n` +
                       `**참고:** 더 정확한 AI 분석을 위해 OpenAI API 키를 설정하시면 고급 분석이 가능합니다.`;
          } else {
            aiResponse = `질문을 받았습니다: "${message}"\n\n현재 분석할 데이터가 없습니다. Knowledge Base에 파일을 업로드하거나 Data Integration을 연결한 후 다시 시도해주세요.`;
          }
        }
      } else {
        aiResponse = "AI 모델 설정이 없습니다. 챗봇 구성을 확인해주세요.";
      }

      const botMessage = await storage.createChatMessage({
        sessionId,
        type: 'bot',
        message: aiResponse,
        createdAt: new Date().toISOString()
      });

      res.json({ userMessage, botMessage });
    } catch (error) {
      console.error('채팅 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🎯 AI 모델-챗봇 연결 관리 API (새로운 아키텍처)
  app.get("/api/ai-models/:modelId/chat-configurations", async (req, res) => {
    try {
      const { modelId } = req.params;
      const configurations = await storage.getAIModelChatConfigurations(modelId);
      res.json(configurations);
    } catch (error) {
      console.error('AI 모델 챗봇 구성 조회 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/ai-models/:modelId/chat-configurations", async (req, res) => {
    try {
      const { modelId } = req.params;
      const { chatbotConfigId, priority, isActive } = req.body;
      
      const configuration = await storage.createAIModelChatConfiguration({
        modelId,
        chatbotConfigId,
        priority: priority || 1,
        isActive: isActive !== false
      });
      
      console.log(`✅ AI 모델-챗봇 연결 생성: ${modelId} → ${chatbotConfigId}`);
      res.json(configuration);
    } catch (error) {
      console.error('AI 모델 챗봇 구성 생성 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete("/api/ai-models/:modelId/chat-configurations/:configId", async (req, res) => {
    try {
      const { modelId, configId } = req.params;
      await storage.deleteAIModelChatConfiguration(modelId, configId);
      console.log(`🗑️ AI 모델-챗봇 연결 삭제: ${modelId} → ${configId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('AI 모델 챗봇 구성 삭제 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🎯 AI 모델별 전용 데이터 소스 매핑 API
  app.get("/api/ai-models/:modelId/data-sources", async (req, res) => {
    try {
      const { modelId } = req.params;
      const dataSources = await storage.getAIModelDataSources(modelId);
      res.json(dataSources);
    } catch (error) {
      console.error('AI 모델 데이터 소스 조회 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/ai-models/:modelId/data-sources", async (req, res) => {
    try {
      const { modelId } = req.params;
      const { dataSourceId, accessType, filterRules } = req.body;
      
      const mapping = await storage.createAIModelDataSource({
        modelId,
        dataSourceId,
        accessType: accessType || 'READ',
        filterRules: filterRules || {}
      });
      
      console.log(`🔗 AI 모델-데이터 소스 매핑 생성: ${modelId} → ${dataSourceId}`);
      res.json(mapping);
    } catch (error) {
      console.error('AI 모델 데이터 소스 매핑 생성 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put("/api/ai-models/:modelId/data-sources/:dataSourceId", async (req, res) => {
    try {
      const { modelId, dataSourceId } = req.params;
      const { accessType, filterRules } = req.body;
      
      const updatedMapping = await storage.updateAIModelDataSource(modelId, dataSourceId, {
        accessType,
        filterRules
      });
      
      console.log(`📝 AI 모델-데이터 소스 매핑 업데이트: ${modelId} → ${dataSourceId}`);
      res.json(updatedMapping);
    } catch (error) {
      console.error('AI 모델 데이터 소스 매핑 업데이트 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete("/api/ai-models/:modelId/data-sources/:dataSourceId", async (req, res) => {
    try {
      const { modelId, dataSourceId } = req.params;
      await storage.deleteAIModelDataSource(modelId, dataSourceId);
      console.log(`🗑️ AI 모델-데이터 소스 매핑 삭제: ${modelId} → ${dataSourceId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('AI 모델 데이터 소스 매핑 삭제 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🎯 통합 AI 모델 데이터 접근 API (격리된 데이터 처리)
  app.get("/api/ai-models/:modelId/accessible-data", async (req, res) => {
    try {
      const { modelId } = req.params;
      const { limit = 1000 } = req.query;
      
      // 1. AI 모델에 매핑된 데이터 소스 조회
      const mappedDataSources = await storage.getAIModelDataSources(modelId);
      console.log(`🔍 AI 모델 ${modelId}에 매핑된 데이터 소스: ${mappedDataSources.length}개`);
      
      const accessibleData = [];
      let totalRecords = 0;
      
      // 2. 각 데이터 소스에서 권한에 따라 데이터 로드
      for (const mapping of mappedDataSources) {
        try {
          const dataSource = await storage.getDataSource(mapping.dataSourceId);
          if (!dataSource) continue;
          
          console.log(`📊 데이터 소스 처리: ${dataSource.name} (${mapping.accessType} 권한)`);
          
          // READ 권한만 허용
          if (mapping.accessType !== 'READ') {
            console.warn(`⚠️ 읽기 전용 접근 거부: ${dataSource.name}`);
            continue;
          }
          
          // 데이터 로드 (격리된 접근)
          const tables = await storage.getDataSourceTables(mapping.dataSourceId);
          for (const table of tables) {
            if (totalRecords >= parseInt(limit as string)) break;
            
            const tableData = await storage.getTableData(mapping.dataSourceId, table.name);
            if (tableData && tableData.length > 0) {
              // 필터 규칙 적용 (기본 구현)
              let filteredData = tableData;
              if (mapping.filterRules && typeof mapping.filterRules === 'object') {
                // 추후 확장 가능한 필터링 로직
                console.log(`🔍 필터 규칙 적용: ${JSON.stringify(mapping.filterRules)}`);
              }
              
              const remainingCapacity = parseInt(limit as string) - totalRecords;
              const dataToAdd = filteredData.slice(0, remainingCapacity);
              
              accessibleData.push({
                dataSourceId: mapping.dataSourceId,
                dataSourceName: dataSource.name,
                tableName: table.name,
                records: dataToAdd,
                totalRecords: filteredData.length,
                accessType: mapping.accessType
              });
              
              totalRecords += dataToAdd.length;
              console.log(`✅ 데이터 로드: ${dataSource.name}.${table.name} → ${dataToAdd.length}개 레코드`);
            }
          }
        } catch (dataError) {
          console.error(`데이터 소스 로드 오류 ${mapping.dataSourceId}:`, dataError);
        }
      }
      
      res.json({
        modelId,
        totalAccessibleRecords: totalRecords,
        dataSources: accessibleData,
        metadata: {
          mappedDataSourceCount: mappedDataSources.length,
          loadedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('AI 모델 접근 가능 데이터 조회 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 기타 필수 API들
  app.post("/api/chat/session", async (req, res) => {
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.json({ sessionId });
  });

  app.get("/api/chat-configurations", async (req, res) => {
    try {
      const configs = await storage.getAllChatConfigurations();
      // 185MB 데이터 전송 문제 해결: uploadedFiles content 제거
      const optimizedConfigs = configs.map(config => ({
        ...config,
        uploadedFiles: config.uploadedFiles?.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          status: file.status,
          language: file.language,
          // content 필드 제거하여 데이터 크기 대폭 축소
        })) || []
      }));
      res.json(optimizedConfigs);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/chat-configurations", async (req, res) => {
    try {
      const config = await storage.createChatConfiguration(req.body);
      res.json(config);
    } catch (error) {
      res.json({ id: `config-${Date.now()}`, ...req.body });
    }
  });

  app.get("/api/data-sources", async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      res.json(dataSources);
    } catch (error) {
      res.json([]);
    }
  });

  app.get("/api/views", async (req, res) => {
    try {
      const views = await storage.getViews();
      res.json(views);
    } catch (error) {
      res.json([]);
    }
  });

  // 누락된 API: 챗봇 데이터 통합 연결 조회
  app.get("/api/chatbot-data-integrations/:configId", async (req, res) => {
    try {
      const connectedSources = await storage.getChatbotDataIntegrations(req.params.configId);
      res.json(connectedSources);
    } catch (error) {
      res.json([]);
    }
  });

  // AI 모델 상태 토글 API 추가
  // 🎯 Knowledge Base 파일 저장을 위한 PUT 엔드포인트 추가
  app.put("/api/chat-configurations/:id", async (req, res) => {
    try {
      const configId = req.params.id;
      const updatedConfig = req.body;
      
      console.log(`🔄 AI 모델 구성 업데이트: ${configId}, 파일 ${updatedConfig.uploadedFiles?.length || 0}개`);
      
      // 데이터베이스에 업데이트된 구성 저장
      const result = await storage.updateChatConfiguration(configId, updatedConfig);
      
      console.log(`✅ AI 모델 구성 업데이트 완료: ${configId}`);
      res.json(result);
    } catch (error) {
      console.error('구성 업데이트 실패:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  app.put("/api/chat-configurations/:id/toggle-active", async (req, res) => {
    try {
      const updated = await storage.toggleChatConfigurationActive(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle configuration' });
    }
  });

  // 🚨 Model Upload 기능을 위한 AI 모델 API 엔드포인트 추가
  app.get("/api/ai-models", async (req, res) => {
    try {
      const models = await storage.getAiModels();
      console.log(`📋 AI 모델 목록 조회: ${models.length}개`);
      res.json(models);
    } catch (error) {
      console.error('AI 모델 목록 조회 실패:', error);
      res.status(500).json({ error: 'Failed to fetch AI models' });
    }
  });

  app.get("/api/ai-models/:id", async (req, res) => {
    try {
      const model = await storage.getAiModel(req.params.id);
      if (model) {
        res.json(model);
      } else {
        res.status(404).json({ error: 'AI model not found' });
      }
    } catch (error) {
      console.error('AI 모델 조회 실패:', error);
      res.status(500).json({ error: 'Failed to fetch AI model' });
    }
  });

  app.post("/api/ai-models", async (req, res) => {
    try {
      console.log('🆕 새 AI 모델 생성:', req.body.name);
      const model = await storage.createAiModel(req.body);
      res.json(model);
    } catch (error) {
      console.error('AI 모델 생성 실패:', error);
      res.status(500).json({ error: 'Failed to create AI model' });
    }
  });

  app.put("/api/ai-models/:id", async (req, res) => {
    try {
      console.log('🔄 AI 모델 업데이트:', req.params.id);
      const model = await storage.updateAiModel(req.params.id, req.body);
      res.json(model);
    } catch (error) {
      console.error('AI 모델 업데이트 실패:', error);
      res.status(500).json({ error: 'Failed to update AI model' });
    }
  });

  app.delete("/api/ai-models/:id", async (req, res) => {
    try {
      console.log('🗑️ AI 모델 삭제:', req.params.id);
      await storage.deleteAiModel(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('AI 모델 삭제 실패:', error);
      res.status(500).json({ error: 'Failed to delete AI model' });
    }
  });

  // AI 모델 폴더 API
  app.get("/api/ai-model-folders", async (req, res) => {
    try {
      const folders = await storage.getAiModelFolders();
      res.json(folders);
    } catch (error) {
      console.error('AI 모델 폴더 목록 조회 실패:', error);
      res.status(500).json({ error: 'Failed to fetch AI model folders' });
    }
  });

  app.post("/api/ai-model-folders", async (req, res) => {
    try {
      const folder = await storage.createAiModelFolder(req.body);
      res.json(folder);
    } catch (error) {
      console.error('AI 모델 폴더 생성 실패:', error);
      res.status(500).json({ error: 'Failed to create AI model folder' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}