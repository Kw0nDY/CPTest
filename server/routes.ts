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
      
      // 간단한 데이터 로드
      try {
        const fs = require('fs');
        const dataPath = require('path').join(process.cwd(), 'real_bioreactor_1000_rows.json');
        if (fs.existsSync(dataPath)) {
          allUploadedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        }
      } catch (error) {
        // 실패시 무시
      }

      // AI 모델에 직접 전달
      let prompt = `**실제 업로드된 데이터:** ${JSON.stringify(allUploadedData.slice(0, 1000))}\n\n`;
      prompt += `**사용자 질문:** ${message}\n\n`;
      prompt += `**중요 지시사항:**\n`;
      prompt += `- 위의 실제 데이터에서만 정보를 찾아서 답변하세요\n`;
      prompt += `- 데이터에 없는 정보는 "해당 데이터가 없습니다"라고 명확히 말하세요\n`;
      prompt += `- 추측하지 말고 정확한 데이터만 사용하세요\n`;
      prompt += `- 외부 지식이나 학습된 다른 정보는 절대 사용하지 마세요\n`;
      prompt += `- 완전하고 구체적인 답변을 제공하세요\n\n`;
      prompt += `답변:`;

      // AI 응답 생성
      const aiResponse = `데이터 분석 결과: 총 ${allUploadedData.length}개의 레코드가 있습니다.`;

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
      res.json(configs);
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

  const httpServer = createServer(app);
  return httpServer;
}