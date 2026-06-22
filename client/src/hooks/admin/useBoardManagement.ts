import { useRef, useState } from 'react';
import api from '../../api/axios';
import { Board, BoardPermission, Role } from '../../types/admin.types';

export const useBoardManagement = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [permissions, setPermissions] = useState<Record<string, BoardPermission[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  // 동일 tick 내 다중 클릭 race 방지용 — setState는 비동기라 saving state만으로 막을 수 없다.
  const inFlightRef = useRef<Set<string>>(new Set());

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchBoards = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/admin/boards');
      setBoards(res.data.data || res.data);
      setDataLoaded(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('게시판 목록 오류:', err);
      setFetchError('게시판 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addBoard = async (boardData: {
    id: string;
    name: string;
    description: string;
    order: number;
  }) => {
    await api.post('/admin/boards', boardData);
    await fetchBoards();
  };

  const updateBoard = async (boardId: string, updates: Partial<Board>) => {
    await api.put(`/admin/boards/${boardId}`, updates);
    await fetchBoards();
  };

  const deleteBoard = async (id: string) => {
    await api.delete(`/admin/boards/${id}`);
    await fetchBoards();
  };

  const fetchBoardPermissions = async (boardList: Board[]) => {
    const results = await Promise.all(
      boardList.map(board =>
        api
          .get(`/admin/boards/${board.id}/permissions`)
          .then(res => ({ boardId: board.id, data: res.data.data || res.data }))
          .catch(err => {
            if (import.meta.env.DEV) console.error(`권한 조회 실패 (${board.name}):`, err);
            return { boardId: board.id, data: [] };
          })
      )
    );
    const permissionsState: Record<string, BoardPermission[]> = {};
    for (const { boardId, data } of results) {
      permissionsState[boardId] = data;
    }
    setPermissions(permissionsState);
  };

  const updatePermission = (
    boardId: string,
    roleId: string,
    type: 'canRead' | 'canWrite' | 'canDelete',
    roles: Role[]
  ) => {
    // ✅ ref 기반 동기 lock — setState/saving은 비동기라 동일 tick의 연속 클릭을 막지 못함
    if (inFlightRef.current.has(boardId)) return;
    inFlightRef.current.add(boardId);

    // 최신 permissions를 함수형 setState 안에서 읽어 update — closure의 stale 값 사용 차단
    let updatedPerms: BoardPermission[] = [];
    let skipped = false;
    setPermissions(prev => {
      const boardPerms = prev[boardId] || [];
      const existingIndex = boardPerms.findIndex(p => p.roleId === roleId);
      if (existingIndex >= 0) {
        updatedPerms = boardPerms.map(p => {
          if (p.roleId !== roleId) return p;
          const next = { ...p, [type]: !p[type] };
          // 읽기/쓰기/삭제 결합(서버 정규화와 일치): 읽기를 끄면 쓰기/삭제도 해제,
          // 쓰기/삭제를 켜면 읽기 자동 부여. read 없는 write/delete는 실제로 무력화되기 때문.
          if (type === 'canRead' && !next.canRead) {
            next.canWrite = false;
            next.canDelete = false;
          } else if ((type === 'canWrite' || type === 'canDelete') && next[type]) {
            next.canRead = true;
          }
          return next;
        });
      } else {
        const role = roles.find(r => r.id === roleId);
        if (!role) {
          skipped = true;
          return prev;
        }
        // 새 권한 행: 어떤 항목을 켜든 읽기는 전제이므로 canRead=true
        updatedPerms = [
          ...boardPerms,
          {
            roleId,
            roleName: role.name,
            canRead: true,
            canWrite: type === 'canWrite',
            canDelete: type === 'canDelete',
          },
        ];
      }
      return { ...prev, [boardId]: updatedPerms };
    });

    if (skipped) {
      inFlightRef.current.delete(boardId);
      return;
    }

    setSaving(s => ({ ...s, [boardId]: true }));
    savePermissions(boardId, updatedPerms)
      .catch(() => {
        if (import.meta.env.DEV) console.error('권한 저장 실패 — 서버 상태로 롤백됨');
      })
      .finally(() => {
        inFlightRef.current.delete(boardId);
        setSaving(s => ({ ...s, [boardId]: false }));
      });
  };

  const savePermissions = async (boardId: string, perms: BoardPermission[]) => {
    try {
      // Filter valid perms
      const validPermissions = perms.map(p => ({
        roleId: p.roleId,
        canRead: p.canRead,
        canWrite: p.canWrite,
        canDelete: p.canDelete,
      }));

      await api.put(`/admin/boards/${boardId}/permissions`, {
        permissions: validPermissions,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('권한 저장 실패:', err);
      // 저장 실패 시 서버 상태로 롤백
      try {
        const res = await api.get(`/admin/boards/${boardId}/permissions`);
        setPermissions(prev => ({ ...prev, [boardId]: res.data.data || res.data }));
      } catch {
        // 롤백 실패 시 무시
      }
      throw err;
    }
  };

  return {
    boards,
    permissions,
    loading,
    saving,
    dataLoaded,
    fetchBoards,
    addBoard,
    updateBoard,
    deleteBoard,
    fetchBoardPermissions,
    updatePermission,
    setDataLoaded,
    fetchError,
  };
};
