import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRequests } from '../../hooks/useRequests';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: requests } = useRequests({}, true);

  const isStudent = user?.role === 'STUDENT';

  const badges = {
    activeStudent: requests.filter(r => ['sent','review','revise'].includes(r.status)).length,
    newStaff: requests.filter(r => r.status === 'sent').length,
  };

  const items = isStudent ? [
    { to: '/student/dashboard',  label: 'Главная',      icon: 'home' },
    { to: '/student/requests',   label: 'Мои заявки',   icon: 'inbox', badge: badges.activeStudent },
    { to: '/student/new',        label: 'Новая заявка', icon: 'plus' },
    { to: '/student/templates',  label: 'Шаблоны',      icon: 'folder' },
  ] : [
    { to: '/staff/dashboard',    label: 'Главная',  icon: 'home' },
    { to: '/staff/queue',        label: 'Очередь',  icon: 'inbox', badge: badges.newStaff },
    { to: '/staff/archive',      label: 'Архив',    icon: 'archive' },
    { to: '/staff/templates',    label: 'Шаблоны',  icon: 'folder' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">Ч</div>
        <div className="brand-text">
          <b>ЧГУ</b>
          <span>им. А.А. Кадырова</span>
        </div>
      </div>

      <nav className="nav-section">
        <div className="nav-section-title">{isStudent ? 'Студент' : 'Деканат ФИТ'}</div>
        {items.map(it => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon name={it.icon} size={17} />
            <span>{it.label}</span>
            {it.badge ? <span className="badge">{it.badge}</span> : null}
          </NavLink>
        ))}
      </nav>

      <nav className="nav-section">
        <div className="nav-section-title">Сервис</div>
        <button className="nav-item"><Icon name="bell" size={17} /> Уведомления</button>
        <button className="nav-item"><Icon name="msg" size={17} /> Поддержка</button>
        <button className="nav-item"><Icon name="settings" size={17} /> Настройки</button>
      </nav>

      <div className="sidebar-foot">
        <Avatar name={user?.fullName || '?'} size={36} color={isStudent ? 'gold' : 'green'} />
        <div className="who" style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.shortName || user?.fullName}
          </b>
          <span>{isStudent ? `${user?.group?.name} · курс ${user?.group?.course}` : user?.position || 'Сотрудник'}</span>
        </div>
        <button className="nav-item icon-only" title="Выйти" onClick={handleLogout}>
          <Icon name="logout" size={16} />
        </button>
      </div>
    </aside>
  );
}
