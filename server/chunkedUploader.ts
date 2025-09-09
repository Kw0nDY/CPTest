/**
 * 🚀 엔터프라이즈급 청크 기반 파일 업로드 시스템
 * 1GB+ 파일을 안정적으로 처리하기 위한 분할 업로드 엔진
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface ChunkUploadSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: Set<number>;
  tempDirectory: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface UploadProgress {
  sessionId: string;
  uploadedChunks: number;
  totalChunks: number;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentSpeed?: number; // bytes per second
}

export class ChunkedUploadManager {
  private sessions: Map<string, ChunkUploadSession> = new Map();
  private tempDir = path.join(process.cwd(), 'temp', 'chunks');
  private readonly MAX_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MIN_CHUNK_SIZE = 5 * 1024 * 1024;  // 5MB
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.ensureTempDirectory();
    this.startCleanupTimer();
  }

  /**
   * 새로운 업로드 세션 시작
   */
  async initializeUploadSession(
    fileName: string, 
    fileSize: number,
    requestedChunkSize?: number
  ): Promise<{ sessionId: string; chunkSize: number; totalChunks: number }> {
    
    // 최적 청크 크기 결정 (파일 크기에 따라 동적 조정)
    let chunkSize = requestedChunkSize || this.calculateOptimalChunkSize(fileSize);
    
    const totalChunks = Math.ceil(fileSize / chunkSize);
    const sessionId = `upload-${randomUUID()}`;
    const tempDirectory = path.join(this.tempDir, sessionId);
    
    // 임시 디렉토리 생성
    await fs.mkdir(tempDirectory, { recursive: true });
    
    const session: ChunkUploadSession = {
      sessionId,
      fileName,
      fileSize,
      totalChunks,
      chunkSize,
      uploadedChunks: new Set(),
      tempDirectory,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    this.sessions.set(sessionId, session);
    
    console.log(`🚀 청크 업로드 세션 생성: ${fileName} (${this.formatFileSize(fileSize)}) → ${totalChunks}개 청크`);
    
    return { sessionId, chunkSize, totalChunks };
  }

  /**
   * 청크 업로드 처리
   */
  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    chunkBuffer: Buffer
  ): Promise<UploadProgress> {
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Upload session not found: ${sessionId}`);
    }

    // 청크 파일 저장
    const chunkFileName = `chunk-${chunkIndex.toString().padStart(6, '0')}.bin`;
    const chunkFilePath = path.join(session.tempDirectory, chunkFileName);
    
    await fs.writeFile(chunkFilePath, chunkBuffer);
    session.uploadedChunks.add(chunkIndex);
    session.lastActivity = new Date();
    
    console.log(`📦 청크 업로드: ${sessionId} → ${chunkIndex + 1}/${session.totalChunks}`);
    
    return this.getUploadProgress(sessionId);
  }

  /**
   * 업로드 진행상태 조회
   */
  getUploadProgress(sessionId: string): UploadProgress {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Upload session not found: ${sessionId}`);
    }

    const uploadedChunks = session.uploadedChunks.size;
    const uploadedBytes = uploadedChunks * session.chunkSize;
    const percentage = Math.round((uploadedChunks / session.totalChunks) * 100);
    
    // 업로드 속도 및 예상 완료 시간 계산
    const elapsed = Date.now() - session.createdAt.getTime();
    const currentSpeed = uploadedBytes / (elapsed / 1000); // bytes per second
    const remainingBytes = session.fileSize - uploadedBytes;
    const estimatedTimeRemaining = currentSpeed > 0 ? remainingBytes / currentSpeed : undefined;

    return {
      sessionId,
      uploadedChunks,
      totalChunks: session.totalChunks,
      uploadedBytes,
      totalBytes: session.fileSize,
      percentage,
      estimatedTimeRemaining,
      currentSpeed
    };
  }

  /**
   * 업로드 완료 후 파일 재조립
   */
  async finalizeUpload(sessionId: string): Promise<{ filePath: string; fileSize: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Upload session not found: ${sessionId}`);
    }

    // 모든 청크가 업로드되었는지 확인
    if (session.uploadedChunks.size !== session.totalChunks) {
      const missingChunks = [];
      for (let i = 0; i < session.totalChunks; i++) {
        if (!session.uploadedChunks.has(i)) {
          missingChunks.push(i);
        }
      }
      throw new Error(`Missing chunks: ${missingChunks.join(', ')}`);
    }

    // 최종 파일 경로
    const finalFileName = `${sessionId}-${session.fileName}`;
    const finalFilePath = path.join(this.tempDir, finalFileName);
    
    console.log(`🔧 파일 재조립 시작: ${session.fileName} (${session.totalChunks}개 청크)`);
    
    // 청크 파일들을 순서대로 읽어서 재조립
    const writeStream = await fs.open(finalFilePath, 'w');
    let totalBytesWritten = 0;

    try {
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkFileName = `chunk-${i.toString().padStart(6, '0')}.bin`;
        const chunkFilePath = path.join(session.tempDirectory, chunkFileName);
        
        const chunkData = await fs.readFile(chunkFilePath);
        await writeStream.write(chunkData);
        totalBytesWritten += chunkData.length;
      }
    } finally {
      await writeStream.close();
    }
    
    console.log(`✅ 파일 재조립 완료: ${finalFileName} (${this.formatFileSize(totalBytesWritten)})`);
    
    // 임시 청크 파일들 정리
    await this.cleanupSession(sessionId);
    
    return {
      filePath: finalFilePath,
      fileSize: totalBytesWritten
    };
  }

  /**
   * 세션 정리
   */
  async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      // 임시 디렉토리 삭제
      await fs.rm(session.tempDirectory, { recursive: true, force: true });
      console.log(`🧹 세션 정리 완료: ${sessionId}`);
    } catch (error) {
      console.error(`❌ 세션 정리 실패: ${sessionId}`, error);
    }

    this.sessions.delete(sessionId);
  }

  /**
   * 파일 크기에 따른 최적 청크 크기 계산
   */
  private calculateOptimalChunkSize(fileSize: number): number {
    // 파일 크기에 따른 동적 청크 크기 조정
    if (fileSize < 100 * 1024 * 1024) { // 100MB 미만
      return 5 * 1024 * 1024; // 5MB
    } else if (fileSize < 500 * 1024 * 1024) { // 500MB 미만
      return 20 * 1024 * 1024; // 20MB
    } else if (fileSize < 1024 * 1024 * 1024) { // 1GB 미만
      return 50 * 1024 * 1024; // 50MB
    } else {
      return 100 * 1024 * 1024; // 100MB
    }
  }

  /**
   * 임시 디렉토리 생성
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('임시 디렉토리 생성 실패:', error);
    }
  }

  /**
   * 오래된 세션 정리 타이머
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
          console.log(`⏰ 오래된 세션 정리: ${sessionId}`);
          this.cleanupSession(sessionId);
        }
      }
    }, 60 * 60 * 1000); // 1시간마다 실행
  }

  /**
   * 파일 크기 포맷팅
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 모든 활성 세션 조회
   */
  getActiveSessions(): Array<{ sessionId: string; fileName: string; progress: UploadProgress }> {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      fileName: session.fileName,
      progress: this.getUploadProgress(session.sessionId)
    }));
  }
}

// 전역 청크 업로드 매니저 인스턴스
export const chunkedUploadManager = new ChunkedUploadManager();