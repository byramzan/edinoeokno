const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function fmtRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 5) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  if (hrs < 24) return `${hrs} ч назад`;
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return fmtDateShort(iso);
}

export function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
