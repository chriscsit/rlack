import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { useAppStore } from './store/app';
import { useDesktopStore } from './store/desktop';
import { socketService } from './lib/socket';

// Import web components (we'll create symlinks to share them)
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import DesktopDashboardLayout from './components/layout/DesktopDashboardLayout';
import WorkspacePage from './components/workspace/WorkspacePage';
import LandingPage from './components/LandingPage';

// Desktop-specific components
import DesktopTitleBar from './components/desktop/DesktopTitleBar';
import ElectronMenuHandler from './components/desktop/ElectronMenuHandler';

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

function DesktopApp() {
  const { isAuthenticated, token } = useAuthStore();
  const { reset } = useAppStore();
  const { initializeDesktop } = useDesktopStore();

  useEffect(() => {
    // Initialize desktop-specific features
    initializeDesktop();

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
  }, [isAuthenticated, token, reset, initializeDesktop]);

  return (
    <div className="desktop-window">
      <DesktopTitleBar />
      <ElectronMenuHandler />
      
      <div className="desktop-content">
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
                <DesktopDashboardLayout>
                  <Routes>
                    <Route index element={<Navigate to="select" replace />} />
                    <Route path="select" element={<WorkspacePage />} />
                    <Route path=":workspaceSlug/*" element={<WorkspacePage />} />
                  </Routes>
                </DesktopDashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default DesktopApp;