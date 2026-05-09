const PizZip = require('pizzip');
const fs = require('fs');

/**
 * Правила замены: ищут паттерн в тексте параграфа и подставляют переменную.
 * Порядок важен — более специфичные правила идут первыми.
 */
const RULES = [
  // Дата: «___» ______20___г.
  {
    regex: /«[_\s]{1,5}»\s*[_\s]+20[_\s]+г\.?/,
    replacement: '{{DATE}}',
  },
  // ФИО после слова "Выдана"
  {
    regex: /(Выдана\s+)[_\s]{5,}/,
    replacement: '$1{{FULL_NAME}}',
  },
  // ФИО: студент(а/у/ом) ___ ФИО (имя после слова студент)
  {
    regex: /(студент[уаом]?\s+)[_\s]{5,}/,
    replacement: '$1{{FULL_NAME}}',
  },
  // Курс: ___ курса / ___ курс
  {
    regex: /[_\s]{2,}(?=\s*курс)/,
    replacement: '{{COURSE}} ',
  },
  // Группа: группы/группе ___ или ___ группы
  {
    regex: /(групп[ыуе]?\s+)[_\s]{3,}/,
    replacement: '$1{{GROUP}}',
  },
  {
    regex: /[_\s]{3,}(\s*групп)/,
    replacement: '{{GROUP}}$1',
  },
  // Зачётная книжка
  {
    regex: /(зачёт\w*\s+книжк\w*\s*(?:№\s*)?)[_\s]{3,}/i,
    replacement: '$1{{RECORD_BOOK}}',
  },
  // Факультет / институт
  {
    regex: /(факультет[а-я]*\s+)[_\s]{5,}/i,
    replacement: '$1{{FACULTY}}',
  },
  // Параграф состоит только из прочерков — убираем
  {
    regex: /^[_\s]{6,}$/,
    replacement: '',
  },
];

/**
 * Извлекает текст из XML-строки параграфа, склеивая все <w:t> теги.
 */
function extractParaText(paraXml) {
  let text = '';
  const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = re.exec(paraXml)) !== null) {
    text += m[1];
  }
  return text;
}

/**
 * Возвращает rPr первого <w:r> в параграфе (чтобы сохранить форматирование).
 */
function extractFirstRpr(paraXml) {
  const m = paraXml.match(/<w:r[ >][\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)/);
  return m ? m[1] : '';
}

/**
 * Возвращает <w:pPr> параграфа или пустую строку.
 */
function extractPpr(paraXml) {
  const m = paraXml.match(/(<w:pPr>[\s\S]*?<\/w:pPr>)/);
  return m ? m[1] : '';
}

/**
 * Строит один run с нужным форматированием и текстом.
 */
function buildRun(rpr, text) {
  if (!text) return '';
  const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
  return `<w:r>${rpr}<w:t${space}>${escapeXml(text)}</w:t></w:r>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Применяет правила к тексту параграфа.
 * Возвращает { changed, newText }.
 */
function applyRules(text) {
  let result = text;
  for (const rule of RULES) {
    const before = result;
    result = result.replace(rule.regex, rule.replacement);
    if (result !== before) {
      // Применяем только первое сработавшее правило на параграф
      // (дальше могут быть другие прочерки — продолжаем)
    }
  }
  return { changed: result !== text, newText: result };
}

/**
 * Обрабатывает document.xml: заменяет прочерки на плейсхолдеры.
 */
function processDocumentXml(xml) {
  // Захватываем полный открывающий тег со всеми атрибутами: <w:p ...>
  const PARA_RE = /(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g;

  let changed = false;
  const result = xml.replace(PARA_RE, (fullMatch, open, body, close) => {
    const text = extractParaText(body);
    if (!text.trim()) return fullMatch;

    const { changed: paraChanged, newText } = applyRules(text);
    if (!paraChanged) return fullMatch;

    changed = true;
    const ppr = extractPpr(body);
    const rpr = extractFirstRpr(body);
    const run = buildRun(rpr, newText);
    return `${open}${ppr}${run}${close}`;
  });

  return { xml: result, changed };
}

/**
 * Главная функция: читает DOCX, вставляет плейсхолдеры, перезаписывает файл.
 * Возвращает список найденных переменных.
 */
async function processTemplate(filePath) {
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);

  const docXml = zip.file('word/document.xml').asText();
  const { xml: newXml, changed } = processDocumentXml(docXml);

  if (!changed) {
    return { changed: false, variables: [] };
  }

  zip.file('word/document.xml', newXml);
  const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(filePath, output);

  // Собираем какие переменные были найдены
  const variables = [];
  const varRe = /\{\{([A-Z_]+)\}\}/g;
  let m;
  while ((m = varRe.exec(newXml)) !== null) {
    if (!variables.includes(m[1])) variables.push(m[1]);
  }

  return { changed: true, variables };
}

module.exports = { processTemplate };
