import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Icon from '../../components/ui/Icon';

export default function Login() {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('a.magomedov@chesu.ru');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { notify } = useNotifications();
  const navigate = useNavigate();

  const handleRoleChange = (r) => {
    setRole(r);
    setEmail(r === 'student' ? 'a.magomedov@chesu.ru' : 'a.tazueva@chesu.ru');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'STUDENT') navigate('/student/dashboard');
      else if (user.role === 'STAFF') navigate('/staff/dashboard');
      else navigate('/');
    } catch (err) {
      notify(err?.response?.data?.error?.message || 'Ошибка входа', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login login-single">
      <header className="login-corner-brand">
        <div className="brand-mark lg">Ч</div>
        <div className="login-brand-text">
          <b>Чеченский государственный университет</b>
          <span>имени А.А. Кадырова</span>
        </div>
      </header>

      <main className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="kicker" style={{ marginBottom: 8 }}>Вход в систему</div>
          <h2>Добро пожаловать.</h2>
          <p className="muted" style={{ marginTop: 6, marginBottom: 28 }}>
            Войдите, используя единую учётную запись ЧГУ.
          </p>

          <div className="role-toggle">
            <button type="button" className={role === 'student' ? 'on' : ''} onClick={() => handleRoleChange('student')}>
              <Icon name="book" size={16} />
              Я студент
            </button>
            <button type="button" className={role === 'staff' ? 'on' : ''} onClick={() => handleRoleChange('staff')}>
              <Icon name="archive" size={16} />
              Я сотрудник
            </button>
          </div>

          <div className="field">
            <label>Корпоративная почта</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Пароль</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="login-row">
            <label className="check"><input type="checkbox" defaultChecked /> Запомнить меня на этом устройстве</label>
            <a href="#">Забыли пароль?</a>
          </div>

          <button className="btn primary lg" style={{ width: '100%', marginTop: 18 }} type="submit" disabled={loading}>
            {loading ? 'Входим…' : `Войти как ${role === 'student' ? 'студент' : 'сотрудник'}`}
            {!loading && <Icon name="arrow" size={16} />}
          </button>

          <div className="login-divider"><span>или</span></div>
          <button type="button" className="btn lg" style={{ width: '100%' }}>
            Войти через Госуслуги
          </button>

          <div className="login-foot">
            Нет учётной записи? <a href="#">Обратитесь в учебный отдел</a>
          </div>
        </form>
      </main>
    </div>
  );
}
