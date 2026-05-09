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
const docxService = require('../services/docx.service');
const templateProcessor = require('../services/template-processor.service');

function formatTemplate(t) {
  return {
    id: t.id,
    docTypeId: t.docTypeId,
    docType: t.docType ? { id: t.docType.id, title: t.docType.title, category: t.docType.category, slug: t.docType.slug } : null,
    version: t.version,
    filename: t.filename,
    sizeBytes: t.sizeBytes,
    uploadedAt: t.createdAt,
    downloadCount: t.downloadCount,
    isActive: t.isActive,
    variables: t.variables,
    uploadedBy: t.uploadedBy ? { id: t.uploadedBy.id, fullName: t.uploadedBy.fullName } : null,
  };
}

// GET /templates
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { category, docTypeId, active = 'true' } = req.query;
    const where = {};
    if (active !== 'false') where.isActive = true;
    if (category) where.docType = { category };
    if (docTypeId) where.docTypeId = docTypeId;

    const templates = await prisma.docTemplate.findMany({
      where,
      include: { docType: true, uploadedBy: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: templates.map(formatTemplate) });
  } catch (err) {
    next(err);
  }
});

// GET /templates/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const t = await prisma.docTemplate.findUnique({
      where: { id: req.params.id },
      include: { docType: true, uploadedBy: true },
    });
    if (!t) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    res.json(formatTemplate(t));
  } catch (err) {
    next(err);
  }
});

// GET /templates/:id/download
router.get('/:id/download', authMiddleware, async (req, res, next) => {
  try {
    const t = await prisma.docTemplate.findUnique({ where: { id: req.params.id } });
    if (!t || !t.isActive) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

    if (!fs.existsSync(t.storagePath)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Файл шаблона не найден на сервере' } });
    }

    await prisma.docTemplate.update({ where: { id: t.id }, data: { downloadCount: { increment: 1 } } });
    res.download(t.storagePath, t.filename);
  } catch (err) {
    next(err);
  }
});

// GET /templates/:id/filled — только для студентов
router.get('/:id/filled', authMiddleware, roleMiddleware('STUDENT'), async (req, res, next) => {
  try {
    const template = await prisma.docTemplate.findUnique({
      where: { id: req.params.id },
      include: { docType: true },
    });
    if (!template || !template.isActive) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

    if (!fs.existsSync(template.storagePath)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Файл шаблона не найден' } });
    }

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { group: true, studentFaculty: true },
    });

    const buffer = await docxService.fillTemplate(template.storagePath, student);

    await prisma.docTemplate.update({ where: { id: template.id }, data: { downloadCount: { increment: 1 } } });

    const safeName = encodeURIComponent(`Шаблон_${template.docType.title}.docx`);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// POST /templates — загрузка нового шаблона (STAFF/ADMIN)
router.post('/', authMiddleware, roleMiddleware('STAFF', 'ADMIN'),
  (req, res, next) => {
    const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'templates');
    fs.mkdirSync(uploadDir, { recursive: true });
    req.uploadDir = uploadDir;
    next();
  },
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'DOCX-файл обязателен' } });

      const { docTypeId, variables } = req.body;
      if (!docTypeId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'docTypeId обязателен' } });

      let parsedVars = [];
      if (variables) {
        try { parsedVars = JSON.parse(variables); } catch {}
      }

      // Автоматически вставляем плейсхолдеры в шаблон
      const processed = await templateProcessor.processTemplate(req.file.path);
      if (processed.changed) {
        parsedVars = processed.variables;
        // Размер файла мог измениться после обработки
        req.file.size = fs.statSync(req.file.path).size;
      }

      // Деактивируем предыдущую версию
      await prisma.docTemplate.updateMany({ where: { docTypeId, isActive: true }, data: { isActive: false } });

      const prev = await prisma.docTemplate.findFirst({ where: { docTypeId }, orderBy: { version: 'desc' } });
      const version = (prev?.version || 0) + 1;

      const t = await prisma.docTemplate.create({
        data: {
          docTypeId,
          version,
          filename: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
          storagePath: req.file.path,
          sizeBytes: req.file.size,
          uploadedById: req.user.id,
          isActive: true,
          variables: parsedVars,
        },
        include: { docType: true, uploadedBy: true },
      });

      res.status(201).json({ ...formatTemplate(t), processed: processed.changed, variables: processed.variables });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /templates/:id
router.patch('/:id', authMiddleware, roleMiddleware('STAFF', 'ADMIN'), async (req, res, next) => {
  try {
    const { variables, isActive } = req.body;
    const data = {};
    if (variables !== undefined) data.variables = variables;
    if (isActive !== undefined) data.isActive = isActive;

    const t = await prisma.docTemplate.update({
      where: { id: req.params.id },
      data,
      include: { docType: true, uploadedBy: true },
    });
    res.json(formatTemplate(t));
  } catch (err) {
    next(err);
  }
});

// DELETE /templates/:id — деактивация (только ADMIN)
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req, res, next) => {
  try {
    await prisma.docTemplate.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
