import { useState, useEffect } from 'react';
import { docTypesApi } from '../api/docTypes';
import { useAuth } from '../context/AuthContext';

export function useDocTypes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    docTypesApi.getList()
      .then(({ data: res }) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return { data, loading };
}
