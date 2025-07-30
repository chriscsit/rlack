import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { useAppStore } from './store/app';
import { useThemeStore } from './store/theme';
import { socketService } from './lib/socket';
import CallManager from './components/calls/CallManager';

// Components
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import WorkspacePage from './pages/workspace/WorkspacePage';
import LandingPage from './pages/LandingPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token } = useAuthStore();
  
  useEffect(() => {
    if (isAuthenticated && token && !socketService.getSocket()?.connected) {
      socketService.connect(token);
    }
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isAuthenticated, token } = useAuthStore();
  const { reset } = useAppStore();
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme on app start
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    // Initialize socket connection if authenticated
    if (isAuthenticated && token) {
      socketService.connect(token);
    }

    // Cleanup on unmount
    return () => {
      if (!isAuthenticated) {
        reset();
        socketService.disconnect();
      }
    };
  }, [isAuthenticated, token, reset]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/workspace/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route index element={<Navigate to="select" replace />} />
                  <Route path="select" element={<WorkspacePage />} />
                  <Route path=":workspaceSlug/*" element={<WorkspacePage />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CallManager />
    </div>
  );
}

export default App;