import { useState } from 'react';
import api from '../../api/axios';
import { User, Role } from '../../types/admin.types';

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/admin/users');
      setUsers(res.data.data || res.data);
      setDataLoaded(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('사용자 목록 오류:', err);
      setFetchError('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      setRoles(res.data.data || res.data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('권한 목록 오류:', err);
    }
  };

  const addUser = async (userData: {
    id: string;
    name: string;
    role: string;
    password: string;
  }) => {
    await api.post('/admin/users', {
      id: userData.id,
      name: userData.name,
      roleId: userData.role,
      password: userData.password,
    });
    await fetchUsers();
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    await api.put(`/admin/users/${userId}`, { roleId: newRole });
    await fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await api.delete(`/admin/users/${id}`);
    await fetchUsers();
  };

  // 서버가 고정 임시 비밀번호를 설정하고 mustChangePassword 플래그를 켠다(사용자는 로그인 후
  // 강제 변경). 클라가 비밀번호를 만들지 않고 서버가 반환한 임시 비번을 표시한다.
  const resetPassword = async (id: string): Promise<string> => {
    const res = await api.post(`/admin/users/${id}/reset-password`);
    const data = res.data?.data ?? res.data;
    return data?.tempPassword ?? '';
  };

  return {
    users,
    roles,
    loading,
    dataLoaded,
    fetchUsers,
    fetchRoles,
    addUser,
    updateUserRole,
    deleteUser,
    resetPassword,
    setDataLoaded,
    fetchError,
  };
};
