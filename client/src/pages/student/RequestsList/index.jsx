import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequests } from '../../../hooks/useRequests';
import Icon from '../../../components/ui/Icon';
import Pill from '../../../components/ui/Pill';
import { fmtRelative } from '../../../utils/dates';

export default function StudentRequestsList() {
  const navigate = useNavigate();
  const { data: requests, loading } = useRequests();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const filtered = requests.filter(r => {
    if (tab === 'active' && !['draft','sent','review','revise'].includes(r.status)) return false;
    if (tab === 'archive' && !['done','reject'].includes(r.status)) return false;
    if (tab !== 'all' && tab !== 'active' && tab !== 'archive' && r.status !== tab) return false;
    if (q && !r.docType?.title?.toLowerCase().includes(q.toLowerCase()) && !r.id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: requests.length,
    active: requests.filter(r => ['draft','sent','review','revise'].includes(r.status)).length,
    revise: requests.filter(r => r.status === 'revise').length,
    archive: requests.filter(r => ['done','reject'].includes(r.status)).length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">Мои заявки</div>
          <h1>Все заявки</h1>
        </div>
        <button className="btn primary" onClick={() => navigate('/student/new')}><Icon name="plus" size={16} /> Новая заявка</button>
      </div>

      <div className="tabs">
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Все <span className="ct">{counts.all}</span></button>
        <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Активные <span className="ct">{counts.active}</span></button>
        <button className={tab === 'revise' ? 'on' : ''} onClick={() => setTab('revise')}>На доработке <span className="ct">{counts.revise}</span></button>
        <button className={tab === 'archive' ? 'on' : ''} onClick={() => setTab('archive')}>Архив <span className="ct">{counts.archive}</span></button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="search">
            <Icon name="search" size={14} />
            <input placeholder="Поиск по номеру или названию…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn"><Icon name="filter" size={14} /> Фильтры</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ padding: '40px 20px' }}><div className="ico">∅</div><div>Заявок не найдено</div></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Номер</th>
                <th>Документ</th>
                <th style={{ width: 150 }}>Статус</th>
                <th style={{ width: 110 }}>Обновлено</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => navigate(`/student/requests/${r.id}`)} style={{ cursor: 'pointer' }}>
                  <td><div className="doc-num">№ {r.id}</div></td>
                  <td>
                    <div className="doc-title">{r.docType?.title}</div>
                    <div className="doc-num">{r.docType?.category}</div>
                  </td>
                  <td><Pill status={r.status} /></td>
                  <td className="muted">{fmtRelative(r.updatedAt)}</td>
                  <td><Icon name="chevR" size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
