// server/src/controllers/ipRule.controller.ts

import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { logError } from '../utils/logger';
import {
  listIpRules,
  createIpRule,
  updateIpRule,
  deleteIpRule,
  getIpRuleStats,
} from '../services/ipRule.service';
import { IpRuleType } from '../models/IpRule';
import { AppError } from '../middlewares/error.middleware';
import { auditLogService } from '../services/auditLog.service';

function logIpRuleAudit(
  req: AuthRequest,
  action: 'create_ip_rule' | 'update_ip_rule' | 'delete_ip_rule',
  targetId: string | null,
  payload: Record<string, unknown>
): void {
  auditLogService
    .createAuditLog({
      adminId: req.user?.id ?? 'unknown',
      adminName: req.user?.name ?? 'unknown',
      action,
      targetType: 'ip_rule',
      targetId: targetId ?? undefined,
      afterValue: payload,
      ipAddress: req.ip ?? null,
    })
    .catch(err => logError(`감사 로그 기록 실패 (${action})`, err));
}

function toAppError(err: unknown): AppError | null {
  return err instanceof AppError ? err : null;
}

// GET /api/admin/ip-rules
export const getIpRules = async (req: AuthRequest, res: Response): Promise<void> => {
  const type = req.query.type as IpRuleType | undefined;
  try {
    const rules = await listIpRules(type);
    sendSuccess(res, rules);
  } catch (err) {
    logError('IP 규칙 조회 실패', err);
    sendError(res, 500, 'IP 규칙 조회 실패');
  }
};

// GET /api/admin/ip-rules/stats
export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await getIpRuleStats();
    sendSuccess(res, stats);
  } catch (err) {
    logError('IP 규칙 통계 조회 실패', err);
    sendError(res, 500, '통계 조회 실패');
  }
};

// POST /api/admin/ip-rules
export const addIpRule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, ip, description } = req.body as {
    type?: string;
    ip?: string;
    description?: string | null;
  };
  const userId = req.user?.id;

  if (!type || !['whitelist', 'blacklist'].includes(type)) {
    sendError(res, 400, 'type은 whitelist 또는 blacklist여야 합니다.');
    return;
  }
  if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
    sendError(res, 400, 'IP 주소를 입력해주세요.');
    return;
  }

  // 기본 IP/CIDR 형식 검증
  const ipTrimmed = ip.trim();

  function isValidIpCidr(value: string): boolean {
    if (value === '::1' || value === 'localhost') return true;
    const cidrMatch = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);
    if (!cidrMatch) return false;
    const octets = [cidrMatch[1], cidrMatch[2], cidrMatch[3], cidrMatch[4]];
    if (octets.some(o => parseInt(o, 10) > 255)) return false;
    if (cidrMatch[5] !== undefined && parseInt(cidrMatch[5], 10) > 32) return false;
    return true;
  }

  if (!isValidIpCidr(ipTrimmed)) {
    sendError(res, 400, '유효하지 않은 IP 형식입니다. (예: 192.168.1.1 또는 192.168.0.0/24)');
    return;
  }

  try {
    const rule = await createIpRule({
      type: type as IpRuleType,
      ip: ipTrimmed,
      description: description ?? null,
      createdBy: userId,
    });
    logIpRuleAudit(req, 'create_ip_rule', rule.id ?? null, {
      type,
      ip: ipTrimmed,
      description: description ?? null,
    });
    sendSuccess(res, rule, 'IP 규칙이 추가되었습니다.', 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 409) {
      sendError(res, 409, appErr.message);
      return;
    }
    logError('IP 규칙 추가 실패', err);
    sendError(res, 500, 'IP 규칙 추가 실패');
  }
};

// PATCH /api/admin/ip-rules/:id
export const patchIpRule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { description, isActive } = req.body as {
    description?: string | null;
    isActive?: boolean;
  };

  try {
    const rule = await updateIpRule(id, { description, isActive });
    logIpRuleAudit(req, 'update_ip_rule', id, { description, isActive });
    sendSuccess(res, rule, 'IP 규칙이 수정되었습니다.');
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 404) return sendNotFound(res, 'IP 규칙');
    logError('IP 규칙 수정 실패', err, { id });
    sendError(res, 500, 'IP 규칙 수정 실패');
  }
};

// DELETE /api/admin/ip-rules/:id
export const removeIpRule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await deleteIpRule(id);
    logIpRuleAudit(req, 'delete_ip_rule', id, {});
    sendSuccess(res, null, 'IP 규칙이 삭제되었습니다.');
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 404) return sendNotFound(res, 'IP 규칙');
    logError('IP 규칙 삭제 실패', err, { id });
    sendError(res, 500, 'IP 규칙 삭제 실패');
  }
};
