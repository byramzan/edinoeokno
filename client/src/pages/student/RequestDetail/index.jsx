import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRequest } from '../../../hooks/useRequest';
import { requestsApi } from '../../../api/requests';
import { attachmentsApi } from '../../../api/attachments';
import { useNotifications } from '../../../context/NotificationsContext';
import Icon from '../../../components/ui/Icon';
import Pill from '../../../components/ui/Pill';
import Avatar from '../../../components/ui/Avatar';
import FileChip from '../../../components/ui/FileChip';
import { STATUS } from '../../../utils/status';
import { fmtDate, fmtRelative, fmtTime } from '../../../utils/dates';

export default function StudentRequestDetail() {
  return <RequestDetail role="student" backPath="/student/requests" />;
}

export function StaffRequestDetail() {
  return <RequestDetail role="staff" backPath="/staff/queue" />;
}

function RequestDetail({ role, backPath }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { data: request, loading, error, refetch } = useRequest(id);

  const [comment, setComment] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [showReviseReason, setShowReviseReason] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const threadEndRef = useRef(null);

  // Хуки всегда вызываются до любых ранних return
  const threadLen = request?.thread?.length ?? 0;
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadLen]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>;
  if (error || !request) return <div style={{ padding: 40, textAlign: 'center' }}>Заявка не найдена</div>;

  const r = request;
  const isStudent = role === 'student';

  const downloadFilled = async () => {
    setDownloading(true);
    try {
      const { data: blob } = await requestsApi.getFilled(r.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${r.docType?.title}_${r.student?.shortName ?? ''}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notify('Не удалось скачать документ. Возможно, шаблон ещё не загружен.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await requestsApi.addComment(r.id, comment);
      setComment('');
      await refetch();
    } catch { notify('Ошибка отправки комментария', 'error'); }
    finally { setSending(false); }
  };

  const doAction = async (status, msg) => {
    try {
      await requestsApi.updateStatus(r.id, { status, comment: msg || undefined });
      await refetch();
      notify(status === 'DONE' ? 'Заявка закрыта' : status === 'REJECT' ? 'Заявка отклонена' : 'Статус обновлён', 'success');
    } catch { notify('Ошибка при смене статуса', 'error'); }
  };

  const submitRevise = () => {
    doAction('REVISE', reasonText || 'Просьба доработать заявку.');
    setShowReviseReason(false); setReasonText('');
  };
  const submitReject = () => {
    doAction('REJECT', reasonText || 'Заявка отклонена.');
    setShowRejectReason(false); setReasonText('');
  };
  const submitReopen = () => doAction('SENT', 'Заявка доработана и отправлена повторно.');

  const downloadAttachment = async (att) => {
    try {
      const { data: blob } = await attachmentsApi.download(r.id, att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = att.filename; a.click();
      URL.revokeObjectURL(url);
    } catch { notify('Ошибка скачивания', 'error'); }
  };

  const STAGES = ['draft','sent','review','done'];
  const myIdx = STAGES.indexOf(r.status === 'revise' ? 'review' : r.status === 'reject' ? 'review' : r.status);

  return (
    <>
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <button className="btn ghost sm" onClick={() => navigate(backPath)} style={{ marginBottom: 10 }}>
            <Icon name="arrowL" size={14} /> Назад к списку
          </button>
          <div className="crumbs">Заявка № {r.id}</div>
          <h1 style={{ marginBottom: 8 }}>{r.docType?.title}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Pill status={r.status} large />
            <span className="muted" style={{ fontSize: 13 }}>
              Создана {fmtDate(r.createdAt)} · обновлена {fmtRelative(r.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <main>
          {/* Stages */}
          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <div className="stages">
              {STAGES.map((s, i) => {
                const passed = i <= myIdx;
                const isReject = r.status === 'reject' && s === 'done';
                const label = isReject ? 'Отклонено' : STATUS[s]?.label;
                return (
                  <div key={s} className={`stage ${passed ? 'on' : ''} ${isReject ? 'rejected' : ''} ${i === myIdx && r.status === 'revise' ? 'revise' : ''}`}>
                    <div className="stage-dot">{passed && !isReject ? <Icon name="check" size={14} /> : isReject ? <Icon name="x" size={14} /> : (i + 1)}</div>
                    <div className="stage-lb">{label}</div>
                  </div>
                );
              })}
            </div>
            {r.status === 'revise' && (
              <div className="callout inline">
                <Icon name="warn" size={18} />
                <span><b>Возвращена на доработку.</b> См. комментарий ниже.</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head"><h3>Детали заявки</h3></div>
            <div className="rv-grid">
              <div className="rv-row"><span>Тип документа</span><b>{r.docType?.title}</b></div>
              <div className="rv-row"><span>Категория</span><b>{r.docType?.category}</b></div>
              <div className="rv-row"><span>Цель</span><b>{r.purpose || '—'}</b></div>
              <div className="rv-row"><span>Экземпляров</span><b>{r.copies}</b></div>
              <div className="rv-row"><span>Получение</span><b>{r.delivery === 'electronic' ? 'Электронно (с подписью)' : 'Лично в деканате'}</b></div>
              <div className="rv-row"><span>Срок</span><b>{r.docType?.processingDays}</b></div>
              {r.attachments?.length > 0 && (
                <div className="rv-row">
                  <span>Прикреплённые файлы</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {r.attachments.map(a => (
                      <FileChip key={a.id} file={a} downloadable onDownload={() => downloadAttachment(a)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thread */}
          <div className="card">
            <div className="card-head"><h3>История и комментарии</h3></div>
            <div className="thread">
              {(!r.thread || r.thread.length === 0) && (
                <div className="empty" style={{ padding: 30 }}><div>Пока сообщений нет.</div></div>
              )}
              {(r.thread || []).map((m, i, arr) => (
                <div key={m.id} className={`th-msg th-${m.kind}`}>
                  {m.kind === 'system' ? (
                    <div className="th-system"><Icon name="dot" size={6} /> {m.text} · <span className="muted">{fmtRelative(m.at)}</span></div>
                  ) : (
                    <>
                      <Avatar name={m.author || '?'} size={36} color={m.kind === 'staff' ? 'green' : 'gold'} />
                      <div className="th-bubble">
                        <div className="th-head">
                          <b>{m.author}</b>
                          <span className="muted">{fmtRelative(m.at)} · {fmtTime(m.at)}</span>
                        </div>
                        <div className="th-text">{m.text}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>
            <div className="th-input">
              <textarea className="textarea" placeholder={isStudent ? 'Написать сотруднику…' : 'Написать студенту…'}
                value={comment} onChange={e => setComment(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button className="btn ghost sm"><Icon name="paperclip" size={14} /> Прикрепить файл</button>
                <button className="btn primary" onClick={sendComment} disabled={!comment.trim() || sending}>
                  <Icon name="send" size={14} /> {sending ? 'Отправка…' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside>
          {/* Staff actions */}
          {!isStudent && ['sent','review'].includes(r.status) && (
            <div className="card card-pad action-card">
              <div className="action-title">Действия по заявке</div>
              <button className="btn green" style={{ width: '100%' }} onClick={() => doAction('DONE')}>
                <Icon name="check" size={14} /> Принять и закрыть
              </button>
              <button className="btn" style={{ width: '100%' }} onClick={() => setShowReviseReason(true)}>
                <Icon name="refresh" size={14} /> На доработку
              </button>
              <button className="btn danger" style={{ width: '100%' }} onClick={() => setShowRejectReason(true)}>
                <Icon name="x" size={14} /> Отклонить
              </button>
              {showReviseReason && (
                <div className="reason-box">
                  <label>Что нужно доработать?</label>
                  <textarea className="textarea" rows="3" value={reasonText} onChange={e => setReasonText(e.target.value)}
                    placeholder="Например: укажите дату, приложите ведомость…" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn sm ghost" onClick={() => setShowReviseReason(false)}>Отмена</button>
                    <button className="btn primary sm" onClick={submitRevise}>Отправить на доработку</button>
                  </div>
                </div>
              )}
              {showRejectReason && (
                <div className="reason-box">
                  <label>Причина отклонения</label>
                  <textarea className="textarea" rows="3" value={reasonText} onChange={e => setReasonText(e.target.value)}
                    placeholder="Опишите причину отклонения…" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn sm ghost" onClick={() => setShowRejectReason(false)}>Отмена</button>
                    <button className="btn danger sm" onClick={submitReject}>Отклонить</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Student revise panel */}
          {isStudent && r.status === 'revise' && (
            <div className="card card-pad action-card">
              <div className="action-title">Доработка</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Сотрудник вернул заявку. Внесите правки и отправьте повторно.
              </p>
              <button className="btn primary" style={{ width: '100%' }} onClick={submitReopen}>
                <Icon name="send" size={14} /> Отправить повторно
              </button>
            </div>
          )}

          {/* Filled document download */}
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="action-title">Заполненный документ</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              {isStudent
                ? 'Шаблон автоматически заполнен вашими данными.'
                : 'Шаблон заполнен данными студента.'}
            </p>
            <button className="btn" style={{ width: '100%' }} onClick={downloadFilled} disabled={downloading}>
              <Icon name="download" size={14} /> {downloading ? 'Скачивание…' : 'Скачать справку'}
            </button>
          </div>

          {/* Info card */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-head"><h3>{isStudent ? 'Исполнитель' : 'Студент'}</h3></div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isStudent ? (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar name="Тазуева А.И." size={42} color="green" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Тазуева А.И.</div>
                      <div className="muted" style={{ fontSize: 12 }}>Специалист деканата ФИТ</div>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    📍 Главный корпус, ауд. 207<br />
                    🕐 Пн–Пт, 9:00–17:00<br />
                    ✉ dean-fit@chesu.ru
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar name={r.student?.fullName || '?'} size={42} color="paper" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.student?.fullName}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{r.student?.faculty?.name}</div>
                    </div>
                  </div>
                  <div className="rv-mini">
                    <div className="rv-mini-row"><span>Курс</span><b>{r.student?.group?.course}</b></div>
                    <div className="rv-mini-row"><span>Группа</span><b>{r.student?.group?.name}</b></div>
                    <div className="rv-mini-row"><span>Зачётная книжка</span><b>№ {r.student?.recordBook}</b></div>
                  </div>
                  <button className="btn sm" style={{ width: '100%' }}><Icon name="user" size={14} /> Открыть карточку</button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
