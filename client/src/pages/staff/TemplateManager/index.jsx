import { useState, useRef } from 'react';
import { useTemplates } from '../../../hooks/useTemplates';
import { useDocTypes } from '../../../hooks/useDocTypes';
import { templatesApi } from '../../../api/templates';
import { useNotifications } from '../../../context/NotificationsContext';
import Icon from '../../../components/ui/Icon';

export default function TemplateManager() {
  const { notify } = useNotifications();
  const { data: templates, loading, refetch } = useTemplates({ active: 'false' });
  const { data: docTypes } = useDocTypes();
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDocTypeId, setUploadDocTypeId] = useState('');
  const fileRef = useRef(null);

  const filtered = templates.filter(t =>
    !q || t.docType?.title?.toLowerCase().includes(q.toLowerCase())
  );

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file || !uploadDocTypeId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('docTypeId', uploadDocTypeId);
      await templatesApi.upload(form);
      notify('Шаблон загружен', 'success');
      setShowModal(false);
      setUploadDocTypeId('');
      if (fileRef.current) fileRef.current.value = '';
      refetch();
    } catch { notify('Ошибка загрузки шаблона', 'error'); }
    finally { setUploading(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Деактивировать шаблон?')) return;
    try {
      await templatesApi.deactivate(id);
      notify('Шаблон деактивирован', 'success');
      refetch();
    } catch { notify('Ошибка', 'error'); }
  };

  const downloadTemplate = async (t) => {
    try {
      const { data: blob } = await templatesApi.download(t.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = t.filename; a.click();
      URL.revokeObjectURL(url);
    } catch { notify('Ошибка скачивания', 'error'); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">Шаблоны</div>
          <h1>Управление шаблонами</h1>
          <p className="lede">Загрузка и управление DOCX-шаблонами документов.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search">
            <Icon name="search" size={14} />
            <input placeholder="Поиск шаблона…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Icon name="upload" size={14} /> Загрузить шаблон
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Шаблон</th>
                <th style={{ width: 130 }}>Категория</th>
                <th style={{ width: 80 }}>Версия</th>
                <th style={{ width: 100 }}>Размер</th>
                <th style={{ width: 100 }}>Статус</th>
                <th style={{ width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Шаблонов нет</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="doc-title">{t.docType?.title}</div>
                    <div className="doc-num">{t.filename}</div>
                  </td>
                  <td className="muted">{t.docType?.category}</td>
                  <td className="muted">v{t.version}</td>
                  <td className="muted">{t.sizeBytes ? `${Math.round(t.sizeBytes / 1024)} КБ` : '—'}</td>
                  <td>
                    <span className={`pill ${t.isActive ? 'done' : 'reject'}`}>{t.isActive ? 'Активен' : 'Архив'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm" onClick={() => downloadTemplate(t)}><Icon name="download" size={13} /></button>
                      {t.isActive && (
                        <button className="btn sm danger" onClick={() => deactivate(t.id)}>
                          <Icon name="trash" size={13} /> Деактивировать
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-body" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h3>Загрузить новый шаблон</h3>
              <button className="btn ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpload} style={{ padding: '20px 24px 24px' }}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Тип документа</label>
                <select className="select" value={uploadDocTypeId} onChange={e => setUploadDocTypeId(e.target.value)} required>
                  <option value="">Выберите тип документа…</option>
                  {docTypes.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 20 }}>
                <label>DOCX-файл шаблона</label>
                <input ref={fileRef} type="file" accept=".docx" className="input" required />
                <div className="hint" style={{ marginTop: 4 }}>
                  Только формат .docx. В документе замените пустые поля на переменные:<br />
                  <span style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
                    {'{{FULL_NAME}}'} — ФИО студента<br />
                    {'{{SHORT_NAME}}'} — Фамилия И.О.<br />
                    {'{{GROUP}}'} — группа (напр. ПИ-3)<br />
                    {'{{COURSE}}'} — курс (напр. 3)<br />
                    {'{{RECORD_BOOK}}'} — номер зачётной книжки<br />
                    {'{{FACULTY}}'} — название факультета<br />
                    {'{{DATE}}'} — дата выдачи<br />
                    {'{{ACADEMIC_YEAR}}'} — учебный год (напр. 2025–2026)<br />
                    {'{{RECTOR}}'} — ФИО ректора
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn primary" disabled={uploading}>
                  {uploading ? 'Загрузка…' : 'Загрузить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
