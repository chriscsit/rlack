import { ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { useAppStore } from '../../store/app';
import { socketService } from '../../lib/socket';
import { api } from '../../lib/axios';
import { Workspace } from '../../types';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuthStore();
  const { setWorkspaces, sidebarCollapsed } = useAppStore();

  // Fetch user's workspaces
  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await api.get('/workspaces');
      return response.data.workspaces as Workspace[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (workspaces) {
      setWorkspaces(workspaces);
    }
  }, [workspaces, setWorkspaces]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!user) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Listen for workspace-level events
    const handleUserStatusChanged = (data: { userId: string; status: string }) => {
      console.log('User status changed:', data);
      // TODO: Update user status in store
    };

    const handleWorkspaceUpdated = (workspace: Workspace) => {
      console.log('Workspace updated:', workspace);
      // TODO: Update workspace in store
    };

    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('workspace_updated', handleWorkspaceUpdated);

    return () => {
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('workspace_updated', handleWorkspaceUpdated);
    };
  }, [user]);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-200 bg-white shadow-sm border-r border-gray-200 flex-shrink-0`}>
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar />
        
        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;