import { useState, useEffect, useCallback, useRef } from 'react';
import { requestsApi } from '../api/requests';
import { useAuth } from '../context/AuthContext';

export function useRequests(filters = {}, autoRefresh = false) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: res } = await requestsApi.getList(filtersRef.current);
      setData(res.data);
      setMeta(res.meta);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Авто-обновление каждые 60с для сотрудника
  useEffect(() => {
    if (!autoRefresh || !user) return;
    const timer = setInterval(fetch, 60000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetch, user]);

  return { data, meta, loading, error, refetch: fetch };
}
