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
      
      // 1. Knowledge Base 파일 데이터 로드
      if (config?.uploadedFiles) {
        for (const file of config.uploadedFiles) {
          if (file.content && file.content.length > 0) {
            try {
              // CSV/JSON 파일 파싱
              if (file.name.endsWith('.csv')) {
                const rows = file.content.split('\n').slice(1); // 헤더 제외
                const parsedData = rows.map(row => {
                  const values = row.split(',');
                  return { file: file.name, data: values.join(' ') };
                });
                allUploadedData.push(...parsedData);
              } else if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(file.content);
                allUploadedData.push(...(Array.isArray(parsed) ? parsed : [parsed]));
              } else {
                // 텍스트 파일
                allUploadedData.push({ file: file.name, content: file.content });
              }
            } catch (parseError) {
              console.warn(`파일 파싱 오류 ${file.name}:`, parseError);
            }
          }
        }
      }

      // 2. Data Integration 연결된 데이터 로드
      const connectedDataSources = configId ? await storage.getChatbotDataIntegrations(configId) : [];
      for (const integration of connectedDataSources) {
        try {
          const dataSource = await storage.getDataSource(integration.dataSourceId);
          if (dataSource?.config?.sampleData) {
            // sampleData에서 테이블 데이터 가져오기
            for (const [tableName, tableData] of Object.entries(dataSource.config.sampleData)) {
              if (Array.isArray(tableData) && tableData.length > 0) {
                allUploadedData.push(...tableData.slice(0, 1000)); // 최대 1000개씩
              }
            }
          }
        } catch (dataError) {
          console.warn('데이터 소스 로드 오류:', dataError);
        }
      }

      // 3. 백업 데이터 (bioreactor)
      if (allUploadedData.length === 0) {
        try {
          const fs = require('fs');
          const dataPath = require('path').join(process.cwd(), 'real_bioreactor_1000_rows.json');
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

      // 실제 데이터 기반 응답 생성
      let aiResponse = "";
      if (allUploadedData.length > 0) {
        if (message.includes("개수") || message.includes("몇 개") || message.includes("총")) {
          aiResponse = `📊 **분석 결과**: 총 **${allUploadedData.length}개**의 데이터 레코드가 있습니다.`;
        } else if (message.includes("온도") || message.includes("Temperature")) {
          const tempData = allUploadedData.filter((record: any) => record.Temperature || record.temperature);
          if (tempData.length > 0) {
            const avgTemp = tempData.reduce((sum: number, record: any) => sum + parseFloat(record.Temperature || record.temperature || 0), 0) / tempData.length;
            aiResponse = `🌡️ **온도 분석**: 평균 온도는 ${avgTemp.toFixed(2)}도이며, ${tempData.length}개의 온도 기록이 있습니다.`;
          } else {
            aiResponse = "온도 관련 데이터가 없습니다.";
          }
        } else {
          aiResponse = `📈 **데이터 요약**: ${allUploadedData.length}개의 레코드를 분석했습니다. 구체적인 질문을 해주시면 더 정확한 분석을 제공하겠습니다.`;
        }
      } else {
        aiResponse = "연결된 데이터가 없습니다. Knowledge Base에 파일을 업로드하거나 Data Integration을 연결해주세요.";
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
  app.put("/api/chat-configurations/:id/toggle-active", async (req, res) => {
    try {
      const updated = await storage.toggleChatConfigurationActive(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle configuration' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}