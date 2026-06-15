// server/src/middlewares/upload/utils.ts
import fs from 'fs/promises';
import { UPLOAD_DIRS } from './config';
import { logInfo } from '../../utils/logger';

/**
 * 파일명 특수문자 검증
 */
export function validateFilename(filename: string): boolean {
  // null 바이트 차단 (multipart 파싱 후 NUL이 남아 경로 truncation 유발 가능)
  if (filename.includes('\0')) {
    return false;
  }

  // 경로 조작 시도 차단
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }

  // 특수문자 차단
  if (/[<>:"|?*]/.test(filename)) {
    return false;
  }

  // 길이 제한
  if (filename.length > 255) {
    return false;
  }

  return true;
}

/**
 * 업로드 디렉토리 생성
 */
export async function ensureUploadDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    logInfo('업로드 디렉토리 생성', { dir });
  }
}

/**
 * 모든 업로드 디렉토리 초기화
 */
export async function initializeUploadDirs(): Promise<void> {
  await Promise.all([
    ensureUploadDir(UPLOAD_DIRS.BASE),
    ensureUploadDir(UPLOAD_DIRS.FILES),
    ensureUploadDir(UPLOAD_DIRS.IMAGES),
    ensureUploadDir(UPLOAD_DIRS.AVATARS),
  ]);
}

/**
 * 파일 삭제
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    logInfo('파일 삭제', { filePath });
    return true;
  } catch {
    logInfo('삭제할 파일 없음', { filePath });
    return false;
  }
}
