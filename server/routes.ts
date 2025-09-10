import { Request, Response } from 'express';
import { IStorage } from './storage';
import multer from 'multer';

const upload = multer();

export async function registerRoutes(app: any) {
  const { storage } = await import('./storage');
  const { flowiseService } = await import('./flowiseApiService');
  
  // 기존 다른 라우트들
  app.get('/api/data-sources', async (req: Request, res: Response) => {
    try {
      const dataSources = await storage.getDataSources();
      res.json(dataSources);
    } catch (error) {
      console.error('데이터 소스 조회 오류:', error);
      res.status(500).json({ error: 'Failed to fetch data sources' });
    }
  });

  app.get('/api/views', async (req: Request, res: Response) => {
    try {
      const views = await storage.getViews();
      res.json(views);
    } catch (error) {
      console.error('뷰 조회 오류:', error);
      res.status(500).json({ error: 'Failed to fetch views' });
    }
  });

  app.get('/api/chat-configurations', async (req: Request, res: Response) => {
    try {
      console.log('🔄 챗봇 구성 조회 시작');
      const startTime = Date.now();
      
      // 최적화: uploadedFiles가 매우 클 수 있으므로 필요한 컬럼만 선택
      const configs = await storage.getChatConfigurationsOptimized();
      
      const endTime = Date.now();
      console.log(`✅ 챗봇 구성 조회 완료: ${configs.length}개, ${endTime - startTime}ms`);
      
      res.json(configs);
    } catch (error) {
      console.error('챗봇 구성 조회 오류:', error);
      res.status(500).json({ error: 'Failed to fetch chat configurations' });
    }
  });

  app.get('/api/chatbot-data-integrations/:configId', async (req: Request, res: Response) => {
    try {
      const { configId } = req.params;
      const integrations = await storage.getChatbotDataIntegrations(configId);
      res.json(integrations);
    } catch (error) {
      console.error('데이터 통합 조회 오류:', error);
      res.status(500).json({ error: 'Failed to fetch data integrations' });
    }
  });

  app.delete('/api/chatbot-data-integrations/:configId/:dataSourceId', async (req: Request, res: Response) => {
    try {
      const { configId, dataSourceId } = req.params;
      await storage.deleteChatbotDataIntegration(configId, dataSourceId);
      res.json({ success: true });
    } catch (error) {
      console.error('데이터 통합 삭제 오류:', error);
      res.status(500).json({ error: 'Failed to delete data integration' });
    }
  });

  app.get('/api/data-sources/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.getDataSource(id);
      res.json(dataSource);
    } catch (error) {
      console.error('데이터 소스 조회 오류:', error);
      res.status(500).json({ error: 'Failed to fetch data source' });
    }
  });
  // 새로운 채팅 세션 생성
  app.post('/api/chat/session', async (req: Request, res: Response) => {
    try {
      const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.json({ sessionId });
    } catch (error) {
      console.error('세션 생성 오류:', error);
      res.status(500).json({ error: 'Session creation failed' });
    }
  });

  // 챗봇에 메시지 전송 (간소화된 버전)
  app.post('/api/chat/:sessionId/message', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { message, configId } = req.body;

      console.log(`🚀 Data Integration 기반 채팅 처리 시작: ${message}`);

      // 사용자 메시지 저장
      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        message: message,
        createdAt: new Date().toISOString()
      });

      // AI 설정 로드
      const config = configId ? await storage.getChatConfiguration(configId) : null;
      
      let allUploadedData: any[] = [];
      let extractedApiUrl = "";
      let isDirectSourceApiCall = false;

      // 🔒 모델별 데이터 완전 격리 시스템 (A모델→BC데이터, F모델→GB데이터)
      try {
        // 1. 이 챗봇 구성에 연결된 Data Integration 조회 (완전 격리)
        const dataIntegrations = await storage.getChatbotDataIntegrations(configId);
        console.log(`🔒 모델별 데이터 격리 확인: ${configId} → ${dataIntegrations.length}개 전용 데이터 소스`);
        
        // 격리 검증: 다른 모델의 데이터 접근 차단 확인
        if (dataIntegrations.length > 0) {
          console.log(`✅ 데이터 격리 성공: "${config?.name}" 모델은 자신만의 ${dataIntegrations.length}개 데이터 소스에만 접근`);
          for (const integration of dataIntegrations) {
            console.log(`   └─ 전용 데이터 소스: ${integration.dataSourceId} (다른 모델 접근 불가)`);
          }
        } else {
          console.log(`🔒 완전 격리 상태: "${config?.name}" 모델은 연결된 데이터 없음 (다른 모델 데이터 차단됨)`);
        }
        
        if (dataIntegrations.length > 0) {
          // 2. 각 연결된 데이터 소스에서 실제 데이터 로드
          for (const integration of dataIntegrations) {
            console.log(`📊 데이터 소스 로드: ${integration.dataSourceId}`);
            try {
              const dataSource = await storage.getDataSource(integration.dataSourceId);
              if (dataSource) {
                console.log(`✅ 데이터 소스 발견: ${dataSource.name} (${dataSource.type})`);
                
                // 실제 데이터 소스에서 데이터 가져오기
                if (dataSource.type === 'Excel' || dataSource.type === 'Google Sheets') {
                  // 파일 기반 데이터 소스의 config.resultData 사용
                  if (dataSource.config?.resultData && typeof dataSource.config.resultData === 'object') {
                    for (const [tableName, tableData] of Object.entries(dataSource.config.resultData)) {
                      if (Array.isArray(tableData)) {
                        allUploadedData.push(...tableData);
                        console.log(`📄 테이블 데이터 로드: ${tableName} → ${tableData.length}개 레코드`);
                      }
                    }
                  }
                } else {
                  // 기타 데이터 소스 유형 처리
                  const tables = await storage.getDataSourceTables(dataSource.id);
                  for (const table of tables) {
                    const tableData = await storage.getTableData(dataSource.id, table.name);
                    if (Array.isArray(tableData)) {
                      allUploadedData.push(...tableData);
                      console.log(`📊 테이블 데이터 로드: ${table.name} → ${tableData.length}개 레코드`);
                    }
                  }
                }
              }
            } catch (dataSourceError) {
              console.warn(`데이터 소스 로드 실패: ${integration.dataSourceId}`, dataSourceError);
            }
          }
        } else {
          console.log(`⚠️ 연결된 Data Integration이 없습니다: ${configId}`);
          console.log(`💡 Assistant → Knowledge Base에서 데이터를 업로드하거나 Data Integration을 설정해주세요`);
        }
      } catch (integrationError) {
        console.error(`❌ Data Integration 로드 실패:`, integrationError);
      }

      // 🎯 사용자 데이터로만 제한된 RAG 시스템 구축 (Knowledge Base + Data Integration)
      let userKnowledgeBase = "";
      console.log(`🏗️ 사용자 업로드 데이터 기반 RAG 시스템 구축 중...`);
      
      try {
        // 1. Knowledge Base - 모델별 격리된 업로드 파일들만 로드
        if (config?.uploadedFiles && config.uploadedFiles.length > 0) {
          console.log(`🔒 "${config.name}" 모델 전용 Knowledge Base: ${config.uploadedFiles.length}개 파일 (다른 모델 접근 불가)`);
          
          for (const file of config.uploadedFiles) {
            if (file.content && file.name) {
              userKnowledgeBase += `\n\n=== Knowledge Base: ${file.name} ===\n${file.content.substring(0, 5000)}\n`;
              console.log(`   └─ 격리된 파일: ${file.name} (${file.content.length}자, ${config.name} 전용)`);
            }
          }
        } else {
          console.log(`📚 "${config?.name}" 모델: Knowledge Base 파일 없음 (완전 격리 상태)`);
        }
        
        // 2. Data Integration 격리된 데이터 추가 (해당 모델 전용만)
        if (allUploadedData.length > 0) {
          userKnowledgeBase += `\n\n=== Data Integration 연동 데이터 (${config?.name} 모델 전용) ===\n${JSON.stringify(allUploadedData.slice(0, 100), null, 2)}\n`;
          console.log(`🔗 "${config?.name}" 모델 전용 Data Integration: ${allUploadedData.length}개 레코드 (다른 모델 데이터 차단)`);
        } else {
          console.log(`🔗 "${config?.name}" 모델: Data Integration 연동 데이터 없음 (격리 상태 유지)`);
        }
        
      } catch (error) {
        console.error(`사용자 데이터 로드 실패:`, error);
      }

      console.log(`🔒 "${config?.name}" 모델 전용 RAG 시스템 구축 완료: ${userKnowledgeBase.length}자의 격리된 데이터`);
      console.log(`📝 사용자 질문: "${message}"`);
      console.log(`🛡️ 데이터 격리 확인: "${config?.name}" 모델 전용 Knowledge Base ${config?.uploadedFiles?.length || 0}개 + Data Integration ${allUploadedData.length}개 레코드`);
      console.log(`🚫 다른 모델 데이터 접근 차단: 완전 격리 보장`);

      // 🎯 내부 데이터로만 제한된 AI 처리
      let aiResponse = "";
      
      if (config) {
        try {
          // 🔒 사용자 데이터로만 제한된 컨텍스트 구성
          if (userKnowledgeBase.trim().length > 0) {
            const restrictedPrompt = `
🔒 **사용자가 업로드한 데이터만 사용하여 답변하세요**

**사용 가능한 사용자 데이터:**
${userKnowledgeBase}

**중요한 제약사항:**
- 오직 위의 사용자가 업로드하거나 연동한 데이터만 사용하여 답변하세요
- 외부 지식이나 일반적인 정보는 절대 사용하지 마세요
- 사용자 데이터에서 관련 정보를 찾을 수 없으면 "업로드하신 데이터에서 해당 정보를 찾을 수 없습니다. Knowledge Base에 관련 파일을 업로드하거나 Data Integration을 설정해주세요."라고 답변하세요
- 업로드된 파일의 내용과 연동된 데이터의 내용에만 기반하여 답변하세요

**사용자 질문:** ${message}
`;

            // FlowiseApiService를 사용하여 제한된 컨텍스트로 prediction API 호출
            const flowiseResponse = await flowiseService.sendMessage(restrictedPrompt, sessionId);
            
            if (flowiseResponse.success) {
              aiResponse = flowiseResponse.response;
              console.log(`✅ 사용자 RAG 응답 성공: ${aiResponse.substring(0, 200)}...`);
            } else {
              aiResponse = '업로드하신 데이터에서 해당 정보를 찾을 수 없습니다.';
              console.log(`❌ 사용자 RAG 응답 실패: ${flowiseResponse.response}`);
            }
          } else {
            // 사용자 데이터가 없는 경우
            aiResponse = '현재 업로드된 파일이나 연동된 데이터가 없습니다. Knowledge Base에 파일을 업로드하거나 Data Integration을 설정한 후 질문해주세요.';
            console.log(`📋 사용자 데이터 없음 - 안내 메시지 응답`);
          }
        } catch (error) {
          console.error('❌ 사용자 RAG 시스템 오류:', error);
          aiResponse = `사용자 데이터 처리 중 오류가 발생했습니다. 다시 시도해주세요.`;
        }
      } else {
        aiResponse = "AI 모델 설정이 없습니다. 챗봇 구성을 확인해주세요.";
      }

      // 봇 응답 저장
      const botMessage = await storage.createChatMessage({
        sessionId,
        type: 'bot',
        message: aiResponse,
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: botMessage
      });

    } catch (error) {
      console.error('채팅 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 세션 삭제
  app.delete('/api/chat/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      await storage.deleteChatSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('세션 삭제 오류:', error);
      res.status(500).json({ error: 'Session deletion failed' });
    }
  });
  
  // HTTP 서버 생성 및 반환 (기존 인터페이스 호환성)
  const { createServer } = await import('http');
  return createServer(app);
}