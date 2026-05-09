import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import Icon from '../ui/Icon';

export default function AppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <button className="mobile-logout btn ghost sm" onClick={handleLogout} style={{ marginBottom: 12 }}>
          <Icon name="logout" size={14} /> Выйти
        </button>
        <Outlet />
      </main>
    </div>
  );
}
