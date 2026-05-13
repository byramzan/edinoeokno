const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const prisma = require('../config/db');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const requestService = require('../services/request.service');
const notificationService = require('../services/notification.service');
const docxService = require('../services/docx.service');
const wsServer = require('../config/ws');

const createSchema = z.object({
  docTypeId: z.string().uuid(),
  purpose: z.string().optional(),
  copies: z.number().int().min(1).max(10).default(1),
  delivery: z.enum(['ELECTRONIC', 'PAPER']).default('ELECTRONIC'),
  recipient: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT']).default('DRAFT'),
});

const statusSchema = z.object({
  status: z.enum(['REVIEW', 'REVISE', 'DONE', 'REJECT', 'SENT']),
  comment: z.string().optional(),
});

const commentSchema = z.object({
  text: z.string().min(1, 'Текст комментария обязателен'),
});

// Форматирование заявки для ответа API
function formatRequest(r) {
  return {
    id: r.id,
    status: r.status.toLowerCase(),
    docType: r.docType
      ? { id: r.docType.id, slug: r.docType.slug, title: r.docType.title, category: r.docType.category, requiresTemplate: r.docType.requiresTemplate, processingDays: r.docType.processingDays }
      : null,
    purpose: r.purpose,
    copies: r.copies,
    delivery: r.delivery.toLowerCase(),
    recipient: r.recipient,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    student: r.student ? {
      id: r.student.id,
      fullName: r.student.fullName,
      shortName: r.student.shortName,
      email: r.student.email,
      group: r.student.group ? { name: r.student.group.name, course: r.student.group.course } : null,
      faculty: r.student.studentFaculty ? { name: r.student.studentFaculty.name } : null,
      recordBook: r.student.recordBook,
      course: r.student.group?.course,
    } : null,
    assignedTo: r.assignedTo ? { id: r.assignedTo.id, fullName: r.assignedTo.fullName, shortName: r.assignedTo.shortName } : null,
    attachments: (r.attachments || []).map(a => ({
      id: a.id, filename: a.filename, sizeBytes: a.sizeBytes, mimeType: a.mimeType, uploadedAt: a.uploadedAt, isResult: a.isResult,
    })),
    thread: (r.thread || []).map(m => ({
      id: m.id,
      kind: m.kind.toLowerCase(),
      text: m.text,
      at: m.createdAt,
      author: m.author ? (m.kind === 'STAFF' ? m.author.shortName + ', деканат' : m.kind === 'STUDENT' ? m.author.fullName : null) : null,
    })),
  };
}

const INCLUDE_FULL = {
  docType: true,
  student: { include: { group: true, studentFaculty: true } },
  assignedTo: true,
  attachments: { orderBy: { uploadedAt: 'asc' } },
  thread: { include: { author: true }, orderBy: { createdAt: 'asc' } },
};

// GET /requests
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, docTypeId, q, page = '1', limit = '20', sort = 'updatedAt:desc' } = req.query;
    const user = req.user;
    const pageN = Math.max(1, parseInt(page));
    const limitN = Math.min(100, Math.max(1, parseInt(limit)));
    const [sortField, sortDir] = sort.split(':');

    const where = {};

    if (user.role === 'STUDENT') {
      where.studentId = user.id;
    } else if (user.role === 'STAFF') {
      // Сотрудник видит только заявки своего факультета
      const staffUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (staffUser?.staffFacultyId) {
        where.facultyId = staffUser.staffFacultyId;
      }
    }

    if (status) {
      const statuses = status.split(',').map(s => s.toUpperCase());
      where.status = { in: statuses };
    }
    if (docTypeId) where.docTypeId = docTypeId;
    if (q) {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { student: { fullName: { contains: q, mode: 'insensitive' } } },
        { docType: { title: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        include: INCLUDE_FULL,
        orderBy: { [sortField || 'updatedAt']: sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (pageN - 1) * limitN,
        take: limitN,
      }),
    ]);

    res.json({
      data: data.map(formatRequest),
      meta: { total, page: pageN, limit: limitN, pages: Math.ceil(total / limitN) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /requests
router.post('/', authMiddleware, roleMiddleware('STUDENT'), validate(createSchema), async (req, res, next) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { group: true, studentFaculty: true },
    });

    if (!student?.studentFacultyId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Факультет студента не определён' } });
    }

    const request = await requestService.createRequest(req.body, student);

    if (request.status === 'SENT') {
      const fullReq = await prisma.request.findUnique({ where: { id: request.id }, include: { ...INCLUDE_FULL, docType: true } });
      notificationService.notifyStatusChange(
        { ...fullReq, student, docType: fullReq.docType },
        'SENT',
        null
      ).catch(() => {});
    }

    const full = await prisma.request.findUnique({ where: { id: request.id }, include: INCLUDE_FULL });
    res.status(201).json(formatRequest(full));
  } catch (err) {
    next(err);
  }
});

// GET /requests/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const request = await prisma.request.findUnique({ where: { id: req.params.id }, include: INCLUDE_FULL });
    if (!request) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

    // Проверка доступа
    if (req.user.role === 'STUDENT' && request.studentId !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }
    if (req.user.role === 'STAFF') {
      const staffUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (staffUser?.staffFacultyId && request.facultyId !== staffUser.staffFacultyId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN' } });
      }
    }

    res.json(formatRequest(request));
  } catch (err) {
    next(err);
  }
});

