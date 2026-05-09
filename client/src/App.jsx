import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import AppShell from './components/layout/AppShell';
import Login from './pages/Login/Login';

// Student
import StudentDashboard from './pages/student/Dashboard/index';
import StudentRequestsList from './pages/student/RequestsList/index';
import NewRequest from './pages/student/NewRequest/index';
import StudentRequestDetail from './pages/student/RequestDetail/index';
import StudentTemplates from './pages/student/Templates/index';

// Staff
import StaffDashboard from './pages/staff/Dashboard/index';
import StaffQueue from './pages/staff/Queue/index';
import StaffRequestDetail from './pages/staff/RequestDetail/index';
import TemplateManager from './pages/staff/TemplateManager/index';

function ProtectedRoute({ allowedRole, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/staff/dashboard" replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  return <Navigate to="/staff/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Student routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRole="STUDENT">
          <AppShell />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="requests" element={<StudentRequestsList />} />
        <Route path="requests/:id" element={<StudentRequestDetail />} />
        <Route path="new" element={<NewRequest />} />
        <Route path="templates" element={<StudentTemplates />} />
      </Route>

      {/* Staff routes */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRole="STAFF">
          <AppShell />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="queue" element={<StaffQueue />} />
        <Route path="requests/:id" element={<StaffRequestDetail />} />
        <Route path="archive" element={<StaffQueue archiveMode />} />
        <Route path="templates" element={<TemplateManager />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
