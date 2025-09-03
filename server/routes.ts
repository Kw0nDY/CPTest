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

      console.log(`🔒 데이터 격리 모드: 외부 API 없음, 업로드된 데이터만 사용`);

      // 사용자 메시지 저장
      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        message: message.trim(),
        createdAt: new Date().toISOString()
      });

      // 연결된 데이터 소스 확인
      let allUploadedData = [];
      const connectedDataSources = configId ? await storage.getChatbotDataIntegrations(configId) : [];
      const config = configId ? await storage.getChatConfiguration(configId) : null;

      console.log(`📂 ${connectedDataSources.length}개 연결된 데이터 소스 로딩 중...`);

      // 1단계: 연결된 데이터 소스에서 데이터 수집
      for (const integration of connectedDataSources) {
        try {
          const dataSource = await storage.getDataSource(integration.dataSourceId);
          if (dataSource?.config?.sampleData) {
            console.log(`✅ ${dataSource.name} 데이터 로딩`);
            
            if (typeof dataSource.config.sampleData === 'object') {
              for (const [tableName, records] of Object.entries(dataSource.config.sampleData)) {
                if (Array.isArray(records)) {
                  allUploadedData.push(...records);
                  console.log(`   → ${tableName}: ${records.length}개 레코드`);
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
        console.log(`📋 ${config.uploadedFiles.length}개 Knowledge Base 파일 로딩 중...`);
        
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
                  console.log(`✅ ${file.name}: ${fileData.length}개 레코드`);
                } else if (typeof fileData === 'object') {
                  for (const [tableName, records] of Object.entries(fileData)) {
                    if (Array.isArray(records)) {
                      allUploadedData.push(...records);
                      console.log(`✅ ${file.name} - ${tableName}: ${records.length}개 레코드`);
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

      console.log(`📊 총 로딩된 데이터: ${allUploadedData.length}개 레코드`);

      // 3단계: 업로드된 데이터 기반 AI 응답 생성
      if (allUploadedData.length > 0) {
        // 업로드된 데이터를 맥락으로 제공하여 자연스러운 AI 응답 생성
        const dataContext = allUploadedData.slice(0, 10); // 처음 10개 레코드만 사용
        const systemPrompt = config?.systemPrompt || "업로드된 데이터를 기반으로 정확한 답변을 제공하세요.";
        
        // 사용자 질문에 맞는 관련 데이터 검색
        const relevantData = allUploadedData.filter(record => {
          const recordText = Object.values(record).join(' ').toLowerCase();
          return recordText.includes(message.toLowerCase()) || 
                 message.toLowerCase().split(' ').some(word => recordText.includes(word));
        });
        
        let answer = "";
        
        if (relevantData.length > 0) {
          // 관련 데이터가 있는 경우
          const contextData = relevantData.slice(0, 5); // 최대 5개 레코드
          answer = `${message}에 대한 답변:\n\n`;
          
          contextData.forEach((record, index) => {
            answer += `📊 레코드 ${index + 1}:\n`;
            Object.entries(record).forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== '') {
                answer += `  • ${key}: ${value}\n`;
              }
            });
            answer += '\n';
          });
          
          if (relevantData.length > 5) {
            answer += `📈 총 ${relevantData.length}개의 관련 데이터가 있습니다.\n`;
          }
        } else {
          // 관련 데이터가 없는 경우 전체 데이터 요약
          const totalRecords = allUploadedData.length;
          const sampleRecord = allUploadedData[0];
          
          answer = `업로드된 데이터에서 '${message}'에 직접적으로 관련된 정보를 찾을 수 없습니다.\n\n`;
          answer += `📊 전체 데이터 개요:\n`;
          answer += `  • 총 레코드 수: ${totalRecords}개\n`;
          answer += `  • 데이터 필드: ${Object.keys(sampleRecord).join(', ')}\n\n`;
          answer += `💡 더 구체적인 질문을 해주시면 정확한 정보를 찾아드리겠습니다.`;
        }
        
        console.log(`✅ 데이터 기반 응답 생성 완료 (관련 데이터: ${relevantData.length}개)`);
        
        const botMessage = await storage.createChatMessage({
          sessionId,
          type: 'bot', 
          message: answer,
          createdAt: new Date().toISOString()
        });
        
        return res.json({
          userMessage: userMessage,
          botMessage: botMessage
        });
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
      res.json(integrations);
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