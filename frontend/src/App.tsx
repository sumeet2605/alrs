// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Import Page Components (to be created next)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
// import NotFoundPage from './pages/NotFoundPage';
import DefaultLayout from './components/DefaultLayout';
// Simple Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    // If not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  // NOTE: You can also use a wrapper for admin roles here if needed

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/health" element={<p>Health Check OK</p>} />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={<ProtectedRoute><DefaultLayout /></ProtectedRoute>}
      >
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        />
        <Route path="/register" element={<ProtectedRoute><RegisterPage /></ProtectedRoute>} />
        <Route
          path="/admin/users"
          element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>}
        />
        <Route
          path="/change-password"
          element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>}
        />
      </Route>


      {/* FALLBACK */}
      {/* <Route path="*" element={<NotFoundPage />} /> */}
    </Routes>
  );
};

export default App;