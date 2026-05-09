import { STATUS } from '../../utils/status';

export default function Pill({ status, large }) {
  const s = STATUS[status];
  if (!s) return null;
  return <span className={`pill ${s.pill}${large ? ' lg' : ''}`}>{s.label}</span>;
}
