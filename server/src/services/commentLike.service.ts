import { Comment } from '../models/Comment';
import { CommentLike } from '../models/CommentLike';
import { AppError } from '../middlewares/error.middleware';
import { sequelize } from '../config/sequelize';
import { BaseService } from './base.service';

export class CommentLikeService extends BaseService {
  /**
   * 댓글 좋아요 토글 (없으면 추가, 있으면 제거)
   * - 트랜잭션 + LOCK.UPDATE으로 동시 클릭 race condition 방지
   * - 정렬(추천순)에 쓰이는 비정규화 컬럼 Comment.likeCount를 같은 트랜잭션에서 증감해
   *   CommentLike 행 수와 항상 일치시킨다. (likeCount는 content 변경이 아니므로 '수정됨' 훅 미발동)
   */
  async toggleLike(
    commentId: number,
    userId: string
  ): Promise<{ liked: boolean; likeCount: number }> {
    return sequelize.transaction(async t => {
      // 댓글 존재 확인 (soft-delete된 댓글은 findByPk 기본 제외 → 404)
      const comment = await Comment.findByPk(commentId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!comment) throw new AppError(404, '댓글을 찾을 수 없습니다.');

      const existing = await CommentLike.findOne({
        where: { CommentId: commentId, UserId: userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existing) {
        await existing.destroy({ transaction: t });
        await comment.decrement('likeCount', { transaction: t });
      } else {
        await CommentLike.create({ CommentId: commentId, UserId: userId }, { transaction: t });
        await comment.increment('likeCount', { transaction: t });
      }

      // 비정규화 컬럼이 행 수와 어긋날 일은 없지만, 응답은 실제 행 수를 권위값으로 사용
      const likeCount = await CommentLike.count({
        where: { CommentId: commentId },
        transaction: t,
      });

      return { liked: !existing, likeCount };
    });
  }

  /**
   * 여러 댓글에 대해 현재 사용자가 좋아요한 댓글 id 집합 반환 (목록 조회 시 1쿼리로 일괄)
   */
  async getLikedCommentIds(commentIds: number[], userId: string): Promise<Set<number>> {
    if (commentIds.length === 0) return new Set();
    const rows = await CommentLike.findAll({
      where: { CommentId: commentIds, UserId: userId },
      attributes: ['CommentId'],
    });
    return new Set(rows.map(r => r.CommentId as number));
  }
}

export const commentLikeService = new CommentLikeService();
