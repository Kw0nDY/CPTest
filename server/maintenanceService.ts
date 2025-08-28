import { db } from './db';
import { equipmentMaintenance } from '@shared/schema';
import fs from 'fs';
import path from 'path';

interface MaintenanceRecord {
  index: string;
  type: string;
  fault: string;
  action: string;
}

export class MaintenanceService {
  // CSV 데이터를 파싱하고 데이터베이스에 저장
  async importCSVData(): Promise<void> {
    try {
      const csvPath = path.join(process.cwd(), 'attached_assets', 'maintenance_1756358300878.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      
      // CSV 파싱 (BOM 제거)
      const lines = csvContent.replace(/^\uFEFF/, '').split('\n');
      const headers = lines[0].split(',');
      
      const records: MaintenanceRecord[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // CSV 파싱 - 쉼표로 구분하되 따옴표 내의 쉼표는 무시
        const values = this.parseCSVLine(line);
        
        if (values.length >= 4) {
          records.push({
            index: values[0],
            type: values[1],
            fault: values[2], 
            action: values[3]
          });
        }
      }
      
      // 기존 데이터 확인
      const existingCount = await db.$count(equipmentMaintenance);
      
      if (existingCount === 0) {
        // 데이터베이스에 삽입
        for (const record of records) {
          const keywords = this.extractKeywords(record.fault + ' ' + record.action);
          
          await db.insert(equipmentMaintenance).values({
            equipmentType: record.type,
            faultDescription: record.fault,
            solution: record.action,
            keywords: keywords
          });
        }
        
        console.log(`설비 유지보수 데이터 ${records.length}건을 데이터베이스에 저장했습니다.`);
      } else {
        console.log('설비 유지보수 데이터가 이미 존재합니다.');
      }
      
    } catch (error) {
      console.error('CSV 데이터 가져오기 실패:', error);
      throw error;
    }
  }
  
  // CSV 라인 파싱 (따옴표 처리)
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  // 키워드 추출 함수
  private extractKeywords(text: string): string[] {
    // 한국어 설비 관련 키워드들
    const keywords = new Set<string>();
    
    // 설비 타입 키워드
    const equipmentKeywords = [
      '진공', '펌프', 'RF', '매칭', 'MFC', '가스', 'ESC', '웨이퍼', '척', 
      '스로틀', '밸브', '압력', '터보', '드라이', '엔드포인트', '센서', 
      '웨트벤치', '세정', 'CMP', '연마', '챔버', '플라스마'
    ];
    
    // 문제 키워드
    const problemKeywords = [
      '누설', '지연', '진동', '저하', '불안정', '과다', '과열', '아크', 
      '드리프트', '불일치', '응답', '의심', '과압', '실패', '불량', 
      '알람', '오버슛', '비균일', '스틱션', '오류', '미달', '증가', 
      '검출', '상승', '약화', '옵셋', '노이즈', '편차', '크랙', '스크래치'
    ];
    
    // 해결책 키워드
    const solutionKeywords = [
      '교체', '재도포', '시험', '재조임', '튜닝', '확인', '청소', '제거', 
      '재교정', '점검', '재튜닝', '개선', '재설정', '재조립', '적용', 
      '조정', '클리닝', '검사', '재측정', '안정화', '보충', '주입', 
      '컨디셔닝', '레벨링', '드레서'
    ];
    
    const allKeywords = [...equipmentKeywords, ...problemKeywords, ...solutionKeywords];
    
    for (const keyword of allKeywords) {
      if (text.includes(keyword)) {
        keywords.add(keyword);
      }
    }
    
    return Array.from(keywords);
  }
  
  // 설비 문제 검색
  async searchMaintenanceKnowledge(query: string): Promise<any[]> {
    try {
      // 쿼리에서 키워드 추출
      const queryKeywords = this.extractKeywords(query);
      
      // 텍스트 유사성 검색
      const results = await db.select().from(equipmentMaintenance);
      
      // 점수 기반 정렬
      const scoredResults = results.map(record => {
        let score = 0;
        
        // 키워드 매칭 점수
        const commonKeywords = record.keywords?.filter(k => 
          queryKeywords.includes(k as string)
        ) || [];
        score += commonKeywords.length * 3;
        
        // 텍스트 포함 점수
        const combinedText = (record.equipmentType + ' ' + record.faultDescription).toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (combinedText.includes(queryLower)) {
          score += 5;
        }
        
        // 부분 매칭
        const queryWords = query.split(/\s+/);
        for (const word of queryWords) {
          if (word.length > 1 && combinedText.includes(word.toLowerCase())) {
            score += 1;
          }
        }
        
        return { ...record, score };
      });
      
      // 점수로 정렬하고 상위 5개 반환
      return scoredResults
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
        
    } catch (error) {
      console.error('유지보수 지식 검색 실패:', error);
      return [];
    }
  }
  
  // AI 기반 응답 생성
  async generateMaintenanceAdvice(query: string): Promise<string> {
    try {
      const searchResults = await this.searchMaintenanceKnowledge(query);
      
      if (searchResults.length === 0) {
        return "죄송합니다. 해당 설비 문제에 대한 정보를 찾을 수 없습니다. 더 구체적인 설비명이나 문제 증상을 알려주시겠어요?";
      }
      
      // 가장 적합한 솔루션 선택
      const bestMatch = searchResults[0];
      
      let response = `**${bestMatch.equipmentType}** 관련 문제로 보입니다.\n\n`;
      response += `**문제 증상:** ${bestMatch.faultDescription}\n\n`;
      response += `**권장 해결책:**\n${bestMatch.solution}\n\n`;
      
      // 추가 관련 정보가 있으면 포함
      if (searchResults.length > 1) {
        response += `**참고사항:**\n`;
        for (let i = 1; i < Math.min(3, searchResults.length); i++) {
          const result = searchResults[i];
          response += `- ${result.equipmentType}: ${result.solution}\n`;
        }
      }
      
      response += `\n위 해결책을 시도해보시고, 문제가 지속되면 추가 진단이 필요할 수 있습니다.`;
      
      return response;
      
    } catch (error) {
      console.error('유지보수 조언 생성 실패:', error);
      return "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
  }
}