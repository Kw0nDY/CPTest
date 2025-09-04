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

// 매우 단순화된 routes.ts 파일 - 오직 필수 기능만
export async function registerRoutes(app: express.Express): Promise<Server> {
  // Initialize sample data on startup
  await initializeSampleData();
  
  // 채팅 메시지 처리 - 완전한 데이터 격리
  app.post("/api/chat/:sessionId/message", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { message, configId } = req.body;


      // 사용자 메시지 저장
      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        message: message.trim(),
        createdAt: new Date().toISOString()
      });

      // Knowledge Base + Data Integration 모든 데이터 수집 (각 모델별 격리)
      let allUploadedData = [];
      const connectedDataSources = configId ? await storage.getChatbotDataIntegrations(configId) : [];
      const config = configId ? await storage.getChatConfiguration(configId) : null;
      
      console.log(`🔍 Config 객체 확인:`, JSON.stringify(config, null, 2));

      console.log(`🔍 AI 모델 ${configId}의 연결된 데이터 소스:`, connectedDataSources.length);
      console.log(`📝 사용자 원본 메시지: "${message}"`);
      console.log(`📝 사용자 메시지 길이: ${message.length}자`);

      // 1단계: Data Integration에서 연결된 데이터 소스 수집
      for (const integration of connectedDataSources) {
        try {
          const dataSource = await storage.getDataSource(integration.dataSourceId);
          console.log(`📊 데이터 소스 "${dataSource.name}" 처리 중...`);
          console.log(`🔍 데이터 소스 구조:`, JSON.stringify({
            id: dataSource.id,
            name: dataSource.name,
            hasTable: !!dataSource.tables,
            tablesLength: dataSource.tables?.length,
            hasConfig: !!dataSource.config,
            configKeys: dataSource.config ? Object.keys(dataSource.config) : [],
            configSampleDataKeys: dataSource.config?.sampleData ? Object.keys(dataSource.config.sampleData) : []
          }, null, 2));
          
          // 먼저 실제 업로드된 테이블 데이터를 확인
          if (dataSource?.tables && Array.isArray(dataSource.tables)) {
            for (const table of dataSource.tables) {
              try {
                const tableData = await storage.getTableData(dataSource.id, table.name);
                if (tableData && tableData.length > 0) {
                  allUploadedData.push(...tableData);
                  console.log(`✅ 실제 테이블 "${table.name}"에서 ${tableData.length}개 레코드 추가`);
                } else {
                  console.log(`⚠️ 테이블 "${table.name}"에 데이터 없음`);
                }
              } catch (tableError) {
                console.error(`❌ 테이블 "${table.name}" 데이터 로드 오류:`, tableError);
              }
            }
          }
          
          // 📊 실제 업로드된 config 데이터 처리
          if (dataSource?.config?.sampleData && Object.keys(dataSource.config.sampleData).length > 0) {
            console.log(`📂 실제 업로드 데이터 처리 시작: ${dataSource.name}`);
            
            for (const [tableName, records] of Object.entries(dataSource.config.sampleData)) {
              if (Array.isArray(records) && records.length > 0) {
                allUploadedData.push(...records);
                console.log(`✅ 테이블 "${tableName}"에서 ${records.length}개 실제 레코드 추가`);
                
                // 데이터 구조 디버깅
                const sampleRecord = records[0];
                const columns = Object.keys(sampleRecord);
                console.log(`🔍 실제 데이터 컬럼:`, columns.slice(0, 10));
              }
            }
          }
          
        } catch (error) {
          console.error(`❌ 데이터 소스 처리 오류:`, error);
        }
      }

      // 2단계: Knowledge Base 파일에서 데이터 수집
      if (config?.uploadedFiles?.length > 0) {
        
        for (const file of config.uploadedFiles) {
          if (file.type === 'csv' || file.type === 'excel' || file.type === 'data') {
            try {
              let fileData = null;
              
              if (file.metadata?.processedData?.sampleData) {
                fileData = file.metadata.processedData.sampleData;
              } else if (file.metadata?.sampleData) {
                fileData = file.metadata.sampleData;
              } else if (file.content && typeof file.content === 'string') {
                const lines = file.content.split('\n').filter(line => line.trim());
                if (lines.length > 1) {
                  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                  fileData = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                    const row: any = {};
                    headers.forEach((header, index) => {
                      row[header] = values[index] || '';
                    });
                    return row;
                  });
                }
              }
              
              if (fileData) {
                if (Array.isArray(fileData)) {
                  allUploadedData.push(...fileData);
                } else if (typeof fileData === 'object') {
                  for (const [tableName, records] of Object.entries(fileData)) {
                    if (Array.isArray(records)) {
                      allUploadedData.push(...records);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`❌ Knowledge Base 파일 ${file.name} 처리 오류:`, error);
            }
          }
        }
      }


      if (allUploadedData.length > 0) {

        try {
          console.log(`🚀 AI에게 전달하는 질문: "${message}"`);
          console.log(`📊 전달하는 데이터 개수: ${allUploadedData.length}개`);
          console.log(`🔒 모델 ID: ${configId}`);
          
          // 🔥 chatflowId 강제 설정 (config에서 못 가져올 때)
          const chatflowId = config?.chatflowId || '9e85772e-dc56-4b4d-bb00-e18aeb80a484';
          console.log(`🌐 사용할 chatflowId: ${chatflowId}`);
          
          // 🎯 완전한 응답을 위한 구체적 지시 추가
          const enhancedMessage = `${message}

중요: 위 질문에 대해 완전하고 구체적인 답변을 제공해주세요. 분석 결과를 끝까지 다 말씀해주세요. 응답을 중간에 끊지 마세요.`;

          // 원본 chatflowId 사용, 데이터 격리는 modelId로 보장  
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 timeout
          
          const response = await fetch(`http://220.118.23.185:3000/api/v1/prediction/${chatflowId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
              question: enhancedMessage,
              overrideConfig: {
                chatData: allUploadedData,
                modelId: configId,
                sessionId: `isolated-${configId}`,
                maxTokens: 12000, // 더 큰 응답 허용
                temperature: 0.1,  // 정확성 최우선
                streaming: false   // 스트리밍 비활성화로 완전한 응답 보장
              }
            })
          });
          
          clearTimeout(timeoutId);
          
          const aiResult = await response.json();
          console.log(`🔍 Flowise API 응답:`, response.status, aiResult);
          
          let aiResponse = aiResult.text || '응답을 생성할 수 없습니다.';
          
          // 🎯 AI 응답이 불완전하거나 데이터 카운팅 질문일 때 서버에서 직접 분석 제공
          console.log(`🤖 AI 응답: "${aiResponse}"`);
          
          const needsDataAnalysis = (
            // ID 조회 질문은 무조건 실제 데이터 사용
            (message.includes('Id') || message.includes('ID')) && 
            (message.includes('정보') || message.includes('알려') || message.includes('값') || message.includes('데이터')) ||
            // AI가 실제 데이터에 없는 용어를 사용하는 경우
            aiResponse.includes('진공 시스템') || aiResponse.includes('크라이오') || aiResponse.includes('Load Lock') ||
            aiResponse.includes('챔버') || aiResponse.includes('CVD') || aiResponse.includes('ALD') ||
            // 응답이 너무 짧거나 불완전한 경우
            aiResponse.length < 50 ||
            // 관련없는 기술적 용어가 포함된 경우
            aiResponse.includes('인덱스') || aiResponse.includes('Index') || 
            aiResponse.includes('배기/소각') || aiResponse.includes('Abatement') ||
            // 데이터가 없다고 잘못 답변하는 경우
            aiResponse.includes('존재하지') || aiResponse.includes('포함하고 있지 않습니다') ||
            aiResponse.includes('알 수 없습니다') || aiResponse.includes('추론하기 어렵습니다') ||
            aiResponse.includes('정보가 필요합니다') || aiResponse.includes('제공되지 않았기') ||
            // 숫자나 개수 질문에 구체적 답변이 없는 경우
            (message.includes('개수') || message.includes('갯수') || message.includes('count')) && 
            !/\d+개/.test(aiResponse) ||
            // 일반적인 설명만 하고 실제 값을 제공하지 않는 경우
            (message.includes('값은') || message.includes('값이') || message.includes('얼마')) &&
            !aiResponse.match(/:\s*\d+|=\s*\d+|\d+\.?\d*\s*(도|°|값)/)  // 실제 값 형식이 없음
          );

          if (needsDataAnalysis && allUploadedData.length > 0) {
            console.log(`⚠️ AI 모델이 데이터에 제대로 접근하지 못함. 벡터 DB 재업로드 필요`);
            
            // 🔄 실제 데이터를 AI 모델에 직접 전달하여 처리하도록 함
            try {
              console.log(`🤖 AI 모델에 실제 데이터 직접 전달하여 재시도`);
              
              // 실제 데이터를 컨텍스트로 포함해서 AI에게 질문
              const contextualPrompt = `**중요: 다음 데이터만 사용하세요. 다른 학습된 데이터나 외부 정보는 무시하세요.**

===== 실제 업로드된 데이터 시작 =====
${JSON.stringify(allUploadedData, null, 2)}
===== 실제 업로드된 데이터 끝 =====

사용자 질문: ${message}

**규칙:**
1. 위의 실제 데이터에 있는 정보만 사용하세요
2. 데이터에 없는 정보는 "데이터에 없음"이라고 말하세요
3. 추측하거나 외부 지식을 사용하지 마세요
4. 정확한 값만 제공하세요

이제 사용자 질문에 답변해주세요.`;

              console.log(`📝 컨텍스트 포함 프롬프트 길이: ${contextualPrompt.length}자`);
              
              const retryResponse = await fetch(`http://220.118.23.185:3000/api/v1/prediction/${config.chatflowId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: contextualPrompt,
                  chatId: `direct-${sessionId}-${Date.now()}`,
                  overrideConfig: { 
                    temperature: 0.1,
                    maxTokens: 12000
                  }
                }),
                timeout: 60000
              });
              
              if (retryResponse.ok) {
                const retryResult = await retryResponse.json();
                const newResponse = retryResult.text || aiResponse;
                
                console.log(`🔄 직접 전달 AI 응답:`, newResponse.substring(0, 200) + '...');
                
                // AI가 제대로 답변했는지 확인
                if (newResponse && newResponse.length > 50 && !newResponse.includes('Hello there!')) {
                  aiResponse = newResponse;
                  console.log(`✅ AI가 실제 데이터로 응답 생성 성공`);
                } else {
                  console.log(`❌ AI 응답 여전히 부정확함`);
                }
              } else {
                console.log(`❌ AI 직접 호출 실패: ${retryResponse.status}`);
              }
            } catch (error) {
              console.error(`❌ AI 직접 호출 오류:`, error);
            }
          }
        
          const botMessage = await storage.createChatMessage({
            sessionId,
            type: 'bot', 
            message: aiResponse,
            createdAt: new Date().toISOString()
          });
          
          return res.json({
            userMessage: userMessage,
            botMessage: botMessage
          });
        } catch (error) {
          const searchResults = allUploadedData.filter(record => 
            JSON.stringify(record).toLowerCase().includes(message.toLowerCase())
          ).slice(0, 3);
          
          const aiResponse = searchResults.length > 0 
            ? `업로드된 데이터에서 '${message}'에 대한 검색 결과:\n\n${searchResults.map((record, i) => 
                `레코드 ${i+1}:\n${Object.entries(record).map(([k,v]) => `  ${k}: ${v}`).join('\n')}`
              ).join('\n\n')}`
            : `'${message}'에 대한 정보를 업로드된 데이터에서 찾을 수 없습니다.`;
          
          const botMessage = await storage.createChatMessage({
            sessionId,
            type: 'bot', 
            message: aiResponse,
            createdAt: new Date().toISOString()
          });
          
          return res.json({
            userMessage: userMessage,
            botMessage: botMessage
          });
        }
      } else {
        const noDataMessage = "현재 이 AI 모델에는 연결된 데이터가 없습니다.\n\n" +
          "Assistant 모듈의 Knowledge Base에서 파일을 업로드하거나 Data Integration을 연동해주세요.";
        
        const botMessage = await storage.createChatMessage({
          sessionId,
          type: 'bot',
          message: noDataMessage,
          createdAt: new Date().toISOString()
        });
        
        return res.json({
          userMessage: userMessage,
          botMessage: botMessage
        });
      }

    } catch (error) {
      console.error('Error handling chat message:', error);
      res.status(500).json({ 
        error: "메시지 처리에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chat Session 생성
  app.post("/api/chat/session", async (req, res) => {
    try {
      const { configId } = req.body;
      const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Creating chat session with configId: ${configId}`);
      await storage.createChatSession({
        sessionId,
        configId: configId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      console.log(`Chat session created successfully: ${sessionId}`);
      res.json({ sessionId });
    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({ 
        error: "채팅 세션 생성에 실패했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Data Sources API
  app.get("/api/data-sources", async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      res.json(dataSources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ error: "Failed to fetch data sources" });
    }
  });

  app.post("/api/data-sources", async (req, res) => {
    try {
      const dataSource = await storage.createDataSource(req.body);
      res.status(201).json(dataSource);
    } catch (error) {
      console.error("Error creating data source:", error);
      res.status(400).json({ error: "Failed to create data source" });
    }
  });

  // Chat Configurations API
  app.get("/api/chat/configurations", async (req, res) => {
    try {
      const configurations = await storage.getChatConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error('Error fetching chat configurations:', error);
      res.status(500).json({ error: "챗봇 구성 조회에 실패했습니다" });
    }
  });

  app.post("/api/chat/configurations", async (req, res) => {
    try {
      const configuration = await storage.createChatConfiguration(req.body);
      res.status(201).json(configuration);
    } catch (error) {
      console.error('Error creating chat configuration:', error);
      res.status(500).json({ error: "챗봇 구성 생성에 실패했습니다" });
    }
  });

  app.put("/api/chat/configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const configuration = await storage.updateChatConfiguration(id, req.body);
      res.json(configuration);
    } catch (error) {
      console.error('Error updating chat configuration:', error);
      res.status(500).json({ error: "챗봇 구성 업데이트에 실패했습니다" });
    }
  });

  app.delete("/api/chat/configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChatConfiguration(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting chat configuration:', error);
      res.status(500).json({ error: "챗봇 구성 삭제에 실패했습니다" });
    }
  });

  // Chatbot Data Integrations API
  // Chat Configuration endpoints
  app.get("/api/chat-configurations", async (req, res) => {
    try {
      const configurations = await storage.getAllChatConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error('Error fetching chat configurations:', error);
      res.status(500).json({ error: "챗봇 구성 조회에 실패했습니다" });
    }
  });

  app.post("/api/chat-configurations", async (req, res) => {
    try {
      const config = await storage.createChatConfiguration(req.body);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating chat configuration:', error);
      res.status(500).json({ error: "챗봇 구성 생성에 실패했습니다" });
    }
  });

  app.put("/api/chat-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const config = await storage.updateChatConfiguration(id, req.body);
      res.json(config);
    } catch (error) {
      console.error('Error updating chat configuration:', error);
      res.status(500).json({ error: "챗봇 구성 업데이트에 실패했습니다" });
    }
  });

  app.put("/api/chat-configurations/:id/toggle-active", async (req, res) => {
    try {
      const { id } = req.params;
      const config = await storage.toggleChatConfigurationActive(id);
      res.json(config);
    } catch (error) {
      console.error('Error toggling chat configuration active status:', error);
      res.status(500).json({ error: "챗봇 구성 활성화 상태 변경에 실패했습니다" });
    }
  });

  app.delete("/api/chat-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChatConfiguration(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting chat configuration:', error);
      res.status(500).json({ error: "챗봇 구성 삭제에 실패했습니다" });
    }
  });

  app.get("/api/chatbot-data-integrations/:configId", async (req, res) => {
    try {
      const { configId } = req.params;
      const integrations = await storage.getChatbotDataIntegrations(configId);
      
      // 각 integration에 대해 데이터 소스 정보를 포함하여 반환
      const integrationsWithDataSource = await Promise.all(
        integrations.map(async (integration: any) => {
          try {
            const dataSource = await storage.getDataSource(integration.dataSourceId);
            return {
              ...integration,
              dataSourceName: dataSource?.name || 'Unknown Data Source',
              dataSourceType: dataSource?.type || 'Unknown Type'
            };
          } catch (error) {
            console.error(`Failed to get data source for integration ${integration.id}:`, error);
            return {
              ...integration,
              dataSourceName: 'Unknown Data Source',
              dataSourceType: 'Unknown Type'
            };
          }
        })
      );
      
      res.json(integrationsWithDataSource);
    } catch (error) {
      console.error('Error fetching chatbot data integrations:', error);
      res.status(500).json({ error: "데이터 통합 조회에 실패했습니다" });
    }
  });

  app.post("/api/chatbot-data-integrations", async (req, res) => {
    try {
      const integration = await storage.createChatbotDataIntegration(req.body);
      res.status(201).json(integration);
    } catch (error) {
      console.error('Error creating chatbot data integration:', error);
      res.status(500).json({ error: "데이터 통합 생성에 실패했습니다" });
    }
  });

  app.delete("/api/chatbot-data-integrations/:configId/:dataSourceId", async (req, res) => {
    try {
      const { configId, dataSourceId } = req.params;
      await storage.deleteChatbotDataIntegration(configId, dataSourceId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting chatbot data integration:', error);
      res.status(500).json({ error: "데이터 통합 삭제에 실패했습니다" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}