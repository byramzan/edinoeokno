const COLORS = {
  gold:  'linear-gradient(135deg, #B8893B, #8a6321)',
  green: 'linear-gradient(135deg, #2A6B53, #1F4D3A)',
  bordo: 'linear-gradient(135deg, #8B2231, #6E1423)',
  paper: 'linear-gradient(135deg, #D0C5B3, #9A9189)',
};

export default function Avatar({ name, size = 36, color = 'gold' }) {
  const initials = name ? name.split(' ').slice(0, 2).map(p => p[0]).join('') : '?';
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.36,
      background: COLORS[color] || COLORS.gold,
    }}>{initials}</div>
  );
}
