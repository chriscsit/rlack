import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Hash } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useAppStore } from '../../store/app';
import { api } from '../../lib/axios';
import toast from 'react-hot-toast';

const WorkspaceSelectPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workspaces } = useAppStore();
  const queryClient = useQueryClient();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/workspaces', { name });
      return response.data.workspace;
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created successfully!');
      navigate(`/workspace/${workspace.slug}`);
      setShowCreateForm(false);
      setNewWorkspaceName('');
    },
    onError: () => {
      toast.error('Failed to create workspace');
    },
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkspaceName.trim()) {
      createWorkspaceMutation.mutate(newWorkspaceName.trim());
    }
  };

  const handleWorkspaceClick = (workspace: typeof workspaces[0]) => {
    navigate(`/workspace/${workspace.slug}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Rlack
          </h1>
          <p className="text-gray-600">
            Choose a workspace to get started, or create a new one.
          </p>
        </div>

        {/* Existing workspaces */}
        {workspaces.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Workspaces</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleWorkspaceClick(workspace)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">
                        {workspace.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{workspace.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Users size={14} />
                          <span>{workspace.memberCount || 0} members</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Hash size={14} />
                          <span>{workspace.channelCount || 0} channels</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create new workspace */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Create Workspace</h2>
          </div>
          
          {!showCreateForm ? (
            <div className="p-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <Plus size={20} />
                <span>Create a new workspace</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateWorkspace} className="p-4">
              <div className="mb-4">
                <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  id="workspaceName"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name..."
                  className="input"
                  autoFocus
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={!newWorkspaceName.trim() || createWorkspaceMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewWorkspaceName('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* User info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Signed in as <strong>{user?.firstName} {user?.lastName}</strong>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSelectPage;