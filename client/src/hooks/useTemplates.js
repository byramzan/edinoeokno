import { useState, useEffect, useCallback } from 'react';
import { templatesApi } from '../api/templates';
import { useAuth } from '../context/AuthContext';

export function useTemplates(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: res } = await templatesApi.getList(filters);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
