const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const { format } = require('date-fns');
const { ru } = require('date-fns/locale');

function getAcademicYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 8 ? `${year}–${year + 1}` : `${year - 1}–${year}`;
}

async function fillTemplate(templatePath, student, extraVars = {}) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  });

  const today = new Date();
  const data = {
    FULL_NAME:     student.fullName,
    SHORT_NAME:    student.shortName,
    GROUP:         student.group?.name ?? '',
    COURSE:        String(student.group?.course ?? ''),
    RECORD_BOOK:   student.recordBook ?? '',
    FACULTY:       student.studentFaculty?.name ?? '',
    DATE:          format(today, 'd MMMM yyyy', { locale: ru }) + ' г.',
    ACADEMIC_YEAR: getAcademicYear(today),
    RECTOR:        process.env.RECTOR_NAME ?? '',
    DEAN:          '',
    ...extraVars,
  };

  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { fillTemplate };
