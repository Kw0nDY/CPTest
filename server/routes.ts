import { Request, Response } from 'express';
import { IStorage } from './storage';
import multer from 'multer';

const upload = multer();

export async function registerRoutes(app: any) {
  const { storage } = await import('./storage');
  
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
      const configs = await storage.getChatConfigurations();
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

      console.log(`🚀 간소화된 채팅 처리 시작: ${message}`);

      // 사용자 메시지 저장
      const userMessage = await storage.createChatMessage({
        sessionId,
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // AI 설정 로드
      const config = configId ? await storage.getChatConfiguration(configId) : null;
      
      let allUploadedData: any[] = [];
      let extractedApiUrl = "";
      let isDirectSourceApiCall = false;

      // 업로드된 파일 간단 처리
      if (config?.uploadedFiles) {
        console.log(`🔍 업로드된 파일 확인: ${config.uploadedFiles.length}개`);
        
        for (const file of config.uploadedFiles) {
          console.log(`📄 파일 체크: ${file.name}, type: ${file.type}`);
          
          // 소스 파일에서 API URL 추출
          if (file.type === 'source_code' && file.content) {
            console.log(`🔍 소스 파일 확인: ${file.name}`);
            
            if (file.content.includes('vector/upsert')) {
              const match = file.content.match(/['"`]([^'"`]*vector\/upsert[^'"`]*)['"`]/);
              if (match) {
                extractedApiUrl = match[1];
                isDirectSourceApiCall = true;
                console.log(`✅ 소스 파일에서 API URL 추출: ${extractedApiUrl}`);
              }
            }
          }
          
          // CSV 파일 데이터 추출
          if (file.type === 'csv' && file.content) {
            console.log(`📄 CSV 파일 데이터 처리: ${file.name}`);
            try {
              const lines = file.content.split('\n').filter(line => line.trim());
              if (lines.length > 1) {
                const headers = lines[0].split(',').map(h => h.trim());
                const dataRows = lines.slice(1, 101).map(line => { // 최대 100행만
                  const values = line.split(',');
                  const row: any = {};
                  headers.forEach((header, idx) => {
                    row[header] = values[idx]?.trim() || '';
                  });
                  return row;
                });
                allUploadedData.push(...dataRows);
                console.log(`✅ CSV 데이터 로드: ${file.name} → ${dataRows.length}개 레코드`);
              }
            } catch (csvError) {
              console.warn(`CSV 처리 실패: ${file.name}`, csvError);
            }
          }
        }
      }

      // config에서 API URL 설정 (소스 파일에서 찾지 못한 경우)
      if (!isDirectSourceApiCall && config?.chatflowId) {
        extractedApiUrl = `http://220.118.23.185:3000/api/v1/vector/upsert/${config.chatflowId}`;
        isDirectSourceApiCall = true;
        console.log(`✅ config에서 vector/upsert API 구성: ${config.chatflowId} → ${extractedApiUrl}`);
      }

      console.log(`⚡ 간단한 API 호출 모드 - 업로드된 데이터: ${allUploadedData.length}개 레코드`);
      console.log(`🚀 바로 AI API 호출 시작`);

      // AI 처리
      let aiResponse = "";
      
      if (config) {
        try {
          console.log(`🚀 API 직접 호출: ${extractedApiUrl}`);
          console.log(`📝 원본 질문: "${message}"`);
          console.log(`📊 전달할 데이터: ${allUploadedData.length}개 레코드`);
          
          if (isDirectSourceApiCall && extractedApiUrl) {
            // FormData 생성
            const FormData = (await import('form-data')).default;
            const formData = new FormData();
            
            // 업로드된 데이터를 CSV로 변환
            if (allUploadedData.length > 0) {
              const firstItem = allUploadedData[0];
              const columns = Object.keys(firstItem);
              
              const csvHeader = columns.join(',');
              const csvRows = allUploadedData.map(item => 
                columns.map(col => (item[col] || '').toString().replace(/,/g, ';')).join(',')
              );
              const csvContent = [csvHeader, ...csvRows].join('\n');
              
              formData.append('files', Buffer.from(csvContent), {
                filename: 'uploaded_data.csv',
                contentType: 'text/csv'
              });
              
              console.log(`📎 CSV 파일 생성: ${csvRows.length}행, 컬럼: ${columns.join(', ')}`);
            }
            
            // 메타데이터 추가
            formData.append('columnName', 'data');
            formData.append('metadata', JSON.stringify({ 
              userQuestion: message, 
              dataCount: allUploadedData.length 
            }));

            const response = await fetch(extractedApiUrl, {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              const apiResult = await response.json();
              console.log(`✅ API 응답:`, apiResult);
              
              aiResponse = apiResult.text || apiResult.message || apiResult.result || 
                         `데이터가 성공적으로 업로드되었습니다. ${allUploadedData.length}개의 레코드가 벡터 데이터베이스에 저장되었습니다.`;
              console.log(`📋 최종 응답: ${aiResponse.substring(0, 200)}...`);
            } else {
              throw new Error(`API 호출 실패: ${response.status}`);
            }
          } else {
            aiResponse = `질문을 받았습니다: "${message}"\n\n현재 분석할 데이터: ${allUploadedData.length}개 레코드`;
          }
        } catch (error) {
          console.error('❌ API 호출 실패:', error);
          aiResponse = `죄송합니다. "${message}"에 대한 처리 중 오류가 발생했습니다. 다시 시도해주세요.`;
        }
      } else {
        aiResponse = "AI 모델 설정이 없습니다. 챗봇 구성을 확인해주세요.";
      }

      // 봇 응답 저장
      const botMessage = await storage.createChatMessage({
        sessionId,
        sender: 'bot',
        content: aiResponse,
        timestamp: new Date().toISOString()
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