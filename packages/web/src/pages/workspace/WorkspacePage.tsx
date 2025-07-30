import { useEffect } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/app';
import { api } from '../../lib/axios';
import { Workspace } from '../../types';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ChannelPage from './ChannelPage';
import DirectMessagePage from './DirectMessagePage';
import WorkspaceSelectPage from './WorkspaceSelectPage';

const WorkspacePage = () => {
  const { workspaceSlug } = useParams();
  const { workspaces, setCurrentWorkspace, currentWorkspace } = useAppStore();

  // Find workspace by slug
  const workspace = workspaces.find(w => w.slug === workspaceSlug);

  // Fetch workspace details if not found in store
  const { data: fetchedWorkspace } = useQuery({
    queryKey: ['workspace', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return null;
      const response = await api.get(`/workspaces/${workspaceSlug}`);
      return response.data.workspace as Workspace;
    },
    enabled: !!workspaceSlug && !workspace,
  });

  // Update current workspace
  useEffect(() => {
    const currentWs = workspace || fetchedWorkspace;
    if (currentWs && currentWs.id !== currentWorkspace?.id) {
      setCurrentWorkspace(currentWs);
    }
  }, [workspace, fetchedWorkspace, currentWorkspace, setCurrentWorkspace]);

  // Show workspace selector if no slug provided
  if (!workspaceSlug) {
    return <WorkspaceSelectPage />;
  }

  // Show loading if workspace is being fetched
  if (!workspace && !fetchedWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading workspace...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<Navigate to="general" replace />} />
        <Route path="channel/:channelName" element={<ChannelPage />} />
        <Route path="dm/:dmId" element={<DirectMessagePage />} />
        <Route path="*" element={<Navigate to="general" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default WorkspacePage;