require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DOC_TYPES = [
  { slug: 'cert-study',    title: 'Справка с места учёбы',             category: 'Справки',   description: 'Подтверждение факта обучения. Для предъявления по месту требования.', requiresTemplate: false, processingDays: '1–3 дня' },
  { slug: 'cert-pension',  title: 'Справка для Социального фонда',     category: 'Справки',   description: 'Для назначения пенсии по потере кормильца, пособий.',                 requiresTemplate: false, processingDays: '3–5 дней' },
  { slug: 'cert-army',     title: 'Справка для военкомата (ф. 26)',    category: 'Справки',   description: 'Для предоставления отсрочки от призыва.',                             requiresTemplate: false, processingDays: '1–3 дня' },
  { slug: 'cert-tax',      title: 'Справка об оплате обучения',        category: 'Справки',   description: 'Для налогового вычета (НДФЛ-3).',                                     requiresTemplate: false, processingDays: '3–5 дней' },
  { slug: 'app-academic',  title: 'Заявление на академический отпуск', category: 'Заявления', description: 'По состоянию здоровья, семейным обстоятельствам, иным причинам.',    requiresTemplate: true,  processingDays: '7–10 дней' },
  { slug: 'app-transfer',  title: 'Заявление о переводе',              category: 'Заявления', description: 'Перевод с курса на курс, с факультета, из другого вуза.',            requiresTemplate: true,  processingDays: '10–14 дней' },
  { slug: 'app-retake',    title: 'Заявление на пересдачу',            category: 'Заявления', description: 'Пересдача экзамена / зачёта при наличии задолженности.',              requiresTemplate: true,  processingDays: '3–5 дней' },
  { slug: 'app-name',      title: 'Заявление о смене ФИО',             category: 'Заявления', description: 'При перемене имени, фамилии, отчества.',                              requiresTemplate: true,  processingDays: '5–7 дней' },
  { slug: 'app-dorm',      title: 'Заявление на общежитие',            category: 'Заявления', description: 'На предоставление места в общежитии университета.',                   requiresTemplate: true,  processingDays: '7–14 дней' },
  { slug: 'duplicate-id',  title: 'Дубликат студенческого билета',     category: 'Прочее',    description: 'Замена в случае утери или порчи.',                                     requiresTemplate: false, processingDays: '5–7 дней' },
];

const GROUPS = [
  { name: 'ПИ-1', course: 1 },
  { name: 'ПИ-2', course: 2 },
  { name: 'ПИ-3', course: 3 },
  { name: 'ПМИ-4', course: 4 },
  { name: 'ИВТ-2', course: 2 },
  { name: 'ФЗ-2', course: 2 },
];

async function main() {
  console.log('Seeding database...');

  // Faculty
  const faculty = await prisma.faculty.upsert({
    where: { id: 'fit-faculty-uuid-0001' },
    update: {},
    create: {
      id: 'fit-faculty-uuid-0001',
      name: 'Факультет информационных технологий',
      shortName: 'ФИТ',
    },
  });
  console.log(`Faculty: ${faculty.name}`);

  // Groups
  const groupMap = {};
  for (const g of GROUPS) {
    const group = await prisma.group.upsert({
      where: { id: `group-${g.name}-uuid` },
      update: {},
      create: { id: `group-${g.name}-uuid`, name: g.name, course: g.course, facultyId: faculty.id },
    });
    groupMap[g.name] = group;
  }
  console.log(`Groups: ${Object.keys(groupMap).join(', ')}`);

  // Doc types
  const docTypeMap = {};
  for (const dt of DOC_TYPES) {
    const docType = await prisma.docType.upsert({
      where: { slug: dt.slug },
      update: {},
      create: dt,
    });
    docTypeMap[dt.slug] = docType;
  }
  console.log(`DocTypes: ${Object.keys(docTypeMap).length}`);

  // Users
  const studentHash = await bcrypt.hash('password123', 12);
  const staffHash = await bcrypt.hash('password123', 12);

  const student = await prisma.user.upsert({
    where: { email: 'a.magomedov@chesu.ru' },
    update: {},
    create: {
      email: 'a.magomedov@chesu.ru',
      passwordHash: studentHash,
      role: 'STUDENT',
      fullName: 'Магомедов Адам Русланович',
      shortName: 'Магомедов А.Р.',
      recordBook: '21-1438',
      groupId: groupMap['ПИ-3'].id,
      studentFacultyId: faculty.id,
    },
  });
  console.log(`Student: ${student.fullName}`);

  const staffMember = await prisma.user.upsert({
    where: { email: 'a.tazueva@chesu.ru' },
    update: {},
    create: {
      email: 'a.tazueva@chesu.ru',
      passwordHash: staffHash,
      role: 'STAFF',
      fullName: 'Тазуева Аминат Имрановна',
      shortName: 'Тазуева А.И.',
      position: 'Специалист деканата ФИТ',
      staffFacultyId: faculty.id,
    },
  });
  console.log(`Staff: ${staffMember.fullName}`);

  console.log('\nSeed complete!');
  console.log('Credentials:');
  console.log('  Student: a.magomedov@chesu.ru / password123');
  console.log('  Staff:   a.tazueva@chesu.ru   / password123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
