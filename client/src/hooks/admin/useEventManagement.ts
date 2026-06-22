import { useState, useRef } from 'react';
import api from '../../api/axios';
import { Event, EventPermission } from '../../types/admin.types';

interface EventUpdatePayload {
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  calendarId?: string;
  body?: string;
  isAllday?: boolean;
  category?: string;
  isReadOnly?: boolean;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export const useEventManagement = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [permissions, setPermissions] = useState<EventPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  // 저장 직렬화용 — 저장 진행 중 들어온 후속 토글의 최신 상태를 적재(coalescing)해 클릭 유실 방지
  const savingRef = useRef(false);
  const pendingRef = useRef<EventPermission[] | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/admin/events');
      setEvents(res.data.data || res.data);
      setDataLoaded(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('이벤트 목록 오류:', err);
      setFetchError('이벤트 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/admin/events/permissions');
      setPermissions(res.data.data || res.data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('이벤트 권한 오류:', err);
    }
  };

  const updateEvent = async (id: number, updates: EventUpdatePayload) => {
    await api.put(`/admin/events/${id}`, updates);
    await fetchEvents();
  };

  const deleteEvent = async (id: number) => {
    await api.delete(`/admin/events/${id}`);
    await fetchEvents();
  };

  // 최신 권한 상태를 직렬로 저장. 저장 중 쌓인 변경은 끝난 뒤 이어서 저장(클릭 유실/out-of-order 방지)
  const flushPermissionSave = async (perms: EventPermission[]) => {
    savingRef.current = true;
    setSaving(true);
    const validPermissions = perms.map(p => ({
      roleId: p.roleId,
      canCreate: p.canCreate,
      canRead: p.canRead,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
    }));
    try {
      await api.put('/admin/events/permissions', { permissions: validPermissions });
    } catch (err) {
      // 저장 실패 시 서버 상태로 롤백
      if (import.meta.env.DEV) console.error('이벤트 권한 저장 실패 — 서버 상태로 롤백', err);
      pendingRef.current = null; // 서버 상태를 다시 읽으므로 대기분은 폐기
      await fetchPermissions();
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        await flushPermissionSave(next);
      } else {
        setSaving(false);
      }
    }
  };

  const updatePermission = (
    roleId: string,
    type: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete'
  ) => {
    // ⚠ setState 업데이터 내부에서 API 호출 금지 (StrictMode 이중 실행). 업데이터로 낙관적 갱신 +
    //    최신 상태 capture. 저장 중이면 드롭하지 않고 대기열에 적재해 이어서 저장한다(기존 드롭 버그 수정).
    let updated: EventPermission[] = [];
    setPermissions(prev => {
      updated = prev.map(p => (p.roleId === roleId ? { ...p, [type]: !p[type] } : p));
      return updated;
    });
    if (updated.length === 0) return;
    if (savingRef.current) {
      pendingRef.current = updated;
      return;
    }
    void flushPermissionSave(updated);
  };

  return {
    events,
    permissions,
    loading,
    saving,
    dataLoaded,
    fetchEvents,
    fetchPermissions,
    updateEvent,
    deleteEvent,
    updatePermission,
    setDataLoaded,
    fetchError,
  };
};
