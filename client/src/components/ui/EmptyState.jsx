export default function EmptyState({ glyph = '◇', title, subtitle, action }) {
  return (
    <div className="empty">
      <div className="ico">{glyph}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ marginBottom: 12 }}>{subtitle}</div>}
      {action}
    </div>
  );
}
