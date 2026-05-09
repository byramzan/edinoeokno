import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRequests } from '../../../hooks/useRequests';
import Icon from '../../../components/ui/Icon';
import Pill from '../../../components/ui/Pill';
import Avatar from '../../../components/ui/Avatar';
import { fmtRelative } from '../../../utils/dates';

function KPIStaff({ value, label, sub, accent, highlight }) {
  return (
    <div className={`kpi accent-${accent}${highlight ? ' kpi-pulse' : ''}`}>
      <div className="kpi-val">{value}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function StaffRequestRow({ r, onOpen }) {
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
    </tr>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: requests, loading } = useRequests({}, true);

  const counts = {
    new:    requests.filter(r => r.status === 'sent').length,
    review: requests.filter(r => r.status === 'review').length,
    revise: requests.filter(r => r.status === 'revise').length,
    today:  requests.filter(r => {
      const rel = fmtRelative(r.updatedAt);
      return rel === 'только что' || rel.includes('ч назад') || rel.includes('мин назад');
    }).length,
  };

  const newest = requests.filter(r => r.status === 'sent').slice(0, 4);
  const inWork = requests.filter(r => r.status === 'review').slice(0, 4);
  const firstName = user?.fullName?.split(' ')[1] || '';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">Главная</div>
          <h1>Здравствуйте, <em style={{ fontStyle: 'italic', color: 'var(--bordo)' }}>{firstName}</em>.</h1>
          <p className="lede">В очереди {counts.new + counts.review} заявок. {counts.new > 0 ? `${counts.new} ждут принятия в работу.` : 'Все новые заявки приняты в работу.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn"><Icon name="archive" size={16} /> Отчёт за неделю</button>
          <button className="btn primary" onClick={() => navigate('/staff/queue')}><Icon name="inbox" size={16} /> Открыть очередь</button>
        </div>
      </div>

      <div className="kpi-row">
        <KPIStaff value={counts.new}    label="Новые"       sub="требуют принятия"       accent="bordo" highlight={counts.new > 0} />
        <KPIStaff value={counts.review} label="В работе"    sub="у вас на рассмотрении"  accent="gold" />
        <KPIStaff value={counts.revise} label="На доработке" sub="ждём ответ студента"   accent="orange" />
        <KPIStaff value={counts.today}  label="Активность"  sub="заявок за сегодня"      accent="green" />
      </div>

      <div className="dash-grid staff">
        <section className="card">
          <div className="card-head">
            <h3>Новые заявки</h3>
            <button className="btn ghost sm" onClick={() => navigate('/staff/queue')}>Вся очередь <Icon name="arrow" size={14} /></button>
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>
          ) : newest.length > 0 ? (
            <table className="tbl">
              <thead><tr><th style={{ width: 130 }}>Номер</th><th>Документ</th><th>Студент</th><th style={{ width: 150 }}>Статус</th><th style={{ width: 110 }}>Обновлено</th></tr></thead>
              <tbody>{newest.map(r => <StaffRequestRow key={r.id} r={r} onOpen={id => navigate(`/staff/requests/${id}`)} />)}</tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 40 }}><div>Новых заявок нет 🎉</div></div>
          )}
        </section>

        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3>Активность за неделю</h3>
          <div className="bar-chart">
            {[12, 18, 9, 22, 16, 14, counts.new + counts.review].map((v, i) => (
              <div key={i} className="bar-col">
                <div className="bar" style={{ height: `${v * 4}px` }}>
                  {i === 6 && <span className="bar-now">сегодня</span>}
                </div>
                <div className="bar-lb">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</div>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <div className="staff-stats">
            <div><b>91%</b><span>заявок закрыто в срок</span></div>
            <div><b>1.4 дня</b><span>среднее время ответа</span></div>
            <div><b>247</b><span>заявок за апрель</span></div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h3>В работе у вас</h3>
          <span className="muted" style={{ fontSize: 13 }}>{inWork.length} заявок</span>
        </div>
        {inWork.length > 0 ? (
          <table className="tbl">
            <thead><tr><th style={{ width: 130 }}>Номер</th><th>Документ</th><th>Студент</th><th style={{ width: 150 }}>Статус</th><th style={{ width: 110 }}>Обновлено</th></tr></thead>
            <tbody>{inWork.map(r => <StaffRequestRow key={r.id} r={r} onOpen={id => navigate(`/staff/requests/${id}`)} />)}</tbody>
          </table>
        ) : (
          <div className="empty" style={{ padding: 30 }}><div>Нет заявок в работе</div></div>
        )}
      </section>
    </>
  );
}
