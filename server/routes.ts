import express from "express";
import multer from "multer";
import { storage } from "./storage";
import { createDataSourceSchema, updateDataSourceSchema } from "@shared/schema";
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

      // 3단계: 업로드된 데이터에서 직접 검색
      if (allUploadedData.length > 0) {
        let answer = "";
        
        // ID 기반 검색
        const idMatch = message.match(/[Ii]d\s*(?:가\s*)?(\d+)/);
        if (idMatch) {
          const targetId = parseInt(idMatch[1]);
          const record = allUploadedData.find(item => item.Id == targetId);
          
          if (record) {
            if (message.includes('TimeStamp')) {
              answer = `ID ${targetId}의 TimeStamp: ${record.TimeStamp}`;
            } else {
              answer = `ID ${targetId}의 상세 정보:\n\n`;
              if (record['Asset Name']) answer += `🏭 Asset Name: ${record['Asset Name']}\n`;
              if (record.TimeStamp) answer += `⏰ TimeStamp: ${record.TimeStamp}\n`;
              if (record.Level) answer += `📊 Level: ${record.Level}\n`;
              if (record.Temperature) answer += `🌡️ Temperature: ${record.Temperature}\n`;
              if (record.Agitation) answer += `⚡ Agitation: ${record.Agitation}\n`;
              if (record.OEE) answer += `📈 OEE: ${record.OEE}\n`;
              if (record.Pressure) answer += `💨 Pressure: ${record.Pressure}\n`;
              if (record.Phase) answer += `🔄 Phase: ${record.Phase}`;
            }
          } else {
            answer = `❌ ID ${targetId}를 데이터에서 찾을 수 없습니다.`;
          }
        }
        // OEE 기반 검색  
        else if (message.includes('OEE')) {
          const oeeValue = message.match(/([\d.]+)/)?.[0];
          if (oeeValue) {
            const record = allUploadedData.find(item => item.OEE && Math.abs(parseFloat(item.OEE) - parseFloat(oeeValue)) < 0.001);
            if (record) {
              answer = `OEE ${oeeValue}인 데이터 정보:\n\n`;
              answer += `🆔 ID: ${record.Id}\n`;
              if (record['Asset Name']) answer += `🏭 Asset Name: ${record['Asset Name']}\n`;
              if (record.TimeStamp) answer += `⏰ TimeStamp: ${record.TimeStamp}\n`;
              if (record.Level) answer += `📊 Level: ${record.Level}\n`;
              if (record.Temperature) answer += `🌡️ Temperature: ${record.Temperature}\n`;
              if (record.Agitation) answer += `⚡ Agitation: ${record.Agitation}`;
            } else {
              answer = `❌ OEE ${oeeValue}인 데이터를 찾을 수 없습니다.`;
            }
          }
        }
        // Agitation 기반 검색
        else if (message.includes('Agitation')) {
          const agitationValue = message.match(/([\d.]+)/)?.[0];
          if (agitationValue) {
            const record = allUploadedData.find(item => item.Agitation && Math.abs(parseFloat(item.Agitation) - parseFloat(agitationValue)) < 0.001);
            if (record) {
              answer = `Agitation ${agitationValue}인 데이터: ID ${record.Id}`;
            } else {
              answer = `❌ Agitation ${agitationValue}인 데이터를 찾을 수 없습니다.`;
            }
          }
        }
        // Target Production Rate 검색
        else if (message.includes('Target Production Rate') && message.includes('Running')) {
          const count = allUploadedData.filter(item => item['Target Production Rate'] === 'Running').length;
          answer = `Target Production Rate가 'Running'인 데이터: ${count}개`;
        }
        // 기본 데이터 샘플 제공
        else {
          const sampleRecord = allUploadedData[0];
          answer = `📋 업로드된 데이터 샘플 (총 ${allUploadedData.length}개 레코드):\n\n`;
          if (sampleRecord.Id) answer += `🆔 ID: ${sampleRecord.Id}\n`;
          if (sampleRecord['Asset Name']) answer += `🏭 Asset Name: ${sampleRecord['Asset Name']}\n`;
          if (sampleRecord.TimeStamp) answer += `⏰ TimeStamp: ${sampleRecord.TimeStamp}\n`;
          answer += `\n💡 특정 ID 조회: "ID 96의 정보 알려줘"\n`;
          answer += `💡 OEE 조회: "OEE가 63.5인 데이터"\n`;
          answer += `💡 Agitation 조회: "Agitation이 105인 ID"`;
        }
        
        console.log('✅ 직접 검색 결과:', answer.substring(0, 100) + '...');
        
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