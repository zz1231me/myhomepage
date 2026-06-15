import { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications, type Notification } from '../api/notifications';
import { useAuthStore } from '../store/auth';

// 30초 간격 폴링 — 서버가 푸시 채널이 없으므로 주기적으로 새 알림을 확인한다.
const POLL_INTERVAL = 30_000;

export function useRealtimeNotifications() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [newNotification, setNewNotification] = useState<Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // 마지막으로 인지한 최대 알림 id. 첫 폴링에서는 기준선만 잡아 기존 알림이
  // 토스트로 쏟아지는 것을 막는다.
  const lastSeenIdRef = useRef<number | null>(null);

  const clearNew = useCallback(() => setNewNotification(null), []);
  const resetCount = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    if (!isAuthenticated) {
      // 로그아웃 시 상태 초기화 (다음 로그인에서 기준선 재설정)
      lastSeenIdRef.current = null;
      setNewNotification(null);
      setUnreadCount(0);
      return;
    }

    let active = true;

    const poll = async () => {
      try {
        const result = await getNotifications(undefined, 20);
        if (!active) return;

        const list: Notification[] = result?.notifications ?? [];
        setUnreadCount(result?.unreadCount ?? 0);

        const latest = list[0]; // id DESC 정렬이라 [0]이 최신
        if (!latest) return;

        if (lastSeenIdRef.current === null) {
          // 첫 폴링: 기준선만 설정(토스트 표시 안 함)
          lastSeenIdRef.current = latest.id;
          return;
        }

        if (latest.id > lastSeenIdRef.current) {
          // 새 알림 — 읽지 않은 것만 토스트로 노출
          if (!latest.isRead) setNewNotification(latest);
          lastSeenIdRef.current = latest.id;
        }
      } catch {
        // 폴링 실패(네트워크 일시 오류 등)는 조용히 무시 — 다음 주기에 재시도
      }
    };

    void poll(); // 마운트 즉시 1회(기준선 설정)
    const intervalId = setInterval(() => void poll(), POLL_INTERVAL);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  return { newNotification, unreadCount, clearNew, resetCount };
}
