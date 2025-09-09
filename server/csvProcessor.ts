import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

// 🎯 대용량 CSV 파일 스트리밍 처리 유틸리티

export interface CSVProcessOptions {
  maxRows?: number; // 최대 처리 행 수 (메모리 제한)
  batchSize?: number; // 배치 처리 크기
  skipFirstRow?: boolean; // 헤더 건너뛰기
}

export interface CSVProcessResult {
  headers: string[];
  data: any[];
  rowCount: number;
  truncated: boolean;
  processingTime: number;
}

/**
 * 대용량 CSV 파일을 스트리밍으로 안전하게 처리하는 함수
 * 89MB+ 파일에서 스택 오버플로우 방지
 */
export async function processLargeCSV(
  csvContent: string, 
  options: CSVProcessOptions = {}
): Promise<CSVProcessResult> {
  const startTime = Date.now();
  const {
    maxRows = 5000, // 기본 5000행 제한 (메모리 보호)
    batchSize = 100,
    skipFirstRow = true
  } = options;

  const results: any[] = [];
  let headers: string[] = [];
  let rowCount = 0;
  let truncated = false;

  try {
    // 텍스트를 스트림으로 변환하여 메모리 부담 감소
    const stream = Readable.from([csvContent]);
    
    // 헤더 추출을 위한 Promise
    let headersResolved = false;
    
    await pipeline(
      stream,
      csvParser(),
      async function* (source) {
        for await (const chunk of source) {
          // 첫 번째 청크에서 헤더 추출
          if (!headersResolved) {
            headers = Object.keys(chunk);
            headersResolved = true;
            console.log(`📊 CSV 헤더 감지: ${headers.join(', ')}`);
          }

          rowCount++;

          // 메모리 보호: 최대 행 수 제한
          if (rowCount <= maxRows) {
            results.push(chunk);
            
            // 배치 단위로 진행 상황 로깅
            if (rowCount % batchSize === 0) {
              console.log(`🔄 CSV 처리 진행: ${rowCount}행 완료`);
            }
          } else {
            truncated = true;
            console.log(`⚠️ CSV 파일 크기 제한: ${maxRows}행에서 처리 중단 (전체 ${rowCount}행 중)`);
            break;
          }

          yield chunk;
        }
      }
    );

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ CSV 스트리밍 처리 완료: ${results.length}행 처리됨 (${processingTime}ms)`);
    
    return {
      headers,
      data: results,
      rowCount: results.length,
      truncated,
      processingTime
    };

  } catch (error) {
    console.error('❌ CSV 스트리밍 처리 오류:', error);
    
    // Fallback: 기존 방식으로 작은 데이터만 처리
    console.log('🔄 Fallback 모드: 소규모 데이터 처리 시도');
    return await processFallbackCSV(csvContent, options);
  }
}

/**
 * Fallback 처리: 작은 파일용 (1MB 이하)
 */
async function processFallbackCSV(
  csvContent: string, 
  options: CSVProcessOptions
): Promise<CSVProcessResult> {
  const startTime = Date.now();
  const { maxRows = 1000 } = options;

  try {
    // 파일 크기 확인
    const fileSizeKB = Buffer.byteLength(csvContent, 'utf8') / 1024;
    console.log(`📏 CSV 파일 크기: ${fileSizeKB.toFixed(2)} KB`);

    if (fileSizeKB > 1024) {
      throw new Error('파일이 너무 큼: 스트리밍 처리 필요');
    }

    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      throw new Error('빈 CSV 파일');
    }

    // 헤더 추출
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // 데이터 파싱 (제한된 행만)
    const dataLines = lines.slice(1, Math.min(lines.length, maxRows + 1));
    const results = dataLines.map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        const numValue = parseFloat(value);
        row[header] = isNaN(numValue) ? value : numValue;
      });
      return row;
    });

    const processingTime = Date.now() - startTime;
    const truncated = lines.length > maxRows + 1;

    console.log(`✅ Fallback CSV 처리 완료: ${results.length}행 (${processingTime}ms)`);

    return {
      headers,
      data: results,
      rowCount: results.length,
      truncated,
      processingTime
    };

  } catch (error) {
    console.error('❌ Fallback CSV 처리 오류:', error);
    throw error;
  }
}

/**
 * CSV 파일 청크 처리기 (메모리 절약형)
 */
export class CSVChunkProcessor {
  private batchSize: number;
  private maxMemoryMB: number;
  
  constructor(batchSize = 100, maxMemoryMB = 50) {
    this.batchSize = batchSize;
    this.maxMemoryMB = maxMemoryMB;
  }

  async processInChunks(
    csvContent: string,
    processor: (batch: any[]) => Promise<void>
  ): Promise<{ totalRows: number; chunksProcessed: number }> {
    
    const stream = Readable.from([csvContent]);
    let batch: any[] = [];
    let totalRows = 0;
    let chunksProcessed = 0;
    const batchSize = this.batchSize;
    const maxMemoryMB = this.maxMemoryMB;

    await pipeline(
      stream,
      csvParser(),
      async function* (source) {
        for await (const row of source) {
          batch.push(row);
          totalRows++;

          if (batch.length >= batchSize) {
            await processor(batch);
            chunksProcessed++;
            batch = []; // 메모리 해제
            
            // 메모리 사용량 체크
            if (process.memoryUsage().heapUsed / 1024 / 1024 > maxMemoryMB) {
              console.warn(`⚠️ 메모리 사용량 초과: ${maxMemoryMB}MB 제한`);
              break;
            }
          }

          yield row;
        }

        // 마지막 배치 처리
        if (batch.length > 0) {
          await processor(batch);
          chunksProcessed++;
        }
      }
    );

    return { totalRows, chunksProcessed };
  }
}