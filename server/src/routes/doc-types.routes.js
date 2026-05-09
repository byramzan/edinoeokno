const express = require('express');
const router = express.Router();
const { z } = require('zod');
const prisma = require('../config/db');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const validate = require('../middleware/validate');

const docTypeSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  requiresTemplate: z.boolean().default(false),
  processingDays: z.string().min(1),
  isActive: z.boolean().default(true),
});

// GET /doc-types
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const docTypes = await prisma.docType.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
    res.json({ data: docTypes });
  } catch (err) {
    next(err);
  }
});

// GET /doc-types/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const dt = await prisma.docType.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    });
    if (!dt) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    res.json(dt);
  } catch (err) {
    next(err);
  }
});

// POST /doc-types
router.post('/', authMiddleware, roleMiddleware('ADMIN'), validate(docTypeSchema), async (req, res, next) => {
  try {
    const dt = await prisma.docType.create({ data: req.body });
    res.status(201).json(dt);
  } catch (err) {
    next(err);
  }
});

// PATCH /doc-types/:id
router.patch('/:id', authMiddleware, roleMiddleware('ADMIN'), async (req, res, next) => {
  try {
    const dt = await prisma.docType.update({ where: { id: req.params.id }, data: req.body });
    res.json(dt);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
