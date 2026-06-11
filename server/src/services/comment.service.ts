import { BaseService } from './base.service';
import { Comment, CommentInstance } from '../models/Comment';
import { User } from '../models/User';
import { AppError } from '../middlewares/error.middleware';
import { isAdminOrManager } from '../config/constants';
import { getCommentSettings } from '../utils/settingsCache';
import { sequelize } from '../config/sequelize';

// Note: User is still needed for the include in findByPk responses

export class CommentService extends BaseService {
  /**
   * 댓글 생성
   * authorName: controller가 req.user.name 을 전달하므로 별도 User 조회 불필요
   */
  async createComment(
    postId: string,
    userId: string,
    content: string,
    authorName: string,
    parentId?: number
  ): Promise<CommentInstance> {
    const { maxDepth, maxCount } = getCommentSettings();

    const newComment = await sequelize.transaction(async t => {
      // ✅ 게시글당 최대 댓글 수 체크 (DoS 방지) — 관리자 설정값 사용
      const currentCount = await Comment.count({
        where: { PostId: postId },
        transaction: t,
      });
      if (currentCount >= maxCount) {
        throw new AppError(400, `이 게시글의 댓글은 최대 ${maxCount}개까지 작성할 수 있습니다.`);
      }

      // 대댓글 깊이 체크 — LOCK.UPDATE으로 부모 존재/깊이 TOCTOU 방지
      let depth = 0;
      let path = '';
      if (parentId !== undefined && parentId !== null) {
        const parentComment = await Comment.findByPk(parentId, {
          attributes: ['id', 'depth', 'path', 'PostId'],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!parentComment) {
          throw new AppError(404, '부모 댓글을 찾을 수 없습니다.');
        }
        if (String(parentComment.PostId) !== String(postId)) {
          throw new AppError(400, '다른 게시글의 댓글에는 대댓글을 달 수 없습니다.');
        }
        // depth는 0-based이므로 maxDepth단계 = depth(maxDepth-1)까지 허용
        if ((parentComment.depth ?? 0) >= maxDepth - 1) {
          throw new AppError(
            400,
            `더 이상 대댓글을 달 수 없습니다. 최대 ${maxDepth}단계까지 허용됩니다.`
          );
        }
        // M3: 훅이 트랜잭션 없이 부모를 재조회하는 TOCTOU를 방지하기 위해
        //     잠긴 부모의 depth/path를 서비스에서 미리 계산해 create에 전달
        depth = (parentComment.depth ?? 0) + 1;
        path = parentComment.path
          ? `${parentComment.path}.${parentComment.id}`
          : String(parentComment.id);
      }

      return Comment.create(
        {
          content: content.trim(),
          PostId: postId,
          UserId: userId,
          author: authorName,
          parentId: parentId ?? null,
          depth,
          path,
        },
        { transaction: t }
      );
    });

    // 응답용 데이터 조회 — 트랜잭션 성공 후 User 포함 재조회
    const commentWithUser = await Comment.findByPk(newComment.id, {
      attributes: [
        'id',
        'content',
        'author',
        'createdAt',
        'updatedAt',
        'UserId',
        'PostId',
        'isEdited',
        'editedAt',
        'parentId',
        'depth',
        'path',
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar'],
          required: false,
        },
      ],
    });

    if (!commentWithUser) {
      throw new AppError(500, '댓글 생성 후 조회 실패');
    }

    return commentWithUser;
  }

  /**
   * 게시글의 댓글 목록 조회
   * @param sortBy 'oldest' (기본) | 'newest' | 'popular'
   */
  async getCommentsByPost(
    postId: string,
    sortBy: 'oldest' | 'newest' | 'popular' = 'oldest'
  ): Promise<CommentInstance[]> {
    const orderMap: Record<string, [string, string][]> = {
      oldest: [['createdAt', 'ASC']],
      newest: [['createdAt', 'DESC']],
      popular: [
        ['likeCount', 'DESC'],
        ['createdAt', 'ASC'],
      ],
    };

    return Comment.findAll({
      where: { PostId: postId },
      attributes: [
        'id',
        'content',
        'author',
        'createdAt',
        'updatedAt',
        'UserId',
        'PostId',
        'isEdited',
        'editedAt',
        'parentId',
        'depth',
        'path',
        'likeCount',
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar'],
          required: false,
        },
      ],
      order: orderMap[sortBy] ?? [['createdAt', 'ASC']],
      // DoS 방지: 게시글당 최대 개수는 관리자 설정값 사용
      limit: getCommentSettings().maxCount,
    });
  }

  /**
   * 댓글 수정
   */
  async updateComment(
    commentId: number,
    userId: string,
    userRole: string,
    content: string
  ): Promise<CommentInstance> {
    const updatedComment = await sequelize.transaction(async t => {
      // LOCK.UPDATE으로 동시 수정 TOCTOU 방지
      const comment = await Comment.findByPk(commentId, { transaction: t, lock: t.LOCK.UPDATE });

      if (!comment) {
        throw new AppError(404, '댓글을 찾을 수 없습니다.');
      }

      // 권한 확인 (admin, manager 또는 작성자 본인)
      const isPrivileged = isAdminOrManager(userRole);
      const isOwner = comment.UserId === userId;

      if (!isPrivileged && !isOwner) {
        throw new AppError(403, '수정 권한이 없습니다.');
      }

      // beforeUpdate 훅이 isEdited/editedAt 자동 설정하므로 content만 전달
      await comment.update({ content: content.trim() }, { transaction: t });

      // 응답용 데이터 조회
      const updated = await Comment.findByPk(commentId, {
        attributes: [
          'id',
          'content',
          'author',
          'createdAt',
          'updatedAt',
          'UserId',
          'PostId',
          'isEdited',
          'editedAt',
          'parentId',
          'depth',
          'path',
        ],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'avatar'],
            required: false,
          },
        ],
        transaction: t,
      });

      if (!updated) {
        throw new AppError(500, '댓글 수정 후 조회 실패');
      }

      return updated;
    });

    return updatedComment;
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(commentId: number, userId: string, userRole: string): Promise<void> {
    await sequelize.transaction(async t => {
      // LOCK.UPDATE으로 동시 삭제 TOCTOU 방지 (updateComment와 동일한 패턴)
      const comment = await Comment.findByPk(commentId, { transaction: t, lock: t.LOCK.UPDATE });

      if (!comment) {
        throw new AppError(404, '댓글을 찾을 수 없습니다.');
      }

      // 권한 확인 (admin, manager 또는 작성자 본인)
      const isPrivileged = isAdminOrManager(userRole);
      const isOwner = comment.UserId === userId;

      if (!isPrivileged && !isOwner) {
        throw new AppError(403, '삭제 권한이 없습니다.');
      }

      // soft delete가 model에 설정되어 있으므로 destroy 호출
      await comment.destroy({ transaction: t });
    });
  }
}

export const commentService = new CommentService();
