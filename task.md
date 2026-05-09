# Техническое задание на разработку платформы «Единое Окно»
### ЧГУ им. А.А. Кадырова — Электронный деканат

**Версия:** 1.0  
**Статус:** К исполнению  
**Язык интерфейса:** Русский  
**Стек:** React (фронтенд) · Node.js / Express (бэкенд) · PostgreSQL (БД)

---

## Содержание

1. [Общее описание системы](#1-общее-описание-системы)
2. [Технический стек](#2-технический-стек)
3. [Структура проекта](#3-структура-проекта)
4. [База данных](#4-база-данных)
5. [Бэкенд — REST API](#5-бэкенд--rest-api)
6. [Фронтенд — React-приложение](#6-фронтенд--react-приложение)
7. [Модуль шаблонов DOCX](#7-модуль-шаблонов-docx)
8. [Аутентификация и авторизация](#8-аутентификация-и-авторизация)
9. [Файловое хранилище](#9-файловое-хранилище)
10. [Уведомления](#10-уведомления)
11. [Требования к безопасности](#11-требования-к-безопасности)
12. [Требования к гибкости и расширяемости](#12-требования-к-гибкости-и-расширяемости)
13. [Дизайн и UI](#13-дизайн-и-ui)
14. [Нефункциональные требования](#14-нефункциональные-требования)
15. [Этапы разработки](#15-этапы-разработки)
16. [Глоссарий](#16-глоссарий)

---

## 1. Общее описание системы

### 1.1 Назначение

Веб-платформа «Единое Окно» — это система дистанционной подачи и обработки документальных обращений студентов в деканат университета. Студент создаёт заявку онлайн и отслеживает её статус; сотрудник деканата обрабатывает входящие заявки, оставляет комментарии, принимает или отклоняет их.

### 1.2 Роли пользователей

| Роль | Описание | Возможности |
|------|----------|-------------|
| `student` | Студент университета | Создавать заявки, скачивать шаблоны, автоматически заполнять DOCX, прикреплять файлы, отслеживать статусы, переписываться с сотрудником |
| `staff` | Специалист деканата | Обрабатывать входящую очередь, менять статусы, отправлять комментарии, загружать готовые документы, управлять шаблонами |
| `admin` | Администратор системы | Управлять пользователями, факультетами, типами документов; просматривать системные логи |

### 1.3 Основные сценарии использования

**Сценарий А — Запрос готовой справки (студент):**
Логин → Дашборд → «Новая заявка» → выбор типа справки → заполнение параметров → отправка → уведомление об изменении статуса → скачивание готового документа.

**Сценарий Б — Подача заявления по шаблону (студент):**
Логин → «Шаблоны» → скачать DOCX-шаблон → автозаполнение данными профиля (опционально) → загрузить заполненный файл → создать заявку → отправка.

**Сценарий В — Обработка заявки (сотрудник):**
Логин → Очередь → открыть заявку → изучить материалы → принять в работу / вернуть на доработку / отклонить → прикрепить готовый документ (при необходимости).

---

## 2. Технический стек

### 2.1 Фронтенд

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 18.x | UI-фреймворк |
| React Router | 6.x | Клиентская маршрутизация (SPA) |
| Vite | 5.x | Сборщик и dev-сервер |
| Axios | 1.x | HTTP-клиент для API-запросов |
| docx-preview | актуальная | Просмотр DOCX прямо в браузере |
| React Hook Form | 7.x | Управление формами и валидация |
| date-fns | 3.x | Форматирование дат (русская локаль) |
| CSS переменные | — | Дизайн-система (из переданных `.css`-файлов) |

> **Важно:** Весь CSS и структура компонентов взяты из переданного прототипа (`styles.css`, `styles-login.css`, `styles-extra.css`) и не изменяются. Реализуется полная функциональность поверх существующего дизайна.

### 2.2 Бэкенд

| Технология | Версия | Назначение |
|------------|--------|------------|
| Node.js | 20 LTS | Среда выполнения |
| Express | 4.x | HTTP-сервер и маршрутизация |
| PostgreSQL | 16.x | Реляционная база данных |
| Prisma ORM | 5.x | Схема БД, миграции, типобезопасные запросы |
| Multer | 1.x | Загрузка файлов (multipart/form-data) |
| docxtemplater | 3.x | Генерация DOCX из шаблонов |
| pizzip | актуальная | Работа с ZIP (используется совместно с docxtemplater) |
| jsonwebtoken | 9.x | Подпись и верификация JWT-токенов |
| bcrypt | 5.x | Хеширование паролей |
| nodemailer | 6.x | Отправка email-уведомлений |
| Zod | 3.x | Валидация входных данных |
| cors | 2.x | CORS-заголовки |
| helmet | 7.x | HTTP-заголовки безопасности |
| dotenv | 16.x | Конфигурация через переменные окружения |

### 2.3 Инфраструктура

- **Сервер:** Linux (Ubuntu 22.04+), минимум 2 vCPU / 4 GB RAM
- **Файловое хранилище:** локальная файловая система (`/uploads`) или S3-совместимое (MinIO) — настраивается через `.env`
- **Запуск:** `docker-compose` (опционально) для PostgreSQL + Node.js
- **Переменные окружения:** конфигурация через `.env` (шаблон `.env.example` в репозитории)

---

## 3. Структура проекта

```
edinoe-okno/
├── client/                         # React-приложение (Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/             # Переиспользуемые UI-компоненты
│   │   │   ├── ui/                 # Icon, Pill, Avatar, FileChip, EmptyState
│   │   │   ├── layout/             # Sidebar, AppShell, Header
│   │   │   └── forms/              # Field, Select, Uploader, etc.
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   ├── student/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── RequestsList/
│   │   │   │   ├── NewRequest/     # Мастер-форма (3–4 шага)
│   │   │   │   ├── RequestDetail/
│   │   │   │   └── Templates/
│   │   │   └── staff/
│   │   │       ├── Dashboard/
│   │   │       ├── Queue/
│   │   │       ├── RequestDetail/
│   │   │       └── TemplateManager/
│   │   ├── hooks/                  # useAuth, useRequests, useTemplates, etc.
│   │   ├── api/                    # Функции-обёртки над Axios
│   │   │   ├── auth.js
│   │   │   ├── requests.js
│   │   │   ├── templates.js
│   │   │   └── files.js
│   │   ├── context/                # AuthContext, NotificationsContext
│   │   ├── utils/                  # formatDate, formatRelative (ru-RU)
│   │   ├── styles/                 # styles.css, styles-login.css, styles-extra.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                         # Express-приложение
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # Prisma Client
│   │   │   ├── storage.js          # Конфигурация файлового хранилища
│   │   │   └── mailer.js           # Nodemailer транспорт
│   │   ├── middleware/
│   │   │   ├── auth.js             # Верификация JWT
│   │   │   ├── role.js             # Проверка роли
│   │   │   ├── validate.js         # Zod-валидация
│   │   │   └── upload.js           # Multer-конфигурация
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── requests.routes.js
│   │   │   ├── templates.routes.js
│   │   │   ├── files.routes.js
│   │   │   └── users.routes.js
│   │   ├── controllers/            # Логика обработчиков маршрутов
│   │   ├── services/
│   │   │   ├── docx.service.js     # Генерация DOCX через docxtemplater
│   │   │   ├── notification.service.js
│   │   │   └── request.service.js
│   │   └── app.js                  # Express-приложение
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── uploads/                    # Директория для файлов (gitignored)
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 4. База данных

### 4.1 Схема Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Факультет ──────────────────────────────────────────
model Faculty {
  id        String   @id @default(uuid())
  name      String
  shortName String
  createdAt DateTime @default(now())

  groups    Group[]
  students  User[]    @relation("StudentFaculty")
  staff     User[]    @relation("StaffFaculty")
  requests  Request[]
}

// ── Учебная группа ─────────────────────────────────────
model Group {
  id        String  @id @default(uuid())
  name      String                     // «ПИ-3»
  course    Int
  faculty   Faculty @relation(fields: [facultyId], references: [id])
  facultyId String

  students  User[]
}

// ── Пользователь ───────────────────────────────────────
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  passwordHash   String
  role           Role     @default(STUDENT)
  fullName       String
  shortName      String                // «Магомедов А.Р.»
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Поля студента (null для сотрудников)
  recordBook     String?               // Номер зачётной книжки
  group          Group?   @relation(fields: [groupId], references: [id])
  groupId        String?
  studentFaculty Faculty? @relation("StudentFaculty", fields: [studentFacultyId], references: [id])
  studentFacultyId String?

  // Поля сотрудника (null для студентов)
  position       String?               // «Специалист деканата ФИТ»
  staffFaculty   Faculty? @relation("StaffFaculty", fields: [staffFacultyId], references: [id])
  staffFacultyId String?

  // Связи
  requests       Request[] @relation("StudentRequests")
  assignedReqs   Request[] @relation("AssignedRequests")
  threadMessages ThreadMessage[]
  uploadedTemplates DocTemplate[]
}

enum Role {
  STUDENT
  STAFF
  ADMIN
}

// ── Тип документа ─────────────────────────────────────
model DocType {
  id           String  @id @default(uuid())
  slug         String  @unique              // «cert-study», «app-academic»
  title        String
  category     String                       // «Справки», «Заявления», «Прочее»
  description  String
  requiresTemplate Boolean @default(false)
  processingDays String                     // «1–3 дня»
  isActive     Boolean @default(true)

  requests     Request[]
  templates    DocTemplate[]
}

// ── Шаблон документа (DOCX) ───────────────────────────
model DocTemplate {
  id           String   @id @default(uuid())
  docType      DocType  @relation(fields: [docTypeId], references: [id])
  docTypeId    String
  version      Int      @default(1)
  filename     String                       // Оригинальное имя файла
  storagePath  String                       // Путь в хранилище
  sizeBytes    Int
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  uploadedById String
  isActive     Boolean  @default(true)      // false у устаревших версий
  createdAt    DateTime @default(now())
  downloadCount Int     @default(0)

  // Описание переменных для автозаполнения
  // Хранится как JSON-массив: [{"key": "{{FULL_NAME}}", "label": "ФИО студента", "autoFill": "user.fullName"}]
  variables    Json     @default("[]")
}

// ── Заявка ─────────────────────────────────────────────
model Request {
  id           String        @id              // «CGU-2026-XXXX»
  docType      DocType       @relation(fields: [docTypeId], references: [id])
  docTypeId    String
  faculty      Faculty       @relation(fields: [facultyId], references: [id])
  facultyId    String

  student      User          @relation("StudentRequests", fields: [studentId], references: [id])
  studentId    String
  assignedTo   User?         @relation("AssignedRequests", fields: [assignedToId], references: [id])
  assignedToId String?

  status       RequestStatus @default(DRAFT)
  purpose      String?
  copies       Int           @default(1)
  delivery     DeliveryType  @default(ELECTRONIC)
  recipient    String?                        // Организация-получатель

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  attachments  Attachment[]
  thread       ThreadMessage[]
}

enum RequestStatus {
  DRAFT       // Черновик (студент не отправил)
  SENT        // Отправлено, ждёт принятия в работу
  REVIEW      // Сотрудник взял в работу
  REVISE      // Возвращено на доработку студенту
  DONE        // Принято, документ готов
  REJECT      // Отклонено
}

enum DeliveryType {
  ELECTRONIC  // Электронный документ с подписью
  PAPER       // Получить лично в деканате
}

// ── Вложение ───────────────────────────────────────────
model Attachment {
  id          String   @id @default(uuid())
  request     Request  @relation(fields: [requestId], references: [id])
  requestId   String
  filename    String
  storagePath String
  sizeBytes   Int
  mimeType    String
  uploadedAt  DateTime @default(now())
  isResult    Boolean  @default(false)       // true — готовый документ от сотрудника
}

// ── Переписка по заявке ────────────────────────────────
model ThreadMessage {
  id         String      @id @default(uuid())
  request    Request     @relation(fields: [requestId], references: [id])
  requestId  String
  author     User        @relation(fields: [authorId], references: [id])
  authorId   String
  kind       MessageKind
  text       String
  createdAt  DateTime    @default(now())
}

enum MessageKind {
  SYSTEM    // Автоматическое системное сообщение
  STUDENT   // Сообщение от студента
  STAFF     // Сообщение от сотрудника
}
```

### 4.2 Генерация ID заявки

ID заявки имеет вид `CGU-YYYY-NNNN`, где `YYYY` — текущий год, `NNNN` — порядковый номер за год с нулевым дополнением до 4 цифр. Генерируется на бэкенде в сервисе `request.service.js` при создании записи.

### 4.3 Примечание о гибкости

Схема намеренно не хранит жёстко названия факультетов, групп, типов документов — всё это вынесено в отдельные таблицы (`Faculty`, `Group`, `DocType`). При подключении к базе данных университета достаточно реализовать адаптер синхронизации этих таблиц без изменения бизнес-логики.

---

## 5. Бэкенд — REST API

Базовый URL: `/api/v1`  
Формат ответа: JSON  
Авторизация: `Authorization: Bearer <JWT>`

### 5.1 Аутентификация

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

**POST /auth/login — тело запроса:**
```json
{
  "email": "a.magomedov@chesu.ru",
  "password": "password123"
}
```

**POST /auth/login — ответ 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "a.magomedov@chesu.ru",
    "role": "STUDENT",
    "fullName": "Магомедов Адам Русланович",
    "shortName": "Магомедов А.Р.",
    "group": { "name": "ПИ-3", "course": 3 },
    "faculty": { "name": "Факультет информационных технологий" },
    "recordBook": "21-1438"
  }
}
```

### 5.2 Заявки

```
GET    /api/v1/requests              # Список заявок (своих для студента, очередь для сотрудника)
POST   /api/v1/requests              # Создать заявку
GET    /api/v1/requests/:id          # Получить заявку по ID
PATCH  /api/v1/requests/:id/status   # Изменить статус (только staff)
POST   /api/v1/requests/:id/comment  # Добавить комментарий в переписку
DELETE /api/v1/requests/:id          # Удалить черновик (только автор, только DRAFT)
```

**GET /requests — параметры запроса:**
```
status=sent,review        — фильтр по статусу (множественный, через запятую)
docTypeId=uuid            — фильтр по типу документа
q=Иванов                  — поиск по имени студента / ID заявки / названию
page=1                    — пагинация
limit=20
sort=updatedAt:desc
```

**GET /requests — ответ 200:**
```json
{
  "data": [ { /* Request object */ } ],
  "meta": { "total": 47, "page": 1, "limit": 20, "pages": 3 }
}
```

**POST /requests — тело запроса:**
```json
{
  "docTypeId": "uuid-cert-study",
  "purpose": "Для предъявления в банк",
  "copies": 2,
  "delivery": "ELECTRONIC",
  "recipient": "ПАО Сбербанк",
  "status": "SENT"    // или "DRAFT"
}
```

**PATCH /requests/:id/status — тело запроса:**
```json
{
  "status": "REVISE",
  "comment": "Укажите дату пересдачи и приложите ведомость"
}
```

> Смена статуса генерирует системное сообщение в `ThreadMessage` и отправляет email-уведомление.

**POST /requests/:id/comment — тело запроса:**
```json
{
  "text": "Уточните, пожалуйста, дату получения документа"
}
```

### 5.3 Вложения

```
POST   /api/v1/requests/:id/attachments         # Загрузить файл к заявке
GET    /api/v1/requests/:id/attachments/:fileId  # Скачать файл
DELETE /api/v1/requests/:id/attachments/:fileId  # Удалить файл
POST   /api/v1/requests/:id/result              # Загрузить готовый документ (только staff)
```

**POST /requests/:id/attachments — multipart/form-data:**
- Поле: `file` (единственный файл)
- Допустимые MIME-типы: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/jpeg`, `image/png`
- Максимальный размер: 10 MB

### 5.4 Шаблоны документов

```
GET    /api/v1/templates              # Список активных шаблонов
GET    /api/v1/templates/:id          # Метаданные шаблона
GET    /api/v1/templates/:id/download # Скачать DOCX-файл шаблона
GET    /api/v1/templates/:id/filled   # Скачать шаблон с автозаполнением данных студента
POST   /api/v1/templates              # Загрузить новый шаблон (только staff/admin)
PATCH  /api/v1/templates/:id          # Обновить метаданные
DELETE /api/v1/templates/:id          # Деактивировать шаблон (только admin)
```

**GET /templates — параметры запроса:**
```
category=Заявления
docTypeId=uuid
active=true
```

**GET /templates — ответ 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "docTypeId": "uuid",
      "docType": { "title": "Заявление на академический отпуск", "category": "Заявления" },
      "version": 2,
      "filename": "app-academic.docx",
      "sizeBytes": 42000,
      "uploadedAt": "2026-04-14T00:00:00.000Z",
      "downloadCount": 234,
      "variables": [
        { "key": "{{FULL_NAME}}", "label": "ФИО студента", "autoFill": "user.fullName" },
        { "key": "{{GROUP}}", "label": "Группа", "autoFill": "user.group.name" },
        { "key": "{{RECORD_BOOK}}", "label": "№ зачётной книжки", "autoFill": "user.recordBook" },
        { "key": "{{FACULTY}}", "label": "Факультет", "autoFill": "user.faculty.name" },
        { "key": "{{DATE}}", "label": "Дата составления", "autoFill": "today" }
      ]
    }
  ]
}
```

**GET /templates/:id/filled — поведение:**
- Доступен только аутентифицированным пользователям с ролью `STUDENT`
- Сервер подставляет данные профиля студента в переменные шаблона через `docxtemplater`
- Возвращает готовый DOCX-файл со скачиванием
- Инкрементирует `downloadCount`

**POST /templates — multipart/form-data:**
- Поле `file`: DOCX-файл
- Поле `docTypeId`: UUID типа документа
- Поле `variables` (опционально): JSON-строка с описанием переменных

### 5.5 Типы документов

```
GET    /api/v1/doc-types              # Список типов документов
GET    /api/v1/doc-types/:id
POST   /api/v1/doc-types              # Создать (только admin)
PATCH  /api/v1/doc-types/:id          # Обновить (только admin)
```

### 5.6 Пользователи (только admin)

```
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
PATCH  /api/v1/users/:id/deactivate
```

### 5.7 Коды ошибок

Все ошибки возвращают JSON:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Поле purpose обязательно",
    "details": { "field": "purpose" }
  }
}
```

| HTTP-код | Код ошибки | Описание |
|----------|-----------|----------|
| 400 | `VALIDATION_ERROR` | Невалидные входные данные |
| 401 | `UNAUTHORIZED` | Токен отсутствует или истёк |
| 403 | `FORBIDDEN` | Недостаточно прав |
| 404 | `NOT_FOUND` | Ресурс не найден |
| 409 | `CONFLICT` | Конфликт (дубликат) |
| 413 | `FILE_TOO_LARGE` | Файл превышает 10 МБ |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Неподдерживаемый формат файла |
| 500 | `INTERNAL_ERROR` | Внутренняя ошибка сервера |

---

## 6. Фронтенд — React-приложение

### 6.1 Маршрутизация (React Router)

```
/login                       — Страница входа
/                            — Редирект на /student или /staff по роли

/student/                    — Layout кабинета студента
  /student/dashboard         — Главная (дашборд)
  /student/requests          — Мои заявки
  /student/requests/:id      — Детальная страница заявки
  /student/new               — Новая заявка (мастер-форма)
  /student/templates         — Шаблоны документов

/staff/                      — Layout кабинета сотрудника
  /staff/dashboard           — Рабочий стол
  /staff/queue               — Очередь заявок
  /staff/requests/:id        — Детальная страница заявки
  /staff/archive             — Завершённые заявки
  /staff/templates           — Управление шаблонами
```

Защищённые маршруты реализуются компонентом `<ProtectedRoute role="student|staff|admin">`. При открытии маршрута без авторизации — редирект на `/login`.

### 6.2 Управление состоянием

Состояние приложения хранится в двух React Context:

**AuthContext** — данные текущего пользователя, токены:
```js
{
  user: { id, email, role, fullName, shortName, group, faculty, recordBook },
  isAuthed: Boolean,
  login(email, password) → Promise,
  logout() → void
}
```

**NotificationsContext** — тосты/уведомления:
```js
{
  notify(message, type) // type: 'success' | 'error' | 'info'
}
```

Локальное состояние страниц управляется хуками (`useState`, `useReducer`). Серверные данные получаются через кастомные хуки:

```js
useRequests(filters)     → { data, loading, error, refetch }
useRequest(id)           → { data, loading, error, refetch }
useTemplates(filters)    → { data, loading, error }
```

### 6.3 Компонент мастер-формы новой заявки (NewRequest)

Реализует 3 шага (4 при наличии шаблона):

**Шаг 1 — Выбор типа документа:**
- Загрузка `GET /doc-types` → отображение карточек `DocCard` по категориям
- При выборе карточки она подсвечивается (класс `.on`), кнопка «Далее» активируется

**Шаг 2 — Параметры заявки:**
- Поля: `purpose` (textarea, обязательное), `recipient` (если `!requiresTemplate`), `copies` (select), `delivery` (select)
- Данные студента (ФИО, группа, факультет, зачётная книжка) подставляются из `AuthContext` — только для чтения
- Информационный блок: «Срок изготовления: N дней»

**Шаг 2.5 — Загрузка файла (только если `docType.requiresTemplate === true`):**
- Баннер с именем шаблона и кнопкой «Скачать шаблон» → `GET /templates/:id/download`
- Кнопка «Скачать с автозаполнением» → `GET /templates/:id/filled`
- Зона drag-and-drop для загрузки заполненного файла
- Файл валидируется по типу и размеру на клиенте

**Шаг 3 — Подтверждение:**
- Сводка всех введённых данных (только для чтения)
- Кнопки «Сохранить черновик» → `POST /requests` с `status: "DRAFT"` и «Отправить» → `POST /requests` с `status: "SENT"`
- После успешного создания: если были загружены файлы — `POST /requests/:id/attachments`
- Редирект на `/student/requests` с toast «Заявка успешно отправлена»

### 6.4 Компонент детальной страницы заявки (RequestDetail)

Одинаковый компонент для студента и сотрудника, адаптирующийся по пропу `role`.

**Левая колонка (main):**
- Прогресс-индикатор стадий (`draft → sent → review → done`)
- Карточка «Детали заявки» — таблица с параметрами
- Вложенные файлы (`FileChip` с кнопкой скачивания)
- Блок переписки (`Thread`): системные сообщения, сообщения студента и сотрудника
- Поле ввода нового комментария с кнопкой «Отправить»

**Правая колонка (aside):**
- Для сотрудника при статусе `SENT` или `REVIEW`: панель действий с тремя кнопками:
  - **«Принять и закрыть»** (зелёная) → `PATCH /requests/:id/status` `{ status: "DONE" }`
  - **«На доработку»** → раскрывает textarea для обязательного комментария → `{ status: "REVISE", comment }`
  - **«Отклонить»** → раскрывает textarea для обязательной причины → `{ status: "REJECT", comment }`
- Для студента при статусе `REVISE`: панель «Доработка» с кнопкой «Отправить повторно» → `{ status: "SENT" }`
- Карточка студента/исполнителя

### 6.5 Модуль управления шаблонами (TemplateManager, только staff)

- Таблица всех шаблонов с фильтрацией по категории
- Для каждого шаблона: кнопки «Изменить» (редактировать метаданные) и «Деактивировать»
- Кнопка «Загрузить новый шаблон» → открывает модальное окно:
  - `select` с выбором типа документа
  - Загрузка DOCX-файла
  - Поле для описания переменных шаблона (редактор JSON или форма ключ-значение)
  - Кнопка «Сохранить» → `POST /templates`

### 6.6 Обновление данных в реальном времени

После каждого действия (смена статуса, новый комментарий, загрузка файла) хук `useRequest` вызывает `refetch()`. Для очереди сотрудника — перезапрос `useRequests` каждые 60 секунд (`setInterval` с cleanup в `useEffect`).

---

## 7. Модуль шаблонов DOCX

### 7.1 Концепция

Сотрудник загружает DOCX-шаблон с переменными-плейсхолдерами вида `{{VARIABLE_NAME}}`. При запросе автозаполненного шаблона сервер подставляет данные профиля студента и возвращает готовый файл.

### 7.2 Синтаксис переменных в шаблонах

В DOCX-шаблоне переменные оформляются по правилам `docxtemplater`:

```
{{FULL_NAME}}           → Полное ФИО студента
{{SHORT_NAME}}          → «Магомедов А.Р.»
{{GROUP}}               → Группа, например «ПИ-3»
{{COURSE}}              → Курс, например «3»
{{RECORD_BOOK}}         → Номер зачётной книжки
{{FACULTY}}             → Полное название факультета
{{DATE}}                → Сегодняшняя дата, «07 мая 2026 г.»
{{ACADEMIC_YEAR}}       → «2025–2026»
{{RECTOR}}              → ФИО ректора (из конфига)
{{DEAN}}                → ФИО декана факультета (из конфига)
```

При загрузке шаблона сотрудник указывает, какие переменные используются в документе, через форму или JSON-поле. Список хранится в `DocTemplate.variables`.

### 7.3 Сервис генерации (docx.service.js)

```js
// server/src/services/docx.service.js

const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { ru } = require('date-fns/locale');

/**
 * Генерирует DOCX, подставляя данные студента в шаблон.
 * @param {string} templatePath    - путь к DOCX-шаблону в хранилище
 * @param {object} student         - объект пользователя с заполненным профилем
 * @param {object} extraVars       - дополнительные переменные (опционально)
 * @returns {Buffer}               - буфер готового DOCX
 */
async function fillTemplate(templatePath, student, extraVars = {}) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const today = new Date();
  const data = {
    FULL_NAME:     student.fullName,
    SHORT_NAME:    student.shortName,
    GROUP:         student.group?.name ?? '',
    COURSE:        String(student.group?.course ?? ''),
    RECORD_BOOK:   student.recordBook ?? '',
    FACULTY:       student.faculty?.name ?? '',
    DATE:          format(today, 'd MMMM yyyy', { locale: ru }) + ' г.',
    ACADEMIC_YEAR: getAcademicYear(today),
    ...extraVars,
  };

  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

function getAcademicYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  return month >= 8
    ? `${year}–${year + 1}`
    : `${year - 1}–${year}`;
}

module.exports = { fillTemplate };
```

### 7.4 Маршрут GET /templates/:id/filled

```js
router.get('/:id/filled', authMiddleware, roleMiddleware('STUDENT'), async (req, res) => {
  const template = await prisma.docTemplate.findUnique({
    where: { id: req.params.id },
    include: { docType: true }
  });
  if (!template || !template.isActive) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

  const student = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { group: true, studentFaculty: true }
  });

  const buffer = await docxService.fillTemplate(template.storagePath, student);

  // Инкремент счётчика
  await prisma.docTemplate.update({
    where: { id: template.id },
    data: { downloadCount: { increment: 1 } }
  });

  const safeName = encodeURIComponent(`Шаблон_${template.docType.title}.docx`);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
});
```

### 7.5 Предпросмотр шаблона в браузере

На странице шаблонов рядом с кнопкой «Скачать» располагается кнопка «Просмотр». По нажатию открывается модальное окно с компонентом `docx-preview`:

```jsx
import { renderAsync } from 'docx-preview';

function DocPreviewModal({ templateId, onClose }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Получаем бинарный файл шаблона
    api.templates.download(templateId).then(blob => {
      renderAsync(blob, containerRef.current, null, {
        className: 'docx-preview',
        inWrapper: true,
      });
    });
  }, [templateId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-body" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Предпросмотр шаблона</h3>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>
        <div ref={containerRef} style={{ overflow: 'auto', maxHeight: '70vh' }} />
      </div>
    </div>
  );
}
```

---

## 8. Аутентификация и авторизация

### 8.1 JWT

- **Access-токен:** время жизни 15 минут, хранится в памяти (`AuthContext`)
- **Refresh-токен:** время жизни 7 дней, хранится в `httpOnly` cookie
- При истечении access-токена клиент автоматически запрашивает новый через `POST /auth/refresh`
- Реализуется Axios-интерсептором в `client/src/api/index.js`

### 8.2 Middleware авторизации (Express)

```js
// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = payload; // { id, role }
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Токен недействителен или истёк' } });
  }
};
```

### 8.3 Middleware ролей

```js
// server/src/middleware/role.js
module.exports = function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }
    next();
  };
};
```

### 8.4 Правила доступа к данным

| Действие | Студент | Сотрудник | Администратор |
|----------|---------|-----------|---------------|
| Видеть свои заявки | ✓ | — | ✓ |
| Видеть очередь факультета | — | ✓ | ✓ |
| Создать заявку | ✓ | — | — |
| Менять статус заявки | — | ✓ | ✓ |
| Оставлять комментарии | ✓ | ✓ | ✓ |
| Скачать шаблон | ✓ | ✓ | ✓ |
| Скачать заполненный шаблон | ✓ | — | — |
| Загрузить шаблон | — | ✓ | ✓ |
| Управлять типами документов | — | — | ✓ |
| Управлять пользователями | — | — | ✓ |

**Изоляция по факультету:** сотрудник видит только заявки студентов своего факультета (`staffFacultyId`). Реализуется через фильтр в `request.service.js`.

---

## 9. Файловое хранилище

### 9.1 Организация файлов

```
uploads/
├── templates/                    # Исходные DOCX-шаблоны
│   └── {uuid}.docx
└── requests/
    └── {requestId}/
        ├── attachments/          # Вложения студента
        │   └── {uuid}_{filename}
        └── results/              # Готовые документы от сотрудника
            └── {uuid}_{filename}
```

### 9.2 Конфигурация Multer

```js
// server/src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = req.uploadDir; // устанавливается в маршруте
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 МБ
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_MEDIA_TYPE'));
  },
});
```

### 9.3 Скачивание файлов

Скачивание реализуется через `GET /api/v1/requests/:id/attachments/:fileId` — сервер проверяет права доступа (автор заявки или сотрудник факультета), после чего отдаёт файл через `res.download()` с оригинальным именем файла.

---

## 10. Уведомления

### 10.1 Email-уведомления

Отправляются через `nodemailer` при следующих событиях:

| Событие | Получатель | Содержание |
|---------|-----------|------------|
| Заявка отправлена (`SENT`) | Студент | Номер заявки, тип документа, ожидаемый срок |
| Заявка отправлена | Сотрудник факультета | Имя студента, тип документа, кнопка «Открыть» |
| Статус изменён на `REVIEW` | Студент | «Ваша заявка принята в работу» |
| Статус изменён на `REVISE` | Студент | Текст комментария от сотрудника, кнопка «Открыть заявку» |
| Статус изменён на `DONE` | Студент | «Документ готов», кнопка «Скачать» (если электронный) |
| Статус изменён на `REJECT` | Студент | Причина отклонения |
| Добавлен комментарий | Другая сторона | Текст сообщения |

Сервис уведомлений находится в `notification.service.js`. HTML-шаблоны писем — в `server/src/templates/email/`.

### 10.2 Toast-уведомления (клиент)

Глобальный `NotificationsContext` предоставляет функцию `notify(message, type)`. Тосты показываются в правом верхнем углу. Закрываются автоматически через 5 секунд или вручную.

```jsx
// Пример использования
const { notify } = useNotifications();
// ...
notify('Заявка успешно отправлена', 'success');
notify('Ошибка загрузки файла', 'error');
```

---

## 11. Требования к безопасности

- **Пароли** хранятся только в виде bcrypt-хеша (cost factor 12)
- **JWT-секрет** — случайная строка 256 бит, только через переменные окружения
- **Валидация** всех входных данных на бэкенде через Zod-схемы (не только на клиенте)
- **Проверка доступа к файлам** — перед отдачей файла всегда проверяются права: файл принадлежит заявке, к которой у пользователя есть доступ
- **Multer** ограничивает размер и MIME-типы загружаемых файлов
- **Helmet.js** устанавливает защитные HTTP-заголовки
- **CORS** настраивается через `env`-переменную `CLIENT_ORIGIN`, в production разрешён только origin фронтенда
- **Rate limiting** — не более 10 попыток логина с одного IP за 15 минут (`express-rate-limit`)
- **SQL-инъекции** исключены использованием Prisma ORM
- **XSS** — все данные экранируются React'ом автоматически; HTML в ответах API не используется

---

## 12. Требования к гибкости и расширяемости

### 12.1 Адаптер для внешней базы данных университета

В будущем платформа должна подключаться к существующей базе данных ЧГУ. Для этого предусмотрена следующая архитектура:

**Слой синхронизации** — отдельный сервис `sync.service.js`:
```
server/src/services/sync.service.js
```

Реализует три метода:
- `syncFaculties()` — синхронизация факультетов из внешней БД в таблицу `Faculty`
- `syncGroups()` — синхронизация групп в таблицу `Group`
- `syncUsers()` — синхронизация пользователей (студентов и сотрудников) в таблицу `User`

Методы вызываются по расписанию (cron) или триггеру. Внутренняя бизнес-логика работает только через внутренние таблицы — никакие компоненты платформы напрямую не обращаются к внешней БД.

**Конфигурация:**
```
EXTERNAL_DB_ENABLED=false           # Включить синхронизацию с внешней БД
EXTERNAL_DB_URL=                    # Строка подключения
SYNC_INTERVAL_MINUTES=60            # Интервал синхронизации
```

### 12.2 Типы документов и шаблоны — управляемые справочники

Типы документов (`DocType`) не захардкожены — они хранятся в БД и управляются через API (`/api/v1/doc-types`). Добавление нового типа справки или заявления не требует изменения кода.

### 12.3 Факультеты — изолированные очереди

Каждый сотрудник привязан к факультету (`staffFacultyId`). При расширении на другие факультеты достаточно добавить записи в таблицу `Faculty` и создать учётные записи сотрудников.

### 12.4 Конфигурация через переменные окружения

Все настройки, которые могут меняться при развёртывании, вынесены в `.env`:
```env
# Сервер
NODE_ENV=production
PORT=3000
CLIENT_ORIGIN=https://window.chesu.ru

# База данных
DATABASE_URL=postgresql://user:pass@localhost:5432/edinoe_okno

# JWT
JWT_SECRET=<256-битная случайная строка>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Файлы
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

# Email
SMTP_HOST=smtp.chesu.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@chesu.ru
SMTP_PASS=<пароль>
EMAIL_FROM="Единое Окно ЧГУ <noreply@chesu.ru>"

# Внешняя БД (для будущей интеграции)
EXTERNAL_DB_ENABLED=false
EXTERNAL_DB_URL=
SYNC_INTERVAL_MINUTES=60

# Университет (для подстановки в шаблоны)
UNIVERSITY_NAME=ЧГУ им. А.А. Кадырова
RECTOR_NAME=Магомедов Заур Айндиевич
```

---

## 13. Дизайн и UI

### 13.1 Принцип неизменности дизайна

Визуальная часть полностью определена переданными файлами:
- `styles.css` — основная дизайн-система
- `styles-login.css` — экран авторизации
- `styles-extra.css` — компоненты (карточки, таблицы, мастер-форма, детальная страница)

**Никакие визуальные изменения в CSS не производятся.** Разработчик переносит компоненты из статического прототипа в полноценное React-приложение один к одному.

### 13.2 Перенос компонентов из прототипа

| Файл прототипа | Куда переносится |
|---------------|-----------------|
| `login.jsx` | `client/src/pages/Login/Login.jsx` |
| `student.jsx` | `client/src/pages/student/Dashboard/` + `RequestsList/` |
| `staff.jsx` | `client/src/pages/staff/Dashboard/` + `Queue/` |
| `new-request.jsx` | `client/src/pages/student/NewRequest/` |
| `request-detail.jsx` | `client/src/pages/student/RequestDetail/` + `client/src/pages/staff/RequestDetail/` |
| `templates.jsx` | `client/src/pages/student/Templates/` + `client/src/pages/staff/TemplateManager/` |
| `ui.jsx` | `client/src/components/ui/` (Icon, Pill, Avatar, FileChip, EmptyState) |
| `browser-window.jsx` | Не используется в production (только для демонстрации) |

### 13.3 Изменения поведения (не внешнего вида)

В процессе переноса из статики в реальное приложение все `useState`-переменные с фиктивными данными заменяются на реальные API-запросы. Остальное остаётся без изменений.

---

## 14. Нефункциональные требования

### 14.1 Производительность

- Страницы (SPA) загружаются менее чем за 3 секунды на соединении 10 Мбит/с
- API отвечает менее чем за 500 мс на 95% запросов (P95)
- Список заявок пагинирован (по 20 штук), не подгружается весь массив сразу
- Изображения и статика обслуживаются с корректными `Cache-Control`-заголовками

### 14.2 Доступность и интернационализация

- Язык интерфейса: **русский**, все строки — на русском
- Даты форматируются в русской локали: «7 мая 2026», «вчера», «3 дн. назад»
- Числительные склоняются корректно (1 заявка, 2 заявки, 5 заявок)
- Формы доступны с клавиатуры (Tab + Enter + пространство)

### 14.3 Надёжность

- Все API-эндпоинты обёрнуты в `try/catch`, ошибки логируются
- Загрузка файлов — с повторной попыткой на клиенте (до 2 retries)
- Черновик формы сохраняется в `localStorage` клиента — данные не теряются при случайном закрытии вкладки

### 14.4 Логирование

- Сервер пишет структурированные логи в stdout (JSON-формат для production)
- Логируются: все запросы (метод, путь, код ответа, время), ошибки 4xx/5xx, действия со статусами заявок

---

## 15. Этапы разработки

### Этап 1 — Инфраструктура и аутентификация (1–2 недели)

- [ ] Инициализация репозитория (`client/`, `server/`)
- [ ] Настройка Vite + React + React Router на фронтенде
- [ ] Настройка Express + Prisma на бэкенде
- [ ] Схема БД — первая миграция (User, Faculty, Group)
- [ ] Эндпоинты: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- [ ] `AuthContext` на клиенте, страница логина (перенос из `login.jsx`)
- [ ] `ProtectedRoute`, редирект по роли
- [ ] Базовый shell-layout (Sidebar + main) — перенос из прототипа

### Этап 2 — Справочники и шаблоны (1 неделя)

- [ ] Схема БД: DocType, DocTemplate — миграция
- [ ] Эндпоинты CRUD для `doc-types` и `templates`
- [ ] Интеграция `docxtemplater` — сервис `docx.service.js`
- [ ] Эндпоинт `GET /templates/:id/filled`
- [ ] Фронтенд: страница «Шаблоны» — перенос из `templates.jsx` + подключение к API
- [ ] Фронтенд: страница «Управление шаблонами» для сотрудника
- [ ] Предпросмотр DOCX через `docx-preview`
- [ ] Сид-скрипт с начальными данными (факультеты, группы, типы документов, шаблоны)

### Этап 3 — Заявки (1–2 недели)

- [ ] Схема БД: Request, Attachment, ThreadMessage — миграция
- [ ] Сервис генерации ID `CGU-YYYY-NNNN`
- [ ] Эндпоинты заявок: `GET`, `POST`, `GET/:id`, `PATCH/:id/status`, `POST/:id/comment`
- [ ] Эндпоинты вложений: загрузка, скачивание, удаление
- [ ] Фронтенд: дашборды студента и сотрудника (перенос из `student.jsx`, `staff.jsx`)
- [ ] Фронтенд: мастер-форма «Новая заявка» (перенос из `new-request.jsx`)
- [ ] Фронтенд: детальная страница заявки (перенос из `request-detail.jsx`)
- [ ] Логика смены статусов, панель действий для сотрудника

### Этап 4 — Уведомления и полировка (1 неделя)

- [ ] Email-сервис (`nodemailer`) + HTML-шаблоны писем
- [ ] Toast-уведомления (`NotificationsContext`)
- [ ] Бейджи в навигации (счётчики новых заявок)
- [ ] Состояния загрузки (skeleton, спиннеры на кнопках)
- [ ] Пустые состояния (`EmptyState`)
- [ ] Полировка форм: валидация, блокировка кнопок, авто-сохранение черновика

### Этап 5 — Тестирование и деплой (1 неделя)

- [ ] Ручное тестирование всех сценариев использования
- [ ] Проверка изоляции данных по факультету
- [ ] Проверка всех ролевых ограничений
- [ ] Настройка `docker-compose.yml`
- [ ] Документация `README.md` (запуск, переменные окружения, первоначальный сид)

---

## 16. Глоссарий

| Термин | Определение |
|--------|------------|
| Заявка | Обращение студента с просьбой выдать документ |
| Шаблон | DOCX-файл с переменными-плейсхолдерами для автозаполнения |
| Автозаполнение | Подстановка данных профиля студента в переменные шаблона на сервере |
| Очередь | Список входящих заявок, видимых сотруднику деканата |
| Статус | Этап жизненного цикла заявки: черновик → отправлено → на рассмотрении → готово / на доработке / отклонено |
| Переписка (Thread) | Хронологическая лента системных и пользовательских сообщений по конкретной заявке |
| Изоляция по факультету | Сотрудник видит только заявки студентов своего факультета |
| Адаптер синхронизации | Слой кода для переноса данных из внешней БД университета во внутренние таблицы платформы |
| Сид | Скрипт начального наполнения БД тестовыми / эталонными данными |
| Черновик | Заявка, сохранённая студентом, но ещё не отправленная в деканат |
