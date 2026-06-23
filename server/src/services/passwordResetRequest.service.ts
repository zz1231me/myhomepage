import { PasswordResetRequest } from '../models/PasswordResetRequest';
import { User, UserInstance } from '../models/User';
import { AppError } from '../middlewares/error.middleware';

export interface PasswordResetRequestView {
  id: string;
  userId: string;
  name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

class PasswordResetRequestService {
  /**
   * 사용자(비로그인)가 아이디로 초기화를 요청한다. 계정 열거 방지를 위해
   * 존재 여부와 무관하게 호출부는 동일 응답을 반환한다. 활성 계정이 있고
   * 아직 대기 중인 요청이 없을 때만 새 요청을 생성한다(중복 방지).
   */
  async createRequest(loginId: string): Promise<void> {
    const user = await User.findOne({
      where: { id: loginId, isActive: true, isDeleted: false },
      attributes: ['id'],
    });
    if (!user) return; // 조용히 무시 (열거 방지)

    const existing = await PasswordResetRequest.findOne({
      where: { userId: loginId, status: 'pending' },
    });
    if (existing) return; // 이미 대기 중 — 중복 생성 안 함

    await PasswordResetRequest.create({ userId: loginId, status: 'pending' });
  }

  /** 관리자용 — 상태별 요청 목록(사용자 이름 포함). */
  async listRequests(
    status: 'pending' | 'approved' | 'rejected' = 'pending'
  ): Promise<PasswordResetRequestView[]> {
    const rows = await PasswordResetRequest.findAll({
      where: { status },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'], required: false }],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    return rows.map(r => {
      const user = (r as unknown as { user?: { name?: string } }).user;
      return {
        id: r.id,
        userId: r.userId,
        name: user?.name ?? null,
        status: r.status,
        createdAt: r.createdAt,
      };
    });
  }

  /**
   * 관리자 수락 — 대상 사용자에게 일회용 재설정 토큰을 발급하고 요청을 approved로 표시한다.
   * 평문 토큰을 반환하므로 호출부(컨트롤러)에서 재설정 링크를 구성해 관리자에게 보여준다.
   */
  async approve(
    requestId: string,
    adminId: string
  ): Promise<{ token: string; user: UserInstance }> {
    const request = await PasswordResetRequest.findByPk(requestId);
    if (!request) throw new AppError(404, '요청을 찾을 수 없습니다.');
    if (request.status !== 'pending') throw new AppError(400, '이미 처리된 요청입니다.');
    // 자기 자신의 요청을 자가 승인하는 것은 차단(신원 검증 우회 방지). 본인은 프로필에서 변경.
    if (request.userId === adminId) {
      throw new AppError(400, '자기 자신의 초기화 요청은 승인할 수 없습니다.');
    }

    const user = await User.findOne({
      where: { id: request.userId, isActive: true, isDeleted: false },
    });
    if (!user) throw new AppError(400, '대상 사용자를 찾을 수 없거나 비활성 상태입니다.');

    const token = await user.generatePasswordResetToken(); // 강한 랜덤 토큰(평문 반환, DB엔 해시 저장)

    request.status = 'approved';
    request.resolvedBy = adminId;
    request.resolvedAt = new Date();
    await request.save();

    return { token, user };
  }

  /** 관리자 거절 — 요청을 rejected로 표시. */
  async reject(requestId: string, adminId: string): Promise<void> {
    const request = await PasswordResetRequest.findByPk(requestId);
    if (!request) throw new AppError(404, '요청을 찾을 수 없습니다.');
    if (request.status !== 'pending') throw new AppError(400, '이미 처리된 요청입니다.');

    request.status = 'rejected';
    request.resolvedBy = adminId;
    request.resolvedAt = new Date();
    await request.save();
  }
}

export const passwordResetRequestService = new PasswordResetRequestService();
