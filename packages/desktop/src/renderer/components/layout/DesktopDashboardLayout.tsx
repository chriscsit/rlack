import { ReactNode } from 'react';
import { useDesktopStore } from '../../store/desktop';

interface DesktopDashboardLayoutProps {
  children: ReactNode;
}

const DesktopDashboardLayout = ({ children }: DesktopDashboardLayoutProps) => {
  const { showNotification } = useDesktopStore();

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Rlack</h2>
          </div>
        </div>
        
        <nav className="mt-4 px-4">
          <div className="space-y-1">
            <button
              onClick={() => showNotification('Test', 'Desktop notification working!')}
              className="w-full sidebar-item-inactive"
            >
              <span>Test Notification</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default DesktopDashboardLayout;