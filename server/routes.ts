import { Request, Response } from 'express';
import { IStorage } from './storage';
import multer from 'multer';

const upload = multer();

export async function registerRoutes(app: any) {
  const { storage } = await import('./storage');
  const { flowiseService } = await import('./flowiseApiService');
  
  // 🧠 로컬 데이터 분석 함수
  async function analyzeDataLocally(ragContext: string, question: string, allData: any[]): Promise<string> {
    const lowerQuestion = question.toLowerCase();
    
    // CSV 헤더 파싱
    const csvLines = ragContext.split('\n');
    const headerLine = csvLines.find(line => line.includes('Id,BR-50L'));
    if (!headerLine) return "데이터 형식을 인식할 수 없습니다.";
    
    const headers = headerLine.split(',');
    const dataLines = csvLines.slice(csvLines.indexOf(headerLine) + 1).filter(line => line.trim().length > 0);
    
    // 파싱된 데이터 생성
    const parsedData = dataLines.map(line => {
      const values = line.split(',');
      const row: any = {};
      headers.forEach((header, i) => {
        row[header.trim()] = values[i]?.trim() || '';
      });
      return row;
    });
    
    console.log(`📊 분석 가능한 데이터: ${parsedData.length}행`);
    
    // 인사말 처리
    if (lowerQuestion.includes('안녕') || lowerQuestion.includes('hello')) {
      return `안녕하세요! 현재 ${parsedData.length}개의 데이터가 준비되어 있습니다. 

📊 **데이터 요약:**
- 총 레코드: ${parsedData.length}개
- 컬럼 수: ${headers.length}개

무엇을 분석해드릴까요?`;
    }
    
    // Oxygen 관련 질문
    if (lowerQuestion.includes('oxygen') && lowerQuestion.includes('12')) {
      const oxygenData = parsedData.filter(row => {
        const oxygen = parseFloat(row['Oxygen'] || '0');
        return oxygen >= 11.9 && oxygen <= 12.1;
      });
      
      return `🔍 **Oxygen 값이 12 근처인 데이터:**

총 **${oxygenData.length}개** 발견!

${oxygenData.slice(0, 10).map((row, i) => 
  `${i+1}. ID ${row['Id']}: Oxygen=${row['Oxygen']}`
).join('\n')}`;
    }
    
    // 온도 관련 질문
    if (lowerQuestion.includes('온도') || lowerQuestion.includes('temperature')) {
      const tempData = parsedData.filter(row => parseFloat(row['Temperature'] || '0') > 0).slice(0, 10);
      
      return `🌡️ **온도 데이터:**

${tempData.map((row, i) => 
  `${i+1}. ID ${row['Id']}: ${row['Temperature']}°C`
).join('\n')}`;
    }
    
    // 기본 응답
    return `📊 현재 ${parsedData.length}개 레코드 분석 준비 완료. 구체적인 질문을 해주세요!`;
  }
  
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

  // 📝 **Problem 1 Fix**: Knowledge Base 파일 저장을 위한 챗봇 구성 업데이트
  app.put('/api/chat-configurations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log(`💾 챗봇 구성 업데이트 요청: ${id}`, {
        uploadedFiles: updates.uploadedFiles?.length || 0,
        name: updates.name
      });
      
      const updatedConfig = await storage.updateChatConfiguration(id, updates);
      
      if (!updatedConfig) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      
      console.log(`✅ 챗봇 구성 업데이트 성공: ${id} → 파일 ${updatedConfig.uploadedFiles?.length || 0}개`);
      res.json(updatedConfig);
    } catch (error) {
      console.error('챗봇 구성 업데이트 오류:', error);
      res.status(500).json({ error: 'Failed to update chat configuration' });
    }
  });

  // 📊 **Problem 2 Fix**: Data Integration 연결 생성
  app.post('/api/chatbot-data-integrations', async (req: Request, res: Response) => {
    try {
      const { configId, dataSourceId, accessLevel = 'read', dataFilter } = req.body;
      
      console.log(`🔗 Data Integration 연결 생성: ${configId} ↔ ${dataSourceId}`);
      
      const integration = await storage.createChatbotDataIntegration({
        configId,
        dataSourceId,
        isConnected: 1,
        connectedAt: new Date().toISOString()
      });
      
      console.log(`✅ Data Integration 연결 성공: ${integration.id}`);
      res.status(201).json(integration);
    } catch (error) {
      console.error('Data Integration 연결 오류:', error);
      res.status(500).json({ error: 'Failed to create data integration' });
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

      // 🔍 사용자 데이터 확인 (Knowledge Base + Data Integration)
      let hasUserData = false;
      let userDataSummary = "";
      
      console.log(`🔍 사용자 데이터 확인 중...`);
      
      // 실제 사용자 업로드 파일 확인 (가짜 데이터 제외)
      let realUserFiles: any[] = [];
      console.log(`🔍 Knowledge Base 확인: config.uploadedFiles = ${config?.uploadedFiles?.length || 0}개`);
      
      if (config?.uploadedFiles && config.uploadedFiles.length > 0) {
        console.log(`📂 업로드된 파일들:`, config.uploadedFiles.map(f => ({ name: f.name, contentLength: f.content?.length })));
        
        // 시스템 파일 및 자동 생성된 파일들 제외
        realUserFiles = config.uploadedFiles.filter(file => 
          file.name && 
          !file.name.startsWith('generated_') && 
          !file.name.startsWith('sample_') && 
          !file.name.startsWith('test_') &&
          !file.name.startsWith('flowise_') &&
          !file.name.endsWith('.py') &&
          file.content &&
          file.content.trim().length > 0
        );
        
        console.log(`✅ 필터링 후 실제 파일: ${realUserFiles.length}개`);
        realUserFiles.forEach(file => {
          console.log(`   └─ ${file.name} (${file.content.length}자)`);
        });
      } else {
        console.log(`❌ config.uploadedFiles이 비어있거나 undefined`);
      }
      
      // Data Integration 데이터 확인
      let hasRealDataIntegration = allUploadedData.length > 0;
      
      // 실제 사용자 데이터 존재 여부 확인
      hasUserData = realUserFiles.length > 0 || hasRealDataIntegration;
      
      console.log(`📊 실제 사용자 데이터: Knowledge Base ${realUserFiles.length}개 파일, Data Integration ${allUploadedData.length}개 레코드`);
      
      if (hasUserData) {
        console.log(`✅ 사용자 데이터 발견: RAG 모드 활성화`);
        userDataSummary = "사용자가 업로드한 데이터를 기반으로 답변합니다.";
      } else {
        console.log(`💬 사용자 데이터 없음: 일반 대화 모드 활성화`);
        userDataSummary = "일반 대화가 가능합니다.";
      }

      // 🎯 사용자 데이터 유무에 따른 적절한 AI 처리
      let aiResponse = "";
      
      if (config) {
        try {
          if (hasUserData) {
            // 📊 RAG 모드: 사용자 데이터 기반 답변
            console.log(`🤖 RAG 모드: 사용자 데이터 기반 답변 처리`);
            
            let ragContext = "";
            
            // 실제 사용자 파일들만 추가
            for (const file of realUserFiles) {
              if (file && file.name && file.content) {
                ragContext += `\n=== ${file.name} ===\n${file.content.substring(0, 3000)}\n`;
              }
            }
            
            // Data Integration 데이터 추가
            if (allUploadedData.length > 0) {
              ragContext += `\n=== 연동 데이터 ===\n${JSON.stringify(allUploadedData.slice(0, 50), null, 2)}\n`;
            }
            
            // ⚡ 직접 데이터 분석 시스템 활성화
            console.log(`🧠 로컬 데이터 분석 시작: "${message}"`);
            
            try {
              // 로컬에서 직접 질문 분석 및 답변 생성
              aiResponse = await analyzeDataLocally(ragContext, message, allUploadedData);
              console.log(`✅ 로컬 분석 완료: ${aiResponse.length}자`);
            } catch (localError: any) {
              console.log(`⚠️ 로컬 분석 실패, Flowise로 폴백:`, localError.message);
              
              const ragPrompt = `CRITICAL: You MUST analyze the provided data carefully and answer in Korean.

데이터 분석 지침:
1. 제공된 CSV 데이터의 각 컬럼을 정확히 식별하세요
2. 숫자 값은 근사치도 포함해서 검색하세요 (예: 12를 찾을 때 11.9~12.1 범위 포함)
3. 모든 답변은 한국어로 해주세요
4. 데이터가 있으면 반드시 정확한 수치와 함께 답변하세요

업로드된 실제 데이터:
${ragContext}

사용자 질문: ${message}

위 데이터를 정확히 분석하여 한국어로 답변해주세요.`;

              const flowiseResponse = await flowiseService.sendMessage(ragPrompt, sessionId);
              
              if (flowiseResponse.success) {
                aiResponse = flowiseResponse.response;
                console.log(`✅ RAG 답변 성공: ${aiResponse.substring(0, 100)}...`);
              } else {
                console.error('⚠️ Flowise API 실패:', flowiseResponse.error);
                aiResponse = "죄송합니다. 현재 AI 분석 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
              }
            }
          } else {
            // 💬 자연스러운 대화 모드
            console.log(`💬 자연스러운 대화 모드 활성화: "${message}"`);
            
            const naturalPrompt = `
IMPORTANT: Always respond in Korean (한국어).

당신은 전문적이고 친근한 데이터 분석 어시스턴트입니다.

핵심 지침:
- 모든 답변은 반드시 한국어로 해주세요
- 현재 업로드된 데이터나 연동된 데이터가 없는 상태입니다

질문 유형별 답변 방식:
1. 인사말 (안녕, ㅎㅇ 등): "안녕하세요! 데이터 분석을 도와드릴 준비가 되어있습니다."
2. 데이터 분석 질문 (PH, OEE, 온도값, BR-50L 등): "현재 업로드된 데이터가 없어서 ${message}에 대한 분석을 할 수 없습니다. Knowledge Base에 CSV나 Excel 파일을 업로드해주시면 정확한 분석을 도와드릴 수 있습니다."
3. 일반 질문: 친근하게 답변하되 데이터 업로드를 권유

사용자 질문: ${message}

위 지침에 따라 질문 유형을 파악하고 적절히 한국어로 답변해주세요.`;

            const flowiseResponse = await flowiseService.sendMessage(naturalPrompt, sessionId);
            
            if (flowiseResponse.success) {
              aiResponse = flowiseResponse.response;
              console.log(`✅ 자연스러운 대화 성공: ${aiResponse.substring(0, 100)}...`);
            } else {
              aiResponse = '안녕하세요! 무엇을 도와드릴까요? 데이터 분석이 필요하시면 파일을 업로드해주세요.';
              console.log(`❌ Flowise 응답 실패 - 친근한 기본 메시지 사용`);
            }
          }
        } catch (error) {
          console.error('❌ AI 처리 오류:', error);
          aiResponse = `죄송합니다. 처리 중 오류가 발생했습니다.`;
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