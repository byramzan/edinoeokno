const { sendMail } = require('../config/mailer');

const STATUS_SUBJECTS = {
  SENT:   'Заявка принята в обработку',
  REVIEW: 'Ваша заявка принята в работу',
  REVISE: 'Заявка возвращена на доработку',
  DONE:   'Документ готов',
  REJECT: 'Заявка отклонена',
};

function makeHtml(title, body) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
<h2 style="color:#8B2231">${title}</h2>
<p>${body}</p>
<hr/>
<small style="color:#888">Единое Окно — ЧГУ им. А.А. Кадырова</small>
</body></html>`;
}

async function notifyStatusChange(request, newStatus, comment) {
  const student = request.student;
  if (!student?.email) return;

  const subject = STATUS_SUBJECTS[newStatus] || 'Изменение статуса заявки';
  let body = `Заявка <b>№ ${request.id}</b> (${request.docType?.title}) изменила статус.`;

  if (newStatus === 'SENT') {
    body = `Ваша заявка <b>№ ${request.id}</b> («${request.docType?.title}») успешно отправлена в деканат. Ожидайте ответа.`;
  } else if (newStatus === 'REVIEW') {
    body = `Ваша заявка <b>№ ${request.id}</b> принята в работу специалистом деканата.`;
  } else if (newStatus === 'REVISE') {
    body = `Сотрудник деканата вернул заявку <b>№ ${request.id}</b> на доработку.<br><br><b>Комментарий:</b> ${comment || '—'}`;
  } else if (newStatus === 'DONE') {
    body = `Документ по заявке <b>№ ${request.id}</b> готов! Войдите в систему, чтобы скачать его.`;
  } else if (newStatus === 'REJECT') {
    body = `Заявка <b>№ ${request.id}</b> отклонена.<br><br><b>Причина:</b> ${comment || '—'}`;
  }

  await sendMail({
    to: student.email,
    subject,
    html: makeHtml(subject, body),
  });
}

async function notifyNewRequest(request, staffEmail) {
  if (!staffEmail) return;
  const subject = 'Новая заявка в очереди';
  const body = `Студент <b>${request.student?.fullName}</b> подал заявку <b>№ ${request.id}</b> («${request.docType?.title}»).`;
  await sendMail({ to: staffEmail, subject, html: makeHtml(subject, body) });
}

module.exports = { notifyStatusChange, notifyNewRequest };
