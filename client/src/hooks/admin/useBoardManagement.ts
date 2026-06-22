import { useRef, useState } from 'react';
import api from '../../api/axios';
import { Board, BoardPermission, Role } from '../../types/admin.types';

export const useBoardManagement = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [permissions, setPermissions] = useState<Record<string, BoardPermission[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  // 저장 직렬화용 — 한 게시판에 저장이 진행 중인지 추적(out-of-order 저장 방지).
  const inFlightRef = useRef<Set<string>>(new Set());
  // 저장 진행 중에 들어온 후속 변경의 "최신 상태"를 적재(coalescing). 저장이 끝나면 이어서 저장한다.
  const pendingRef = useRef<Map<string, BoardPermission[]>>(new Map());

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

  // 대기열(pendingRef)의 최신 상태를 직렬로 저장. 저장이 끝나면 그 사이 쌓인 변경을 이어서 저장한다.
  const runSave = (boardId: string) => {
    const perms = pendingRef.current.get(boardId);
    if (!perms) return;
    pendingRef.current.delete(boardId);
    inFlightRef.current.add(boardId);
    setSaving(s => ({ ...s, [boardId]: true }));
    savePermissions(boardId, perms)
      .catch(() => {
        if (import.meta.env.DEV) console.error('권한 저장 실패 — 서버 상태로 롤백됨');
      })
      .finally(() => {
        inFlightRef.current.delete(boardId);
        // 저장 중 들어온 후속 변경이 있으면 최신 상태로 이어서 저장(클릭 유실 방지)
        if (pendingRef.current.has(boardId)) {
          runSave(boardId);
        } else {
          setSaving(s => ({ ...s, [boardId]: false }));
        }
      });
  };

  const updatePermission = (
    boardId: string,
    roleId: string,
    type: 'canRead' | 'canWrite' | 'canDelete',
    roles: Role[]
  ) => {
    // 최신 permissions를 함수형 setState 안에서 읽어 낙관적 업데이트(연속 클릭도 누적 반영)
    let updatedPerms: BoardPermission[] = [];
    let skipped = false;
    setPermissions(prev => {
      const boardPerms = prev[boardId] || [];
      const existingIndex = boardPerms.findIndex(p => p.roleId === roleId);
      if (existingIndex >= 0) {
        updatedPerms = boardPerms.map(p => (p.roleId === roleId ? { ...p, [type]: !p[type] } : p));
      } else {
        const role = roles.find(r => r.id === roleId);
        if (!role) {
          skipped = true;
          return prev;
        }
        updatedPerms = [
          ...boardPerms,
          {
            roleId,
            roleName: role.name,
            canRead: type === 'canRead',
            canWrite: type === 'canWrite',
            canDelete: type === 'canDelete',
          },
        ];
      }
      return { ...prev, [boardId]: updatedPerms };
    });

    if (skipped || updatedPerms.length === 0) return;

    // 최신 상태를 대기열에 적재(직전 변경 coalescing). 진행 중 저장이 없으면 즉시 시작하고,
    // 진행 중이면 끝난 뒤 runSave가 이어서 저장하므로 토글이 드롭되지 않는다(기존 버그 수정).
    pendingRef.current.set(boardId, updatedPerms);
    if (!inFlightRef.current.has(boardId)) {
      runSave(boardId);
    }
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
