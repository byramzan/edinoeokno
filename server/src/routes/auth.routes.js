const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

function signAccess(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function signRefresh(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET + '_refresh', {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        group: true,
        studentFaculty: true,
        staffFaculty: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Неверный email или пароль' } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Неверный email или пароль' } });
    }

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    res.json({
      accessToken,
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET + '_refresh');
    } catch {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Refresh-токен недействителен' } });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });

    const accessToken = signAccess(user);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', COOKIE_OPTS);
  res.json({ ok: true });
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { group: true, studentFaculty: true, staffFaculty: true },
    });
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    res.json(formatUser(user));
  } catch (err) {
    next(err);
  }
});

function formatUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    shortName: user.shortName,
    recordBook: user.recordBook,
    position: user.position,
    group: user.group ? { id: user.group.id, name: user.group.name, course: user.group.course } : null,
    faculty: user.studentFaculty
      ? { id: user.studentFaculty.id, name: user.studentFaculty.name, shortName: user.studentFaculty.shortName }
      : user.staffFaculty
      ? { id: user.staffFaculty.id, name: user.staffFaculty.name, shortName: user.staffFaculty.shortName }
      : null,
    staffFacultyId: user.staffFacultyId,
    studentFacultyId: user.studentFacultyId,
  };
}

module.exports = router;
