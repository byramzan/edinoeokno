require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const requestsRoutes = require('./routes/requests.routes');
const templatesRoutes = require('./routes/templates.routes');
const docTypesRoutes = require('./routes/doc-types.routes');
const usersRoutes = require('./routes/users.routes');
const wsServer = require('./config/ws');

const app = express();

// ── Security middleware ────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate limiting (auth routes) ───────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Слишком много попыток входа. Повторите через 15 минут.' } },
});

// ── Parsers ────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/requests', requestsRoutes);
app.use('/api/v1/templates', templatesRoutes);
app.use('/api/v1/doc-types', docTypesRoutes);
app.use('/api/v1/users', usersRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'UNSUPPORTED_MEDIA_TYPE') {
    return res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Неподдерживаемый формат файла' } });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Файл превышает 10 МБ' } });
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message,
    },
  });
});

const PORT = parseInt(process.env.PORT || '3000');
const server = app.listen(PORT, () => {
  console.log(`[server] Запущен на порту ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
wsServer.attach(server);

module.exports = app;
