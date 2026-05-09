import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRequests } from '../../../hooks/useRequests';
import Icon from '../../../components/ui/Icon';
import { fmtDate, fmtRelative } from '../../../utils/dates';
import { STATUS } from '../../../utils/status';
import Pill from '../../../components/ui/Pill';
import Avatar from '../../../components/ui/Avatar';

function KPI({ value, label, sub, accent, highlight }) {
  return (
    <div className={`kpi accent-${accent}${highlight ? ' kpi-pulse' : ''}`}>
      <div className="kpi-val">{value}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function RequestRow({ r, onOpen }) {
  return (
    <tr onClick={() => onOpen(r.id)} style={{ cursor: 'pointer' }}>
      <td><div className="doc-num">№ {r.id}</div></td>
      <td>
        <div className="doc-title">{r.docType?.title}</div>
        <div className="doc-num">{r.docType?.category}</div>
      </td>
      <td><Pill status={r.status} /></td>
      <td className="muted">{fmtRelative(r.updatedAt)}</td>
    </tr>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: requests, loading } = useRequests();

  const counts = {
    all: requests.length,
    review: requests.filter(r => ['review', 'sent'].includes(r.status)).length,
    revise: requests.filter(r => r.status === 'revise').length,
    done: requests.filter(r => r.status === 'done').length,
  };

  const recent = [...requests].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);
  const needsAttention = requests.filter(r => r.status === 'revise');
  const firstName = user?.fullName?.split(' ')[1] || user?.fullName?.split(' ')[0] || 'студент';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">Главная</div>
          <h1>Здравствуйте, <em style={{ fontStyle: 'italic', color: 'var(--bordo)' }}>{firstName}</em>.</h1>
          <p className="lede">Сегодня {fmtDate(new Date().toISOString())}. У вас {needsAttention.length > 0 ? `${needsAttention.length} заявка требует доработки` : 'нет заявок, требующих внимания'}.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => navigate('/student/templates')}><Icon name="folder" size={16} /> Шаблоны</button>
          <button className="btn primary" onClick={() => navigate('/student/new')}><Icon name="plus" size={16} /> Новая заявка</button>
        </div>
      </div>

      <div className="kpi-row">
        <KPI accent="bordo"  value={counts.all}    label="Всего заявок"   sub="за всё время" />
        <KPI accent="gold"   value={counts.review} label="В обработке"    sub="ждут ответа от ВУЗа" />
        <KPI accent="orange" value={counts.revise} label="На доработке"   sub="требуют ваших правок" highlight={counts.revise > 0} />
        <KPI accent="green"  value={counts.done}   label="Готово"         sub="можно скачать" />
      </div>

      {needsAttention.length > 0 && (
        <div className="callout">
          <div className="callout-ico"><Icon name="warn" size={20} /></div>
          <div className="callout-body">
            <b>Сотрудник вернул заявку на доработку</b>
            <span>«{needsAttention[0].docType?.title}» — комментарий от {needsAttention[0].thread?.slice(-1)[0]?.author || 'деканата'}.</span>
          </div>
          <button className="btn primary sm" onClick={() => navigate(`/student/requests/${needsAttention[0].id}`)}>Открыть</button>
        </div>
      )}

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h3>Последние заявки</h3>
            <button className="btn ghost sm" onClick={() => navigate('/student/requests')}>
              Все заявки <Icon name="arrow" size={14} />
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>
          ) : recent.length === 0 ? (
            <div className="empty" style={{ padding: '40px 20px' }}><div className="ico">∅</div><div>Заявок пока нет</div></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Номер</th>
                  <th>Документ</th>
                  <th style={{ width: 150 }}>Статус</th>
                  <th style={{ width: 110 }}>Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => <RequestRow key={r.id} r={r} onOpen={id => navigate(`/student/requests/${id}`)} />)}
              </tbody>
            </table>
          )}
        </section>

        <section className="card card-pad quick-card">
          <div className="quick-head"><h3>Быстрые действия</h3></div>
          <div className="quick-list">
            {[
              { slug: 'cert-study',   label: 'Справка с места учёбы',     hint: '1–3 дня' },
              { slug: 'cert-tax',     label: 'Справка об оплате',          hint: 'для НДФЛ' },
              { slug: 'cert-army',    label: 'Справка для военкомата',     hint: 'форма 26' },
              { slug: 'app-retake',   label: 'Заявление на пересдачу',     hint: 'требуется шаблон' },
            ].map(q => (
              <button key={q.slug} className="quick-item" onClick={() => navigate(`/student/new?docId=${q.slug}`)}>
                <div className="quick-ico"><Icon name="file" size={18} /></div>
                <div className="quick-text">
                  <div className="t">{q.label}</div>
                  <div className="h">{q.hint}</div>
                </div>
                <Icon name="chevR" size={16} />
              </button>
            ))}
          </div>
          <hr className="divider" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="folder" size={20} />
            <div style={{ flex: 1, fontSize: 13 }}>
              Нужен <b>образец заявления</b>? Скачайте шаблон, заполните и приложите к заявке.
            </div>
            <button className="btn sm" onClick={() => navigate('/student/templates')}>Открыть</button>
          </div>
        </section>
      </div>
    </>
  );
}
