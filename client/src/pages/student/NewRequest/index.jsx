import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationsContext';
import { useDocTypes } from '../../../hooks/useDocTypes';
import { useTemplates } from '../../../hooks/useTemplates';
import { requestsApi } from '../../../api/requests';
import { attachmentsApi } from '../../../api/attachments';
import { templatesApi } from '../../../api/templates';
import Icon from '../../../components/ui/Icon';
import FileChip from '../../../components/ui/FileChip';

const DRAFT_KEY = 'new-request-draft';

function saveDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export default function NewRequest() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const { data: docTypes, loading: dtLoading } = useDocTypes();
  const { data: templates } = useTemplates();

  const draft = loadDraft();
  const [step, setStep] = useState(0);
  const [docId, setDocId] = useState(params.get('docId') || draft?.docId || null);
  const [purpose, setPurpose] = useState(draft?.purpose || '');
  const [copies, setCopies] = useState(draft?.copies || 1);
  const [delivery, setDelivery] = useState(draft?.delivery || 'ELECTRONIC');
  const [recipient, setRecipient] = useState(draft?.recipient || '');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const doc = docTypes.find(d => d.slug === docId || d.id === docId);
  const needsTemplate = doc?.requiresTemplate;
  const docTemplate = templates.find(t => t.docType?.slug === docId || t.docTypeId === doc?.id);

  const STEPS = [
    { t: 'Тип документа',   s: 'Что вам нужно' },
    { t: 'Параметры',       s: 'Цель и детали' },
    needsTemplate ? { t: 'Файл', s: 'Заполненный шаблон' } : null,
    { t: 'Подтверждение',   s: 'Проверка и отправка' },
  ].filter(Boolean);

  // Авто-сохранение черновика
  useEffect(() => {
    if (docId) saveDraft({ docId, purpose, copies, delivery, recipient });
  }, [docId, purpose, copies, delivery, recipient]);

  // Если пришли со slug — найти id типа документа
  const resolvedDocId = doc?.id || null;

  const canNext = () => {
    if (step === 0) return !!doc;
    if (step === 1) return purpose.trim().length > 5;
    if (needsTemplate && step === 2) return files.length > 0;
    return true;
  };

  const submit = async (asDraft) => {
    if (!resolvedDocId) return;
    setSubmitting(true);
    try {
      const { data: req } = await requestsApi.create({
        docTypeId: resolvedDocId,
        purpose,
        copies,
        delivery,
        recipient: recipient || undefined,
        status: asDraft ? 'DRAFT' : 'SENT',
      });

      // Загружаем файлы
      for (const f of files) {
        if (f._file) {
          await attachmentsApi.upload(req.id, f._file);
        }
      }

      clearDraft();
      notify(asDraft ? 'Черновик сохранён' : 'Заявка успешно отправлена', 'success');
      navigate('/student/requests');
    } catch (err) {
      notify(err?.response?.data?.error?.message || 'Ошибка при создании заявки', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!docTemplate) return;
    try {
      const { data: blob } = await templatesApi.download(docTemplate.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = docTemplate.filename; a.click();
      URL.revokeObjectURL(url);
    } catch { notify('Ошибка скачивания шаблона', 'error'); }
  };

  const handleDownloadFilled = async () => {
    if (!docTemplate) return;
    try {
      const { data: blob } = await templatesApi.getFilled(docTemplate.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Шаблон_${doc.title}.docx`; a.click();
      URL.revokeObjectURL(url);
    } catch { notify('Ошибка скачивания автозаполненного шаблона', 'error'); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">Заявки · Новая</div>
          <h1>Новая заявка</h1>
          <p className="lede">Заполните форму — заявка попадёт в работу к специалисту деканата.</p>
        </div>
        <button className="btn ghost" onClick={() => navigate('/student/dashboard')}><Icon name="x" size={14} /> Отмена</button>
      </div>

      <div className="wizard">
        <aside className="steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-num">{i < step ? <Icon name="check" size={14} /> : i + 1}</div>
              <div>
                <div className="step-t">{s.t}</div>
                <div className="step-s">{s.s}</div>
              </div>
            </div>
          ))}
        </aside>

        <main className="wiz-pane">
          {step === 0 && (
            <StepType docId={docId} setDocId={setDocId} docTypes={docTypes} loading={dtLoading} />
          )}
          {step === 1 && (
            <StepParams doc={doc} user={user} purpose={purpose} setPurpose={setPurpose}
              copies={copies} setCopies={setCopies} delivery={delivery} setDelivery={setDelivery}
              recipient={recipient} setRecipient={setRecipient} />
          )}
          {needsTemplate && step === 2 && (
            <StepFile doc={doc} docTemplate={docTemplate} files={files} setFiles={setFiles}
              onDownload={handleDownloadTemplate} onDownloadFilled={handleDownloadFilled} />
          )}
          {step === STEPS.length - 1 && (
            <StepReview doc={doc} user={user} purpose={purpose} copies={copies}
              delivery={delivery} files={files} recipient={recipient} />
          )}

          <div className="wiz-foot">
            <button className="btn ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
              <Icon name="arrowL" size={14} /> Назад
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              {step === STEPS.length - 1 ? (
                <>
                  <button className="btn" onClick={() => submit(true)} disabled={submitting}>Сохранить черновик</button>
                  <button className="btn primary" onClick={() => submit(false)} disabled={submitting}>
                    <Icon name="send" size={14} /> {submitting ? 'Отправка…' : 'Отправить заявку'}
                  </button>
                </>
              ) : (
                <button className="btn primary" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                  Далее <Icon name="arrow" size={14} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function StepType({ docId, setDocId, docTypes, loading }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>;
  const cats = [...new Set(docTypes.map(d => d.category))];
  return (
    <>
      <h2>Какой документ вам нужен?</h2>
      <p className="lede">Выберите один из доступных типов. Документы с пометкой «требуется шаблон» нужно заполнить и приложить к заявке.</p>
      {cats.map(cat => (
        <div key={cat} className="cat-block">
          <div className="cat-title">{cat}</div>
          <div className="doc-grid">
            {docTypes.filter(d => d.category === cat).map(d => (
              <button key={d.id} className={`doc-card ${(docId === d.id || docId === d.slug) ? 'on' : ''}`} onClick={() => setDocId(d.slug)}>
                <div className="doc-icon">{d.requiresTemplate ? '✎' : '✱'}</div>
                <div className="doc-info">
                  <div className="nm">{d.title}</div>
                  <div className="ds">{d.description}</div>
                  <div className="meta">
                    <span><Icon name="clock" size={12} /> {d.processingDays}</span>
                    {d.requiresTemplate && <span className="meta-tpl">требуется шаблон</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function StepParams({ doc, user, purpose, setPurpose, copies, setCopies, delivery, setDelivery, recipient, setRecipient }) {
  return (
    <>
      <h2>Параметры заявки</h2>
      <p className="lede">Уточните, для чего нужен документ — это поможет деканату оформить его правильно.</p>
      <div className="form-grid">
        <div className="field">
          <label>Цель / для предъявления</label>
          <textarea className="textarea" value={purpose} onChange={e => setPurpose(e.target.value)}
            placeholder="Например: Для предъявления в банк (ипотечная заявка)" />
          <div className="hint">Опишите, куда и зачем нужен документ.</div>
        </div>
        {!doc?.requiresTemplate && (
          <div className="field">
            <label>Куда направить (организация-получатель)</label>
            <input className="input" value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder="Например: ПАО Сбербанк" />
          </div>
        )}
        <div className="form-row">
          <div className="field">
            <label>Количество экземпляров</label>
            <select className="select" value={copies} onChange={e => setCopies(+e.target.value)}>
              <option value="1">1 экземпляр</option>
              <option value="2">2 экземпляра</option>
              <option value="3">3 экземпляра</option>
            </select>
          </div>
          <div className="field">
            <label>Способ получения</label>
            <select className="select" value={delivery} onChange={e => setDelivery(e.target.value)}>
              <option value="ELECTRONIC">Электронно (с подписью)</option>
              <option value="PAPER">Лично в деканате</option>
            </select>
          </div>
        </div>
        <div className="info-box">
          <Icon name="info" size={16} />
          <div>
            <b>Срок изготовления:</b> {doc?.processingDays}.
            После отправки заявка попадёт в очередь специалиста деканата.
          </div>
        </div>
      </div>
    </>
  );
}

function StepFile({ doc, docTemplate, files, setFiles, onDownload, onDownloadFilled }) {
  const handlePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFiles([...files, { name: file.name, size: `${Math.round(file.size / 1024)} КБ`, _file: file }]);
    e.target.value = '';
  };

  return (
    <>
      <h2>Заполненный шаблон</h2>
      <p className="lede">Скачайте шаблон, заполните в Word и прикрепите сюда. Также можно приложить дополнительные документы.</p>
      {docTemplate && (
        <div className="tpl-banner">
          <div className="tpl-ico"><Icon name="file" size={20} /></div>
          <div className="tpl-body">
            <b>Шаблон: {doc.title}</b>
            <span>{docTemplate.filename} · обновлён {new Date(docTemplate.uploadedAt).toLocaleDateString('ru-RU')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onDownload}><Icon name="download" size={14} /> Скачать шаблон</button>
            <button className="btn ghost" onClick={onDownloadFilled}><Icon name="sparkle" size={14} /> С автозаполнением</button>
          </div>
        </div>
      )}
      <label className={`uploader ${files.length ? 'has-files' : ''}`} style={{ cursor: 'pointer' }}>
        <Icon name="upload" size={28} />
        <div className="up-t">Перетащите файл сюда или нажмите, чтобы выбрать</div>
        <div className="up-s">DOCX, PDF, JPG, PNG · до 10 МБ</div>
        <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handlePick} />
      </label>
      {files.length > 0 && (
        <div className="files-list">
          {files.map((f, i) => (
            <FileChip key={i} file={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}
    </>
  );
}

function StepReview({ doc, user, purpose, copies, delivery, files, recipient }) {
  return (
    <>
      <h2>Проверьте и отправьте</h2>
      <p className="lede">Убедитесь, что всё указано верно. После отправки заявку нельзя будет редактировать.</p>
      <div className="review-card">
        <div className="rv-row"><span>Тип документа</span><b>{doc?.title}</b></div>
        <div className="rv-row"><span>Студент</span><b>{user?.fullName}</b></div>
        <div className="rv-row"><span>Группа · зач. книжка</span><b>{user?.group?.name} · № {user?.recordBook}</b></div>
        <div className="rv-row"><span>Цель</span><b>{purpose}</b></div>
        {recipient && <div className="rv-row"><span>Получатель</span><b>{recipient}</b></div>}
        <div className="rv-row"><span>Экземпляров</span><b>{copies}</b></div>
        <div className="rv-row"><span>Получение</span><b>{delivery === 'ELECTRONIC' ? 'Электронно (с подписью)' : 'Лично в деканате'}</b></div>
        {files.length > 0 && (
          <div className="rv-row"><span>Файлы</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f, i) => <FileChip key={i} file={f} />)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
