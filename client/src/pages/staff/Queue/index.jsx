import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequests } from '../../../hooks/useRequests';
import Icon from '../../../components/ui/Icon';
import Pill from '../../../components/ui/Pill';
import Avatar from '../../../components/ui/Avatar';
import { fmtRelative } from '../../../utils/dates';

function StaffRow({ r, onOpen }) {
  return (
    <tr onClick={() => onOpen(r.id)} style={{ cursor: 'pointer' }}>
      <td><div className="doc-num">№ {r.id}</div></td>
      <td>
        <div className="doc-title">{r.docType?.title}</div>
        <div className="doc-num">{r.docType?.category}</div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={r.student?.fullName || '?'} size={28} color="paper" />
          <div>
            <div className="doc-title">{r.student?.fullName?.split(' ').slice(0,2).join(' ')}</div>
            <div className="doc-num">{r.student?.group?.name} · {r.student?.recordBook}</div>
          </div>
        </div>
      </td>
      <td><Pill status={r.status} /></td>
      <td className="muted">{fmtRelative(r.updatedAt)}</td>
      <td><Icon name="chevR" size={14} /></td>
    </tr>
  );
}

export default function StaffQueue({ archiveMode }) {
  const navigate = useNavigate();
  const { data: allRequests, loading } = useRequests({}, true);
  const [tab, setTab] = useState(archiveMode ? 'closed' : 'new');
  const [q, setQ] = useState('');

  const requests = archiveMode
    ? allRequests.filter(r => ['done', 'reject'].includes(r.status))
    : allRequests;

  const filtered = requests.filter(r => {
    if (tab === 'new'    && r.status !== 'sent')                          return false;
    if (tab === 'review' && r.status !== 'review')                        return false;
    if (tab === 'revise' && r.status !== 'revise')                        return false;
    if (tab === 'closed' && !['done','reject'].includes(r.status))        return false;
    if (q && !r.docType?.title?.toLowerCase().includes(q.toLowerCase())
          && !r.student?.fullName?.toLowerCase().includes(q.toLowerCase())
          && !r.id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = {
    new:    requests.filter(r => r.status === 'sent').length,
    review: requests.filter(r => r.status === 'review').length,
    revise: requests.filter(r => r.status === 'revise').length,
    closed: requests.filter(r => ['done','reject'].includes(r.status)).length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">{archiveMode ? 'Архив' : 'Очередь заявок'}</div>
          <h1>{archiveMode ? 'Архив' : 'Очередь'}</h1>
          <p className="lede">Деканат ФИТ · все заявки от студентов вашего факультета.</p>
        </div>
      </div>

      <div className="tabs">
        {!archiveMode && <>
          <button className={tab === 'new'    ? 'on' : ''} onClick={() => setTab('new')}>Новые <span className="ct">{counts.new}</span></button>
          <button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>В работе <span className="ct">{counts.review}</span></button>
          <button className={tab === 'revise' ? 'on' : ''} onClick={() => setTab('revise')}>На доработке <span className="ct">{counts.revise}</span></button>
        </>}
        <button className={tab === 'closed'  ? 'on' : ''} onClick={() => setTab('closed')}>Закрытые <span className="ct">{counts.closed}</span></button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="search">
            <Icon name="search" size={14} />
            <input placeholder="Поиск по студенту, типу, номеру…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn"><Icon name="filter" size={14} /> Фильтры</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ padding: 40 }}><div className="ico">∅</div><div>Заявок не найдено</div></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Номер</th>
                <th>Документ</th>
                <th>Студент</th>
                <th style={{ width: 150 }}>Статус</th>
                <th style={{ width: 110 }}>Обновлено</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => <StaffRow key={r.id} r={r} onOpen={id => navigate(`/staff/requests/${id}`)} />)}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
