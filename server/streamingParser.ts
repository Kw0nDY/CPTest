/**
 * 🌊 엔터프라이즈급 스트리밍 파일 파서
 * Line-by-line 처리로 메모리 효율성 극대화
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { Transform } from 'stream';
import { randomUUID } from 'crypto';

export interface StreamingParseConfig {
  batchSize: number;       // 한 번에 처리할 행 수
  maxMemoryUsage: number;  // 최대 메모리 사용량 (bytes)
  enableIndexing: boolean; // RAG용 인덱싱 활성화
  delimiter: string;       // CSV 구분자
  skipEmptyLines: boolean;
  encoding: BufferEncoding;
}

export interface ParsedBatch {
  batchId: string;
  batchIndex: number;
  startLine: number;
  endLine: number;
  headers: string[];
  data: Record<string, any>[];
  summary: BatchSummary;
  metadata: {
    processingTime: number;
    memoryUsage: number;
  };
}

export interface BatchSummary {
  rowCount: number;
  uniqueValues: Record<string, Set<string>>;
  numericStats: Record<string, {
    min: number;
    max: number;
    avg: number;
    count: number;
  }>;
  dateRanges: Record<string, {
    earliest: Date;
    latest: Date;
  }>;
  keywords: string[]; // RAG 검색용 키워드
}

export interface StreamingParseResult {
  sessionId: string;
  totalBatches: number;
  totalRows: number;
  headers: string[];
  batches: ParsedBatch[];
  globalSummary: {
    fileSize: number;
    processingTime: number;
    memoryPeak: number;
  };
}

export class StreamingFileParser {
  private config: StreamingParseConfig;
  private currentBatch: Record<string, any>[] = [];
  private headers: string[] = [];
  private currentLine = 0;
  private batchIndex = 0;
  
  constructor(config: Partial<StreamingParseConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 5000, // 🚀 배치 크기 증가 (2000 → 5000)
      maxMemoryUsage: config.maxMemoryUsage || 1024 * 1024 * 1024, // 🔧 메모리 제한 증가 (512MB → 1GB)
      enableIndexing: config.enableIndexing ?? true,
      delimiter: config.delimiter || ',',
      skipEmptyLines: config.skipEmptyLines ?? true,
      encoding: config.encoding || 'utf8'
    };
  }

  /**
   * 대용량 파일을 스트리밍으로 파싱
   */
  async parseFile(
    filePath: string,
    onBatchProcessed?: (batch: ParsedBatch) => void,
    onProgress?: (progress: { currentLine: number; estimatedTotal?: number }) => void
  ): Promise<StreamingParseResult> {
    
    const sessionId = `parse-${randomUUID()}`;
    const startTime = Date.now();
    let totalRows = 0;
    const batches: ParsedBatch[] = [];
    
    console.log(`🌊 스트리밍 파싱 시작: ${filePath}`);
    
    return new Promise((resolve, reject) => {
      const fileStream = createReadStream(filePath, { encoding: this.config.encoding });
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      rl.on('line', async (line: string) => {
        try {
          await this.processLine(line, onBatchProcessed, onProgress);
          
          // 메모리 사용량 체크
          const memUsage = process.memoryUsage();
          if (memUsage.heapUsed > this.config.maxMemoryUsage) {
            console.warn(`⚠️ 메모리 사용량 초과: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
            // 현재 배치 강제 처리
            if (this.currentBatch.length > 0) {
              const batch = await this.finalizeBatch();
              batches.push(batch);
              if (onBatchProcessed) onBatchProcessed(batch);
            }
          }
        } catch (error) {
          reject(error);
        }
      });

      rl.on('close', async () => {
        try {
          // 마지막 배치 처리
          if (this.currentBatch.length > 0) {
            const batch = await this.finalizeBatch();
            batches.push(batch);
            if (onBatchProcessed) onBatchProcessed(batch);
          }

          const endTime = Date.now();
          const result: StreamingParseResult = {
            sessionId,
            totalBatches: batches.length,
            totalRows: batches.reduce((sum, batch) => sum + batch.data.length, 0),
            headers: this.headers,
            batches,
            globalSummary: {
              fileSize: await this.getFileSize(filePath),
              processingTime: endTime - startTime,
              memoryPeak: process.memoryUsage().heapUsed
            }
          };

          console.log(`✅ 스트리밍 파싱 완료: ${result.totalRows}개 행, ${result.totalBatches}개 배치`);
          resolve(result);
          
        } catch (error) {
          reject(error);
        }
      });

      rl.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 개별 라인 처리
   */
  private async processLine(
    line: string,
    onBatchProcessed?: (batch: ParsedBatch) => void,
    onProgress?: (progress: { currentLine: number }) => void
  ): Promise<void> {
    
    this.currentLine++;
    
    if (this.config.skipEmptyLines && !line.trim()) {
      return;
    }

    // 헤더 처리
    if (this.currentLine === 1) {
      this.headers = this.parseLine(line);
      return;
    }

    // 데이터 라인 처리 - 🔧 유연한 파싱으로 전체 데이터 보장
    const values = this.parseLine(line);

    // 🚀 객체로 변환 - 열 수 불일치 시에도 데이터 처리 계속
    const row: Record<string, any> = {};
    this.headers.forEach((header, index) => {
      let rawValue = '';
      if (index < values.length) {
        rawValue = values[index] || '';
      } else {
        rawValue = ''; // 누락된 컬럼은 빈 값으로 처리
      }
      row[header] = this.parseValue(rawValue);
    });

    this.currentBatch.push(row);

    // 배치 크기 도달 시 처리
    if (this.currentBatch.length >= this.config.batchSize) {
      const batch = await this.finalizeBatch();
      if (onBatchProcessed) onBatchProcessed(batch);
    }

    // 진행 상황 보고
    if (onProgress && this.currentLine % 1000 === 0) {
      onProgress({ currentLine: this.currentLine });
    }
  }

  /**
   * 배치 완료 처리
   */
  private async finalizeBatch(): Promise<ParsedBatch> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    const batchId = `batch-${this.batchIndex}`;
    const startLine = (this.batchIndex * this.config.batchSize) + 2; // +2 for header and 0-index
    const endLine = startLine + this.currentBatch.length - 1;

    // 배치 요약 생성
    const summary = this.generateBatchSummary(this.currentBatch);

    const batch: ParsedBatch = {
      batchId,
      batchIndex: this.batchIndex,
      startLine,
      endLine,
      headers: [...this.headers],
      data: [...this.currentBatch],
      summary,
      metadata: {
        processingTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed - startMemory
      }
    };

    // 배치 초기화
    this.currentBatch = [];
    this.batchIndex++;

    console.log(`📦 배치 처리 완료: ${batchId} (${batch.data.length}개 행)`);
    return batch;
  }

  /**
   * 배치 요약 정보 생성 (RAG 인덱싱용)
   */
  private generateBatchSummary(data: Record<string, any>[]): BatchSummary {
    const summary: BatchSummary = {
      rowCount: data.length,
      uniqueValues: {},
      numericStats: {},
      dateRanges: {},
      keywords: []
    };

    // 각 열별 분석
    for (const header of this.headers) {
      const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
      
      if (values.length === 0) continue;

      // 고유값 수집 (문자열 필드)
      if (values.some(v => typeof v === 'string')) {
        summary.uniqueValues[header] = new Set(
          values.filter(v => typeof v === 'string').slice(0, 100) // 최대 100개만 저장
        );
      }

      // 숫자 통계
      const numValues = values.filter(v => typeof v === 'number') as number[];
      if (numValues.length > 0) {
        summary.numericStats[header] = {
          min: Math.min(...numValues),
          max: Math.max(...numValues),
          avg: numValues.reduce((a, b) => a + b, 0) / numValues.length,
          count: numValues.length
        };
      }

      // 날짜 범위
      const dateValues = values.filter(v => v instanceof Date) as Date[];
      if (dateValues.length > 0) {
        summary.dateRanges[header] = {
          earliest: new Date(Math.min(...dateValues.map(d => d.getTime()))),
          latest: new Date(Math.max(...dateValues.map(d => d.getTime())))
        };
      }
    }

    // RAG 검색용 키워드 추출
    if (this.config.enableIndexing) {
      summary.keywords = this.extractKeywords(data);
    }

    return summary;
  }

  /**
   * RAG 검색용 키워드 추출
   */
  private extractKeywords(data: Record<string, any>[]): string[] {
    const keywords = new Set<string>();
    
    for (const row of data.slice(0, 10)) { // 샘플 10개 행만 처리
      for (const [key, value] of Object.entries(row)) {
        // 키 이름 추가
        keywords.add(key.toLowerCase());
        
        // 문자열 값에서 키워드 추출
        if (typeof value === 'string' && value.length > 2) {
          const words = value.toLowerCase().match(/[a-z가-힣0-9]+/g) || [];
          words.forEach(word => {
            if (word.length >= 3) keywords.add(word);
          });
        }
        
        // 숫자 범위 정보
        if (typeof value === 'number') {
          if (value >= 0 && value <= 100) keywords.add('percentage_range');
          if (value > 1000) keywords.add('large_number');
        }
      }
    }
    
    return Array.from(keywords).slice(0, 50); // 최대 50개 키워드
  }

  /**
   * CSV 라인 파싱 (간단한 구현)
   */
  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === this.config.delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * 값 타입 추론 및 변환
   */
  private parseValue(value: string): any {
    const trimmed = value.trim().replace(/^"|"$/g, '');
    
    if (trimmed === '') return null;
    
    // 숫자 체크
    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
    
    // 날짜 체크 (간단한 패턴들)
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/
    ];
    
    for (const pattern of datePatterns) {
      if (pattern.test(trimmed)) {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    
    // 불린 체크
    const lower = trimmed.toLowerCase();
    if (['true', 'false', 'yes', 'no', '1', '0'].includes(lower)) {
      return ['true', 'yes', '1'].includes(lower);
    }
    
    return trimmed;
  }

  /**
   * 파일 크기 조회
   */
  private async getFileSize(filePath: string): Promise<number> {
    const fs = await import('fs');
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }
}