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
  // permissions의 최신 스냅샷(ref). setState updater의 비동기 실행에 의존해 토글 결과를 읽으면
  // 저장이 누락될 수 있어, ref에서 동기적으로 최신 상태를 읽어 결정적으로 계산한다.
  const permissionsRef = useRef<Record<string, BoardPermission[]>>({});

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
    // 보드별 N요청(GET /boards/:id/permissions) 대신 1요청으로 전체 권한을 받아 boardId로 그룹핑.
    // 이전엔 보드 수만큼 병렬 GET이 adminLimiter(100/15분)에 걸려 일부 보드가 빈 권한으로
    // 로드되고, 그 상태로 토글하면 부분 저장이 일어나는 트리거가 됐다(PR: 부분 저장 보존으로
    // 데이터 유실은 막았지만, 빈 로드 자체를 예방).
    const permissionsState: Record<string, BoardPermission[]> = {};
    for (const board of boardList) permissionsState[board.id] = []; // 권한 없는 보드도 표시
    try {
      const res = await api.get('/admin/board-permissions');
      const rows = (res.data.data ?? res.data ?? []) as Array<
        BoardPermission & { boardId: string }
      >;
      for (const row of rows) {
        if (!permissionsState[row.boardId]) permissionsState[row.boardId] = [];
        permissionsState[row.boardId].push(row);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('게시판 권한 일괄 조회 실패:', err);
      setFetchError('게시판 권한을 불러오지 못했습니다.');
    }
    permissionsRef.current = permissionsState;
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
    // ⚠️ 최신 상태를 ref에서 동기적으로 읽어 계산한다. 예전엔 setState updater 안에서 채운
    //    updatedPerms를 setState 직후 동기적으로 읽었는데, React가 updater를 지연 실행하면
    //    updatedPerms가 빈 배열인 채로 읽혀 저장이 스킵되고(낙관적 UI만 갱신) 새로고침 시
    //    토글이 사라지는 간헐적 버그가 있었다.
    const boardPerms = permissionsRef.current[boardId] || [];
    const existingIndex = boardPerms.findIndex(p => p.roleId === roleId);
    let updatedPerms: BoardPermission[];
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
      if (!role) return;
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

    const nextState = { ...permissionsRef.current, [boardId]: updatedPerms };
    permissionsRef.current = nextState;
    setPermissions(nextState);

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
        const serverPerms = res.data.data || res.data;
        permissionsRef.current = { ...permissionsRef.current, [boardId]: serverPerms };
        setPermissions(prev => ({ ...prev, [boardId]: serverPerms }));
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