// GET /requests/:id/filled — скачать шаблон, заполненный данными студента
router.get('/:id/filled', authMiddleware, async (req, res, next) => {
  try {
    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { group: true, studentFaculty: true } },
        docType: true,
      },
    });
    if (!request) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

    // Проверка доступа: автор или сотрудник факультета
    if (req.user.role === 'STUDENT' && request.studentId !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }

    const template = await prisma.docTemplate.findFirst({
      where: { docTypeId: request.docTypeId, isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!template) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Шаблон для данного типа документа не найден' } });
    }

    if (!fs.existsSync(template.storagePath)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Файл шаблона не найден на сервере' } });
    }

    const buffer = await docxService.fillTemplate(template.storagePath, request.student);
    const safeName = encodeURIComponent(`${request.docType.title}_${request.student.shortName}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// PATCH /requests/:id/status
router.patch('/:id/status', authMiddleware, roleMiddleware('STAFF', 'ADMIN'), validate(statusSchema), async (req, res, next) => {
  try {
    const { status, comment } = req.body;
    const request = await requestService.updateStatus(req.params.id, status, comment, req.user.id);

    notificationService.notifyStatusChange(request, status, comment).catch(() => {});

    const full = await prisma.request.findUnique({ where: { id: req.params.id }, include: INCLUDE_FULL });
    const formatted = formatRequest(full);
    wsServer.broadcast(req.params.id, formatted);
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// POST /requests/:id/comment
router.post('/:id/comment', authMiddleware, validate(commentSchema), async (req, res, next) => {
  try {
    const request = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

    if (req.user.role === 'STUDENT' && request.studentId !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }

    const kind = req.user.role === 'STAFF' ? 'STAFF' : req.user.role === 'STUDENT' ? 'STUDENT' : 'STAFF';
    await prisma.threadMessage.create({
      data: { requestId: req.params.id, authorId: req.user.id, kind, text: req.body.text },
    });

    // Обновляем updatedAt заявки
    await prisma.request.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } });

    const full = await prisma.request.findUnique({ where: { id: req.params.id }, include: INCLUDE_FULL });
    const formatted = formatRequest(full);
    wsServer.broadcast(req.params.id, formatted);
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// POST /requests/:id/resubmit — студент повторно отправляет заявку после доработки
router.post('/:id/resubmit', authMiddleware, roleMiddleware('STUDENT'), async (req, res, next) => {
  try {
    const request = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    if (request.studentId !== req.user.id) return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    if (request.status !== 'REVISE') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Повторная отправка возможна только для заявок со статусом «На доработке»' } });
    }

    await prisma.request.update({ where: { id: req.params.id }, data: { status: 'SENT', updatedAt: new Date() } });
    await prisma.threadMessage.create({
      data: { requestId: req.params.id, authorId: req.user.id, kind: 'STUDENT', text: 'Заявка доработана и отправлена повторно.' },
    });

    const full = await prisma.request.findUnique({ where: { id: req.params.id }, include: INCLUDE_FULL });
    const formatted = formatRequest(full);
    wsServer.broadcast(req.params.id, formatted);
    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// DELETE /requests/:id
router.delete('/:id', authMiddleware, roleMiddleware('STUDENT'), async (req, res, next) => {
  try {
    const request = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    if (request.studentId !== req.user.id) return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    if (request.status !== 'DRAFT') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Можно удалять только черновики' } });
    }

    await prisma.threadMessage.deleteMany({ where: { requestId: req.params.id } });
    await prisma.attachment.deleteMany({ where: { requestId: req.params.id } });
    await prisma.request.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Вложения ─────────────────────────────────────────────────────────────────

function setUploadDir(subdir) {
  return (req, res, next) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const dir = path.join(uploadDir, 'requests', req.params.id, subdir);
    fs.mkdirSync(dir, { recursive: true });
    req.uploadDir = dir;
    next();
  };
}

// POST /requests/:id/attachments
router.post('/:id/attachments', authMiddleware, setUploadDir('attachments'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Файл не загружен' } });

    const attachment = await prisma.attachment.create({
      data: {
        requestId: req.params.id,
        filename: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        storagePath: req.file.path,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        isResult: false,
      },
    });
    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
});

// GET /requests/:id/attachments/:fileId
router.get('/:id/attachments/:fileId', authMiddleware, async (req, res, next) => {
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.fileId } });
    if (!attachment || attachment.requestId !== req.params.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    }
    res.download(attachment.storagePath, attachment.filename);
  } catch (err) {
    next(err);
  }
});

// DELETE /requests/:id/attachments/:fileId
router.delete('/:id/attachments/:fileId', authMiddleware, async (req, res, next) => {
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.fileId } });
    if (!attachment) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    if (attachment.requestId !== req.params.id) return res.status(403).json({ error: { code: 'FORBIDDEN' } });

    try { fs.unlinkSync(attachment.storagePath); } catch {}
    await prisma.attachment.delete({ where: { id: req.params.fileId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /requests/:id/result — загрузка готового документа (только staff)
router.post('/:id/result', authMiddleware, roleMiddleware('STAFF', 'ADMIN'), setUploadDir('results'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Файл не загружен' } });

    const attachment = await prisma.attachment.create({
      data: {
        requestId: req.params.id,
        filename: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        storagePath: req.file.path,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        isResult: true,
      },
    });
    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
