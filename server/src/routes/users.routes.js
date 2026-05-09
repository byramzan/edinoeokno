const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { z } = require('zod');
const prisma = require('../config/db');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const validate = require('../middleware/validate');

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['STUDENT', 'STAFF', 'ADMIN']),
  fullName: z.string().min(1),
  shortName: z.string().min(1),
  recordBook: z.string().optional(),
  groupId: z.string().uuid().optional(),
  studentFacultyId: z.string().uuid().optional(),
  position: z.string().optional(),
  staffFacultyId: z.string().uuid().optional(),
});

// Все маршруты только для ADMIN
router.use(authMiddleware, roleMiddleware('ADMIN'));

// GET /users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { group: true, studentFaculty: true, staffFaculty: true },
      orderBy: { fullName: 'asc' },
    });
    res.json({ data: users.map(u => ({ ...u, passwordHash: undefined })) });
  } catch (err) {
    next(err);
  }
});

// GET /users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { group: true, studentFaculty: true, staffFaculty: true },
    });
    if (!u) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    res.json({ ...u, passwordHash: undefined });
  } catch (err) {
    next(err);
  }
});

// POST /users
router.post('/', validate(createUserSchema), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const u = await prisma.user.create({ data: { ...rest, passwordHash } });
    res.status(201).json({ ...u, passwordHash: undefined });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 12);
    const u = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ ...u, passwordHash: undefined });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id/deactivate
router.patch('/:id/deactivate', async (req, res, next) => {
  try {
    const u = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ...u, passwordHash: undefined });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
