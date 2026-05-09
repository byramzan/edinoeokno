import { createContext, useContext, useState, useCallback } from 'react';

const NotificationsContext = createContext(null);

let idSeq = 0;

export function NotificationsProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = 'info') => {
    const id = ++idSeq;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <NotificationsContext.Provider value={{ notify }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </NotificationsContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'success' ? '#2A6B53' : t.type === 'error' ? '#8B2231' : '#3a3a3a',
          color: '#fff', padding: '12px 16px', borderRadius: 8,
          display: 'flex', alignItems: 'flex-start', gap: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontSize: 14, lineHeight: 1.4,
        }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, marginTop: 1,
          }}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
