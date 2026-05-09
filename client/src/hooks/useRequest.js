import { useState, useEffect, useCallback, useRef } from 'react';
import { requestsApi } from '../api/requests';
import { getAccessToken } from '../api/index';
import { useAuth } from '../context/AuthContext';

const WS_BASE = '/ws';

export function useRequest(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!id || !user) return;
    try {
      const { data: res } = await requestsApi.getOne(id);
      if (!unmountedRef.current) { setData(res); setError(null); }
    } catch (err) {
      if (!unmountedRef.current)
        setError(err?.response?.data?.error?.message || 'Ошибка загрузки');
    } finally {
      if (!unmountedRef.current) setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    if (!id || !user) return;

    function connect() {
      if (unmountedRef.current) return;
      const token = getAccessToken();
      if (!token) return;

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${location.host}${WS_BASE}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', requestId: id }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'request_updated' && !unmountedRef.current) {
            setData(msg.data);
          }
        } catch {}
      };

      ws.onerror = () => {};

      ws.onclose = (e) => {
        if (e.code === 4001 || unmountedRef.current) return;
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [id, user]);

  const refetch = useCallback(async () => {
    await fetchOnce();
  }, [fetchOnce]);

  return { data, loading, error, refetch };
}
