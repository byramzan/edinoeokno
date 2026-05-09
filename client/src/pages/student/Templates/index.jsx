import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../../../hooks/useTemplates';
import { templatesApi } from '../../../api/templates';
import { useNotifications } from '../../../context/NotificationsContext';
import Icon from '../../../components/ui/Icon';

export default function StudentTemplates() {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { data: templates, loading } = useTemplates();
  const [q, setQ] = useState('');
  const [view, setView] = useState('grid');

  const filtered = templates.filter(t => !q || t.docType?.title?.toLowerCase().includes(q.toLowerCase()));

  const downloadTemplate = async (t) => {
    try {
      const { data: blob } = await templatesApi.download(t.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = t.filename; a.click();
      URL.revokeObjectURL(url);
    } catch { notify('Ошибка скачивания', 'error'); }
  };

  const useTemplate = (t) => {
    navigate(`/student/new?docId=${t.docType?.slug || t.docTypeId}`);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">Шаблоны</div>
          <h1>Библиотека шаблонов</h1>
          <p className="lede">Скачайте образец заявления, заполните в Word и приложите к новой заявке.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search">
            <Icon name="search" size={14} />
            <input placeholder="Поиск шаблона…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="view-toggle">
            <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}><Icon name="grid" size={14} /></button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Icon name="list" size={14} /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty" style={{ padding: 60 }}><div className="ico">◇</div><div>Шаблонов не найдено</div></div>
      )}

      {view === 'grid' ? (
        <div className="tpl-grid">
          {filtered.map(t => (
            <div key={t.id} className="tpl-card">
              <div className="tpl-card-paper">
                <div className="tpl-paper-lines">
                  {[...Array(7)].map((_, i) => <div key={i} className="tpl-line" style={{ width: `${60 + (i * 13) % 35}%` }}></div>)}
                </div>
                <div className="tpl-paper-stamp">ЧГУ</div>
              </div>
              <div className="tpl-card-body">
                <div className="tpl-cat">{t.docType?.category}</div>
                <div className="tpl-title">{t.docType?.title}</div>
                <div className="tpl-meta">
                  <span>{t.filename}</span>
                  <span>·</span>
                  <span>{t.sizeBytes ? `${Math.round(t.sizeBytes / 1024)} КБ` : '—'}</span>
                </div>
                <div className="tpl-meta" style={{ marginTop: 4 }}>
                  Обновлён {new Date(t.uploadedAt).toLocaleDateString('ru-RU')} · {t.downloadCount} скачиваний
                </div>
                <div className="tpl-actions">
                  <button className="btn primary sm" onClick={() => downloadTemplate(t)}><Icon name="download" size={14} /> Скачать</button>
                  <button className="btn sm" onClick={() => useTemplate(t)}>Использовать</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Шаблон</th>
                <th style={{ width: 130 }}>Категория</th>
                <th style={{ width: 100 }}>Размер</th>
                <th style={{ width: 140 }}>Обновлён</th>
                <th style={{ width: 220 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="doc-title">{t.docType?.title}</div>
                    <div className="doc-num">{t.filename}</div>
                  </td>
                  <td className="muted">{t.docType?.category}</td>
                  <td className="muted">{t.sizeBytes ? `${Math.round(t.sizeBytes / 1024)} КБ` : '—'}</td>
                  <td className="muted">{new Date(t.uploadedAt).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn sm" onClick={() => downloadTemplate(t)}><Icon name="download" size={14} /> Скачать</button>
                      <button className="btn primary sm" onClick={() => useTemplate(t)}>Использовать</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
