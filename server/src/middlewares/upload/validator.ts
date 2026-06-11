// server/src/middlewares/upload/validator.ts
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import { MAGIC_NUMBERS, MIME_TYPE_MAP } from './config';
import { logInfo, logWarning, logError } from '../../utils/logger';
import { sendError } from '../../utils/response';

/**
 * 파일 내용 검증 (Magic Number 체크)
 *
 * - MAGIC_NUMBERS에 정의된 타입: magic byte로 검증
 * - MAGIC_NUMBERS에 빈 배열인 타입 (text/plain 등): magic byte 검증 불가 — 통과
 * - MAGIC_NUMBERS에 없는 타입이지만 originalname 확장자로 MIME 추론 가능: 추론된 타입으로 검증
 *   (브라우저/OS가 application/octet-stream 등 generic MIME을 보내는 경우 대응)
 * - 그 외: 허용되지 않은 MIME 타입으로 거부
 */
async function validateFileContent(
  filePath: string,
  mimetype: string,
  originalname?: string
): Promise<boolean> {
  try {
    let effectiveMime = mimetype;
    let expectedHeaders = MAGIC_NUMBERS[mimetype];

    // MAGIC_NUMBERS에 없으면 확장자로 MIME 타입 재추론 (application/octet-stream 등 대응)
    if (expectedHeaders === undefined && originalname) {
      const ext = path.extname(originalname).toLowerCase();
      const inferredMime = Object.entries(MIME_TYPE_MAP).find(([, exts]) =>
        exts.includes(ext)
      )?.[0];
      if (inferredMime) {
        effectiveMime = inferredMime;
        expectedHeaders = MAGIC_NUMBERS[inferredMime];
        logInfo('MIME 타입 재추론', { original: mimetype, inferred: inferredMime, ext });
      }
    }

    // 여전히 화이트리스트에 없으면 거부
    if (expectedHeaders === undefined) {
      logWarning('허용되지 않은 MIME 타입', { mimetype: effectiveMime, filePath });
      return false;
    }

    // magic number 정의가 없는 타입(text 등)은 확장자/MIME 일치 검증만으로 통과
    if (expectedHeaders.length === 0) {
      return true;
    }

    const fd = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(16);
    await fd.read(buf, 0, 16, 0);
    await fd.close();

    // mp4는 offset 4에 ftyp이 있으므로 별도 처리
    if (effectiveMime === 'video/mp4') {
      const ftypHeader = buf.slice(4, 8);
      return ftypHeader.equals(expectedHeaders[0]);
    }

    // WebP: RIFF(0-3) + WEBP(8-11) 모두 확인 — AVI도 RIFF 시작이라 구분 필요
    if (effectiveMime === 'image/webp') {
      const isRiff = buf.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46]));
      const isWebp = buf.slice(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]));
      return isRiff && isWebp;
    }

    return expectedHeaders.some(expected => buf.slice(0, expected.length).equals(expected));
  } catch (error) {
    logError('파일 내용 검증 실패', error);
    return false;
  }
}

/**
 * 업로드 후 파일 검증 미들웨어
 */
export async function validateUploadedFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const files: Express.Multer.File[] = [];

    // 단일 파일
    if (req.file) {
      files.push(req.file);
    }

    // 다중 파일
    if (req.files) {
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        // 객체 형태인 경우 (fields)
        Object.values(req.files).forEach(fileList => {
          files.push(...fileList);
        });
      }
    }

    if (files.length === 0) {
      return next();
    }

    for (const file of files) {
      const filePath = file.path;

      // 파일 내용 검증
      const isValidContent = await validateFileContent(filePath, file.mimetype, file.originalname);
      if (!isValidContent) {
        // 실패한 파일 + 이미 저장된 나머지 파일 모두 정리 (고아 파일 방지)
        await Promise.all(files.map(f => fs.unlink(f.path).catch(() => {})));
        sendError(res, 400, `파일 내용이 올바르지 않습니다: ${file.originalname}`);
        return;
      }

      logInfo('파일 검증 완료', { filename: file.filename });

      // ✅ 권한 설정: 실행 권한 제거 (644: rw-r--r--)
      // 윈도우에서는 chmod가 다르게 동작하므로 POSIX 환경에서만 실행
      if (process.platform !== 'win32') {
        await fs.chmod(filePath, 0o644);
      }
    }

    next();
  } catch (error) {
    logError('파일 검증 실패', error);
    sendError(res, 500, '파일 검증 중 오류가 발생했습니다.');
  }
}
