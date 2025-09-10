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
import { chunkedUploadManager } from './chunkedUploader';
import { StreamingFileParser } from './streamingParser';

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
      
      // 🔍 소스 파일에서 실제 API URL 추출 (우선순위 1)
      let extractedApiUrl = null;
      let isDirectSourceApiCall = false;
      
      // 1. 소스 파일에서 chatflowId 추출 (데이터 로드 없이)
      console.log(`🔍 AI 모델 "${config?.name}"의 uploadedFiles 확인: ${config?.uploadedFiles?.length || 0}개`);
      
      if (config?.uploadedFiles) {
        for (const file of config.uploadedFiles) {
          console.log(`📄 파일 체크: ${file.name}, type: ${file.type}, content 길이: ${file.content?.length || 0}`);
          
          // 🎯 AI 소스 파일에서만 chatflowId 추출 (데이터는 로드하지 않음)
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
            
            // 🎯 소스 파일에서 chatflowId 추출하여 prediction API 구성
            if (allUrls.length > 0) {
              const sourceUrl = allUrls[0].replace(/['";\s\)\]>]+$/, '');
              console.log(`🔍 소스 파일에서 발견된 URL: ${sourceUrl}`);
              
              // chatflowId 추출 (vector/upsert 또는 prediction URL에서)
              const chatflowMatch = sourceUrl.match(/[a-f0-9-]{36}/); // UUID 형태의 chatflowId 추출
              if (chatflowMatch) {
                const chatflowId = chatflowMatch[0];
                extractedApiUrl = `http://220.118.23.185:3000/api/v1/prediction/${chatflowId}`;
                isDirectSourceApiCall = true;
                console.log(`✅ chatflowId 추출: ${chatflowId} → prediction API: ${extractedApiUrl}`);
              }
            }
            
            // 소스 파일에서 chatflowId만 추출하고 데이터 분석에서 제외
            console.log(`⚠️ 소스 파일에서 chatflowId만 추출: ${file.name}`);
            continue;
          }

          // 🎯 Knowledge Base 데이터 로드 (소스 파일 제외)
          console.log(`📄 파일 데이터 처리: ${file.name}`);
          
          // 파일 처리 상태 변수
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
                    // 🎯 대용량 파일 전체 데이터 청크 처리 (모든 데이터 활용)
                    console.log(`📊 대용량 파일 전체 처리 시작: ${file.name} (${fileSizeMB.toFixed(1)}MB)`);
                    
                    const lines = file.content.split('\n');
                    const headers = lines[0] ? lines[0].split(',') : [];
                    const totalRows = lines.length - 1;
                    
                    // 전체 데이터를 청크 단위로 나누어 처리 (메모리 효율)
                    const chunkSize = 2000; // 한 청크당 2000행
                    const chunks = [];
                    
                    for (let chunkIndex = 0; chunkIndex * chunkSize < totalRows; chunkIndex++) {
                      const startRow = chunkIndex * chunkSize + 1;
                      const endRow = Math.min((chunkIndex + 1) * chunkSize, totalRows);
                      
                      const chunkData = [];
                      const chunkSummary = {
                        ids: [],
                        batchIds: [],
                        operators: [],
                        phases: [],
                        sites: [],
                        timestamps: [],
                        oeeValues: [],
                        productionRates: [],
                        temperatures: []
                      };
                      
                      // 청크 내 모든 행 처리
                      for (let i = startRow; i <= endRow && i < lines.length; i++) {
                        if (lines[i] && lines[i].trim()) {
                          const values = lines[i].split(',');
                          const row: Record<string, any> = {};
                          headers.forEach((header, idx) => {
                            row[header?.trim() || `col_${idx}`] = values[idx]?.trim() || '';
                          });
                          
                          chunkData.push(row);
                          
                          // 검색용 메타데이터 수집
                          if (row.Id) chunkSummary.ids.push(row.Id);
                          if (row.BatchID) chunkSummary.batchIds.push(row.BatchID);
                          if (row.Operator) chunkSummary.operators.push(row.Operator);
                          if (row.Phase) chunkSummary.phases.push(row.Phase);
                          if (row.Site) chunkSummary.sites.push(row.Site);
                          if (row.TimeStamp) chunkSummary.timestamps.push(row.TimeStamp);
                          if (row.OEE) chunkSummary.oeeValues.push(parseFloat(row.OEE) || 0);
                          if (row['Production Rate']) chunkSummary.productionRates.push(parseFloat(row['Production Rate']) || 0);
                          if (row.Temperature) chunkSummary.temperatures.push(parseFloat(row.Temperature) || 0);
                        }
                      }
                      
                      // 청크 요약 정보 생성
                      chunks.push({
                        chunkIndex,
                        rowRange: `${startRow}-${endRow}`,
                        rowCount: chunkData.length,
                        data: chunkData,
                        summary: {
                          idRange: chunkSummary.ids.length > 0 ? `${Math.min(...chunkSummary.ids.map(Number))}-${Math.max(...chunkSummary.ids.map(Number))}` : '',
                          uniqueBatches: [...new Set(chunkSummary.batchIds)],
                          uniqueOperators: [...new Set(chunkSummary.operators)],
                          uniquePhases: [...new Set(chunkSummary.phases)],
                          uniqueSites: [...new Set(chunkSummary.sites)],
                          oeeRange: chunkSummary.oeeValues.length > 0 ? {
                            min: Math.min(...chunkSummary.oeeValues),
                            max: Math.max(...chunkSummary.oeeValues),
                            avg: chunkSummary.oeeValues.reduce((a, b) => a + b, 0) / chunkSummary.oeeValues.length
                          } : null,
                          productionRange: chunkSummary.productionRates.length > 0 ? {
                            min: Math.min(...chunkSummary.productionRates),
                            max: Math.max(...chunkSummary.productionRates),
                            avg: chunkSummary.productionRates.reduce((a, b) => a + b, 0) / chunkSummary.productionRates.length
                          } : null,
                          tempRange: chunkSummary.temperatures.length > 0 ? {
                            min: Math.min(...chunkSummary.temperatures),
                            max: Math.max(...chunkSummary.temperatures)
                          } : null
                        }
                      });
                    }
                    
                    // 전체 청크 데이터를 AI 분석용으로 저장
                    allUploadedData.push({
                      file: file.name,
                      type: 'full_data_chunks',
                      totalRows: totalRows,
                      totalChunks: chunks.length,
                      columns: headers,
                      chunks: chunks,
                      note: `전체 ${totalRows}개 행을 ${chunks.length}개 청크로 완전 처리`
                    });
                    
                    console.log(`✅ 대용량 파일 전체 처리: ${file.name} → ${chunks.length}개 청크, 총 ${totalRows}개 행 완전 로드`);
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

      // 🎯 Data Integration 데이터 로드 활성화 (API는 소스 파일 기준)
      console.log(`🔗 Data Integration 데이터 로드 시작`);
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

      // 🔒 데이터 격리: attached_assets 폴더의 공유 데이터 로드 비활성화
      // 각 AI 모델은 자신의 Knowledge Base와 Data Integration만 사용합니다
      console.log(`🔒 AI 모델 "${config?.name}" (${config?.id})에 대한 데이터 격리 적용`);
      console.log(`📊 현재 모델의 격리된 데이터: ${allUploadedData.length}개 레코드`);
      
      if (false) { // 공유 데이터 로드 비활성화
        try {
          const fs = await import('fs');
          const path = await import('path');
          const assetsPath = path.join(process.cwd(), 'attached_assets');
          
          if (fs.existsSync(assetsPath)) {
            const assetFiles = fs.readdirSync(assetsPath);
            console.log(`🔍 attached_assets 폴더 검색: ${assetFiles.length}개 파일 발견`);
            console.log(`📂 발견된 파일들:`, assetFiles.filter(f => f.endsWith('.csv')).map(f => f.substring(0, 50)));
            
            // 대용량 CSV 파일들 우선 처리 (RawData 우선)
            const csvFiles = assetFiles.filter(file => file.endsWith('.csv')).sort((a, b) => {
              // RawData 파일을 최우선으로
              if (a.includes('RawData') && !b.includes('RawData')) return -1;
              if (!a.includes('RawData') && b.includes('RawData')) return 1;
              
              const statA = fs.statSync(path.join(assetsPath, a));
              const statB = fs.statSync(path.join(assetsPath, b));
              return statB.size - statA.size; // 큰 파일부터
            });
            
            console.log(`📊 우선순위 CSV 파일들:`, csvFiles.slice(0, 3));
            
            for (const csvFile of csvFiles.slice(0, 2)) { // 최대 2개 큰 파일
              const fullPath = path.join(assetsPath, csvFile);
              const stats = fs.statSync(fullPath);
              const fileSizeMB = stats.size / (1024 * 1024);
              
              console.log(`📊 대용량 CSV 파일 직접 읽기: ${csvFile} (${fileSizeMB.toFixed(1)}MB)`);
              
              try {
                if (fileSizeMB > 10) { // 10MB 이상 대용량 파일
                  // 스트리밍으로 읽어서 샘플링
                  const fileContent = fs.readFileSync(fullPath, 'utf-8');
                  const lines = fileContent.split('\n').filter(line => line.trim());
                  
                  if (lines.length > 1) {
                    const headers = lines[0].split(',').map(h => h.trim());
                    const totalRows = lines.length - 1;
                    
                    console.log(`🚀 대용량 파일 샘플링: ${totalRows}개 행 발견`);
                    
                    // 샘플링 전략: 첫 2000개 + 중간 2000개 + 마지막 2000개
                    const sampleSize = 2000;
                    const sampleIndices = [
                      ...Array.from({length: sampleSize}, (_, i) => i + 1), // 첫 2000개
                      ...Array.from({length: sampleSize}, (_, i) => Math.floor(totalRows / 2) + i), // 중간 2000개
                      ...Array.from({length: sampleSize}, (_, i) => totalRows - sampleSize + i + 1) // 마지막 2000개
                    ].filter(i => i > 0 && i < lines.length);
                    
                    const uniqueIndices = [...new Set(sampleIndices)];
                    const sampleRows = uniqueIndices.map(i => {
                      const values = lines[i].split(',');
                      const row = {};
                      headers.forEach((header, idx) => {
                        row[header] = values[idx]?.trim() || '';
                      });
                      return row;
                    });
                    
                    allUploadedData.push(...sampleRows);
                    console.log(`✅ 대용량 CSV 샘플링 완료: ${csvFile} → ${sampleRows.length}개 레코드 (전체 ${totalRows}개 중)`);
                    console.log(`📋 샘플 데이터 미리보기:`, JSON.stringify(sampleRows.slice(0, 2), null, 2));
                    
                    // 메타데이터도 추가
                    allUploadedData.push({
                      file: csvFile,
                      type: 'large_csv_metadata',
                      totalRows: totalRows,
                      columns: headers,
                      sampleSize: sampleRows.length,
                      note: `대용량 파일 ${csvFile}: 총 ${totalRows}개 행 중 ${sampleRows.length}개 샘플링됨`
                    });
                    
                  }
                } else {
                  // 작은 파일은 전체 읽기
                  const fileContent = fs.readFileSync(fullPath, 'utf-8');
                  const lines = fileContent.split('\n').filter(line => line.trim());
                  
                  if (lines.length > 1) {
                    const headers = lines[0].split(',').map(h => h.trim());
                    const rows = lines.slice(1).map(line => {
                      const values = line.split(',');
                      const row = {};
                      headers.forEach((header, idx) => {
                        row[header] = values[idx]?.trim() || '';
                      });
                      return row;
                    });
                    
                    allUploadedData.push(...rows);
                    console.log(`✅ 소용량 CSV 전체 로드: ${csvFile} → ${rows.length}개 레코드`);
                  }
                }
              } catch (fileError) {
                console.warn(`CSV 파일 읽기 실패: ${csvFile}`, fileError);
              }
            }
          }
        } catch (error) {
          console.warn('attached_assets 직접 읽기 실패:', error);
        }
      }

      // 🔒 백업 데이터 로드 비활성화 (모델별 데이터 격리를 위해)
      if (false) { // 백업 데이터 로드 비활성화
        try {
          const fs = await import('fs');
          const path = await import('path');
          const dataPath = path.join(process.cwd(), 'real_bioreactor_1000_rows.json');
          if (fs.existsSync(dataPath)) {
            allUploadedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            console.log(`✅ 백업 bioreactor 데이터 로드: ${allUploadedData.length}개 레코드`);
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

      // 🦙 Llama 기반 Flowise AI 엔진 실행
      let aiResponse = "";
      
      if (config) {
        try {
          // AI 처리 옵션 설정 (먼저 초기화)
          const aiOptions = {
            maxTokens: config.maxTokens || 2000,
            temperature: Math.min((config.temperature || 70) / 100, 1.0), // UI에서 받은 값을 0-1 범위로 변환, 최대 1.0
            model: 'llama',
            enableFallback: true
          };
          
          console.log(`🦙 Flowise Llama AI 엔진 호출: "${message}"`);
          console.log(`📊 분석할 데이터 개수: ${allUploadedData.length}개`);
          console.log(`🔧 Config ID: ${configId}`);
          console.log(`📋 AI Options:`, JSON.stringify(aiOptions, null, 2));
          
          const { localAI } = await import('./localAiEngine');
          
          // AI 엔진 초기화
          await localAI.initialize();
          
          // 🎯 소스 파일 API 직접 호출 (프롬프트 수정 없이)
          if (isDirectSourceApiCall && extractedApiUrl) {
            console.log(`🚀 소스 파일 API 직접 호출: ${extractedApiUrl}`);
            console.log(`📝 원본 질문 그대로 전달: "${message}"`);
            
            try {
              const response = await fetch(extractedApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  question: message, // 🎯 사용자 질문 그대로 전달 (프롬프트 수정 없음)
                  overrideConfig: {
                    returnSourceDocuments: true
                  }
                }),
                timeout: 30000
              });

              if (response.ok) {
                const apiResult = await response.json();
                console.log(`✅ 소스 파일 API 응답:`, apiResult);
                
                // API 응답 그대로 사용
                aiResponse = apiResult.text || apiResult.answer || apiResult.response || JSON.stringify(apiResult);
                console.log(`📋 원본 응답 그대로 사용: ${aiResponse.substring(0, 200)}...`);
              } else {
                throw new Error(`API 호출 실패: ${response.status}`);
              }
            } catch (apiError) {
              console.error(`❌ 소스 파일 API 호출 실패:`, apiError);
              // 실패 시 기본 AI 처리로 fallback
              const result = await localAI.processQuery(message, allUploadedData, aiOptions, config.id);
              aiResponse = result.response;
            }
          } else {
            // 기존 방식: 통합 AI 처리 (Flowise + 로컬 계산)
            const result = await localAI.processQuery(message, allUploadedData, aiOptions, config.id);
            aiResponse = result.response;
          }
          if (isDirectSourceApiCall) {
            console.log(`✅ 소스 파일 API 직접 호출 완료`);
          } else {
            console.log(`✅ 기본 AI 처리 완료`);
          }
          console.log(`📋 AI 응답 미리보기: ${aiResponse.substring(0, 200)}...`);
          
        } catch (aiError) {
          console.error('❌ AI 처리 실패:', aiError);
          console.error('  📋 AI 에러 세부사항:', {
            name: aiError.name,
            message: aiError.message,
            stack: aiError.stack?.substring(0, 500)
          });
          
          // 🛡️ 최종 Fallback: 간단한 데이터 기반 응답
          if (allUploadedData.length > 0) {
            const firstRow = allUploadedData[0];
            const columns = Object.keys(firstRow || {});
            aiResponse = `📊 **업로드된 데이터 분석 요청**: "${message}"\n\n` +
                       `**데이터 현황:**\n` +
                       `- 총 레코드: ${allUploadedData.length}개\n` +
                       `- 컬럼: ${columns.join(', ')}\n` +
                       `- 샘플 데이터: ${JSON.stringify(firstRow, null, 2)}\n\n` +
                       `**참고:** Flowise Llama AI와 로컬 계산 엔진을 통해 고품질 분석을 제공합니다.`;
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
      const configurations = await storage.getAiModelChatConfigurations(modelId);
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
      
      const configuration = await storage.createAiModelChatConfiguration({
        aiModelId: modelId,
        chatConfigId: chatbotConfigId,
        priority: priority || 1,
        isActive: isActive !== false ? 1 : 0
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
      await storage.deleteAiModelChatConfiguration(modelId, configId);
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
      const dataSources = await storage.getAiModelDataSources(modelId);
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
      
      const mapping = await storage.createAiModelDataSource({
        aiModelId: modelId,
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
      
      const updatedMapping = await storage.updateAiModelDataSource(modelId, dataSourceId, {
        accessLevel: accessType,
        dataFilter: filterRules
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
      await storage.deleteAiModelDataSource(modelId, dataSourceId);
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
      const mappedDataSources = await storage.getAiModelDataSources(modelId);
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
      console.log('🔄 챗봇 구성 로드 시작...');
      const startTime = Date.now();
      
      const configs = await storage.getAllChatConfigurations();
      
      // 성능 최적화: uploadedFiles content 제거
      const optimizedConfigs = configs.map(config => ({
        ...config,
        uploadedFiles: config.uploadedFiles?.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          status: file.status,
          language: file.language,
          uploadedAt: file.uploadedAt
        })) || []
      }));
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ 챗봇 구성 로드 완료: ${optimizedConfigs.length}개, ${loadTime}ms`);
      
      // 캐시 무효화를 위한 헤더 추가
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Last-Modified', new Date().toUTCString());
      
      res.json(optimizedConfigs);
    } catch (error) {
      console.error('❌ Error fetching chat configurations:', error);
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

  // 개별 데이터 소스 조회 API 추가
  app.get("/api/data-sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.getDataSource(id);
      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      res.json(dataSource);
    } catch (error) {
      console.error('데이터 소스 조회 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 데이터 소스 샘플 데이터 조회 API 추가
  app.get("/api/data-sources/:id/sample-data", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.getDataSource(id);
      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      
      // 샘플 데이터가 있으면 반환, 없으면 빈 객체 반환
      const sampleData = (dataSource as any).sampleData || {};
      res.json(sampleData);
    } catch (error) {
      console.error('샘플 데이터 조회 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 데이터 소스 테이블 데이터 조회 API 추가
  app.get("/api/data-sources/:id/tables/:table/data", async (req, res) => {
    try {
      const { id, table } = req.params;
      const dataSource = await storage.getDataSource(id);
      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      
      // 테이블별 데이터 조회 (샘플 데이터에서 해당 테이블 추출)
      const sampleData = (dataSource as any).sampleData || {};
      const tableData = sampleData[table] || [];
      res.json(tableData);
    } catch (error) {
      console.error('테이블 데이터 조회 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🚀 엔터프라이즈 업로드를 위한 데이터 소스 생성 API
  app.post("/api/data-sources", async (req, res) => {
    try {
      const dataSource = req.body;
      const createdDataSource = await storage.createDataSource(dataSource);
      console.log(`📊 데이터 소스 생성: ${dataSource.name} (${dataSource.recordCount}개 행)`);
      res.json(createdDataSource);
    } catch (error) {
      console.error('데이터 소스 생성 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 데이터 소스 삭제 API
  app.delete("/api/data-sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDataSource(id);
      console.log(`🗑️ 데이터 소스 삭제: ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('데이터 소스 삭제 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
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
  // 🎯 챗봇 데이터 연동 생성 API (누락된 핵심 엔드포인트)
  app.post("/api/chatbot-data-integrations", async (req, res) => {
    try {
      const { configId, dataSourceId, accessLevel, dataFilter } = req.body;
      
      // 유효성 검사
      if (!configId || !dataSourceId) {
        return res.status(400).json({ 
          error: 'configId와 dataSourceId는 필수입니다' 
        });
      }
      
      console.log(`🔗 챗봇-데이터소스 연결 시도: ${configId} → ${dataSourceId}`);
      
      // 🔧 중복 키 문제 해결: 기존 연결이 있으면 업데이트, 없으면 생성
      let integration;
      try {
        const existingIntegrations = await storage.getChatbotDataIntegrations(configId);
        const existingIntegration = existingIntegrations.find(i => i.dataSourceId === dataSourceId);
        
        if (existingIntegration) {
          console.log(`🔄 기존 연결 업데이트: ${existingIntegration.id}`);
          integration = existingIntegration; // 기존 연결 사용
        } else {
          integration = await storage.createChatbotDataIntegration({
            configId,
            dataSourceId,
            accessLevel: accessLevel || 'READ',
            dataFilter: dataFilter || null
          });
        }
      } catch (createError) {
        console.warn(`⚠️ 생성 실패, 기존 연결 조회 시도:`, createError.message);
        const existingIntegrations = await storage.getChatbotDataIntegrations(configId);
        integration = existingIntegrations.find(i => i.dataSourceId === dataSourceId);
        if (!integration) {
          throw createError;
        }
      }
      
      console.log(`✅ 챗봇 데이터 연동 완료: ${integration.id}`);
      res.json(integration);
      
    } catch (error) {
      console.error('❌ 챗봇 데이터 연동 실패:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: '데이터 연동이 실패했습니다' 
      });
    }
  });

  app.get("/api/chatbot-data-integrations/:configId", async (req, res) => {
    try {
      const connectedSources = await storage.getChatbotDataIntegrations(req.params.configId);
      res.json(connectedSources);
    } catch (error) {
      res.json([]);
    }
  });

  // 누락된 API: 챗봇 데이터 연동 해제 (DELETE)
  app.delete("/api/chatbot-data-integrations/:configId/:dataSourceId", async (req, res) => {
    try {
      const { configId, dataSourceId } = req.params;
      console.log(`🗑️ 데이터 연동 해제: ${configId} → ${dataSourceId}`);
      
      await storage.deleteChatbotDataIntegration(configId, dataSourceId);
      console.log(`✅ 데이터 연동 해제 완료`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('❌ 데이터 연동 해제 실패:', error);
      res.status(500).json({ error: 'Failed to disconnect data integration' });
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

  // 챗봇 구성 삭제 API (누락된 핵심 엔드포인트)
  app.delete("/api/chat-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`🗑️ 챗봇 구성 삭제 시작: ${id}`);
      
      await storage.deleteChatConfiguration(id);
      console.log(`✅ 챗봇 구성 삭제 완료: ${id}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('챗봇 구성 삭제 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
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

  // 🚀 엔터프라이즈급 청크 업로드 API 엔드포인트

  // 청크 업로드 세션 초기화
  app.post("/api/upload/chunked/initialize", async (req, res) => {
    try {
      const { fileName, fileSize, chunkSize } = req.body;
      
      if (!fileName || !fileSize) {
        return res.status(400).json({ error: "fileName and fileSize are required" });
      }
      
      const result = await chunkedUploadManager.initializeUploadSession(
        fileName, 
        fileSize, 
        chunkSize
      );
      
      console.log(`🚀 청크 업로드 세션 초기화: ${fileName} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
      res.json(result);
      
    } catch (error: any) {
      console.error("청크 업로드 초기화 실패:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 개별 청크 업로드
  app.post("/api/upload/chunked/:sessionId/chunk/:chunkIndex", upload.single('chunk'), async (req, res) => {
    try {
      const { sessionId, chunkIndex } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: "Chunk file is required" });
      }
      
      const progress = await chunkedUploadManager.uploadChunk(
        sessionId,
        parseInt(chunkIndex),
        req.file.buffer
      );
      
      res.json(progress);
      
    } catch (error: any) {
      console.error("청크 업로드 실패:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 업로드 완료 및 파일 재조립
  app.post("/api/upload/chunked/:sessionId/finalize", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // 파일 재조립
      const { filePath, fileSize } = await chunkedUploadManager.finalizeUpload(sessionId);
      
      // 스트리밍 파서로 처리
      console.log(`🌊 스트리밍 파싱 시작: ${filePath}`);
      const parser = new StreamingFileParser({
        batchSize: 2000,
        enableIndexing: true
      });
      
      const parseResult = await parser.parseFile(
        filePath,
        (batch) => {
          console.log(`📦 배치 처리: ${batch.batchId} (${batch.data.length}개 행)`);
        },
        (progress) => {
          if (progress.currentLine % 5000 === 0) {
            console.log(`📈 파싱 진행: ${progress.currentLine}개 행 처리`);
          }
        }
      );
      
      console.log(`✅ 엔터프라이즈 파일 처리 완료: ${parseResult.totalRows}개 행, ${parseResult.totalBatches}개 배치`);
      
      res.json({
        success: true,
        parseResult: {
          sessionId: parseResult.sessionId,
          totalRows: parseResult.totalRows,
          totalBatches: parseResult.totalBatches,
          headers: parseResult.headers,
          processingTime: parseResult.globalSummary.processingTime,
          sampleData: parseResult.batches.slice(0, 2).flatMap(b => b.data.slice(0, 5))
        }
      });
      
    } catch (error: any) {
      console.error("청크 업로드 완료 처리 실패:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 업로드 진행상태 조회
  app.get("/api/upload/chunked/:sessionId/progress", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const progress = chunkedUploadManager.getUploadProgress(sessionId);
      res.json(progress);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}