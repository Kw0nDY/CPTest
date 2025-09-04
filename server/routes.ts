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

      console.log(`🔍 AI 모델 ${configId}의 연결된 데이터 소스:`, connectedDataSources.length);
      console.log(`📝 사용자 원본 메시지: "${message}"`);
      console.log(`📝 사용자 메시지 길이: ${message.length}자`);

      // 1단계: Data Integration에서 연결된 데이터 소스 수집
      for (const integration of connectedDataSources) {
        try {
          const dataSource = await storage.getDataSource(integration.dataSourceId);
          if (dataSource?.config?.sampleData) {
            console.log(`📊 데이터 소스 "${dataSource.name}" 처리 중...`);
            
            if (typeof dataSource.config.sampleData === 'object') {
              for (const [tableName, records] of Object.entries(dataSource.config.sampleData)) {
                if (Array.isArray(records)) {
                  allUploadedData.push(...records);
                  console.log(`✅ 테이블 "${tableName}"에서 ${records.length}개 레코드 추가`);
                }
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
          // 🔒 각 AI 모델마다 고유한 격리된 chatflowId 사용
          const isolatedChatflowId = `${config?.chatflowId}-${configId}`;
          
          console.log(`🚀 AI에게 전달하는 질문: "${message}"`);
          console.log(`📊 전달하는 데이터 개수: ${allUploadedData.length}개`);
          console.log(`🔒 격리된 chatflowId: ${isolatedChatflowId}`);
          
          const response = await fetch(`http://220.118.23.185:3000/api/v1/prediction/${isolatedChatflowId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              question: message,
              overrideConfig: {
                chatData: allUploadedData,
                modelId: configId // 추가 격리 식별자
              }
            })
          });
          
          const aiResult = await response.json();
          const aiResponse = aiResult.text || '응답을 생성할 수 없습니다.';
        
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