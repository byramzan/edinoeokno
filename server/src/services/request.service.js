const prisma = require('../config/db');

const STATUS_MESSAGES = {
  SENT:   'Заявка создана и отправлена в деканат.',
  REVIEW: 'Заявка принята в работу.',
  REVISE: 'Заявка возвращена студенту на доработку.',
  DONE:   'Заявка закрыта со статусом «Готово».',
  REJECT: 'Заявка отклонена.',
  DRAFT:  'Черновик сохранён.',
};

async function generateRequestId() {
  const year = new Date().getFullYear();
  const prefix = `CGU-${year}-`;
  const last = await prisma.request.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: 'desc' },
  });
  let num = 1;
  if (last) {
    const parts = last.id.split('-');
    num = parseInt(parts[2], 10) + 1;
  }
  return `${prefix}${String(num).padStart(4, '0')}`;
}

async function createRequest(data, student) {
  const id = await generateRequestId();
  const request = await prisma.request.create({
    data: {
      id,
      docTypeId: data.docTypeId,
      facultyId: student.studentFacultyId,
      studentId: student.id,
      status: data.status || 'DRAFT',
      purpose: data.purpose || null,
      copies: data.copies || 1,
      delivery: data.delivery || 'ELECTRONIC',
      recipient: data.recipient || null,
    },
  });

  // Добавляем системное сообщение если сразу отправили
  if (request.status === 'SENT') {
    await addSystemMessage(id, STATUS_MESSAGES.SENT, student.id);
  }

  return request;
}

async function updateStatus(id, status, comment, actorId) {
  const request = await prisma.request.update({
    where: { id },
    data: { status },
    include: {
      student: true,
      assignedTo: true,
      docType: true,
    },
  });

  if (comment) {
    await prisma.threadMessage.create({
      data: {
        requestId: id,
        authorId: actorId,
        kind: 'STAFF',
        text: comment,
      },
    });
  }

  await addSystemMessage(id, STATUS_MESSAGES[status] || 'Статус заявки изменён.', actorId);

  return request;
}

async function addSystemMessage(requestId, text, authorId) {
  return prisma.threadMessage.create({
    data: {
      requestId,
      authorId,
      kind: 'SYSTEM',
      text,
    },
  });
}

module.exports = { generateRequestId, createRequest, updateStatus, addSystemMessage };
