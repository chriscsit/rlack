import { useState } from 'react';
import { Calendar, User, Hash, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useAppStore } from '../../store/app';
import { SearchFilters as SearchFiltersType } from './SearchModal';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onClose: () => void;
}

const SearchFilters = ({ filters, onFiltersChange, onClose }: SearchFiltersProps) => {
  const { currentWorkspace } = useAppStore();

  // Fetch available workspaces
  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await api.get('/workspaces');
      return response.data.workspaces;
    }
  });

  // Fetch available channels for selected workspace
  const { data: channels } = useQuery({
    queryKey: ['channels', filters.workspaceId],
    queryFn: async () => {
      const workspaceId = filters.workspaceId || currentWorkspace?.id;
      if (!workspaceId) return [];
      
      const response = await api.get(`/workspaces/${workspaceId}/channels`);
      return response.data.channels;
    },
    enabled: !!(filters.workspaceId || currentWorkspace?.id)
  });

  // Fetch workspace members for user filter
  const { data: users } = useQuery({
    queryKey: ['workspace-members', filters.workspaceId],
    queryFn: async () => {
      const workspaceId = filters.workspaceId || currentWorkspace?.id;
      if (!workspaceId) return [];
      
      const response = await api.get(`/workspaces/${workspaceId}/members`);
      return response.data.members;
    },
    enabled: !!(filters.workspaceId || currentWorkspace?.id)
  });

  const updateFilter = <K extends keyof SearchFiltersType>(
    key: K,
    value: SearchFiltersType[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({ type: filters.type });
  };

  const hasActiveFilters = !!(
    filters.workspaceId ||
    filters.channelId ||
    filters.userId ||
    filters.startDate ||
    filters.endDate
  );

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workspace Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Workspace
          </label>
          <select
            value={filters.workspaceId || ''}
            onChange={(e) => updateFilter('workspaceId', e.target.value || undefined)}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All workspaces</option>
            {workspaces?.map((workspace: any) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>

        {/* Channel Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Hash size={12} className="inline mr-1" />
            Channel
          </label>
          <select
            value={filters.channelId || ''}
            onChange={(e) => updateFilter('channelId', e.target.value || undefined)}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            disabled={!channels?.length}
          >
            <option value="">All channels</option>
            {channels?.map((channel: any) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <User size={12} className="inline mr-1" />
            From user
          </label>
          <select
            value={filters.userId || ''}
            onChange={(e) => updateFilter('userId', e.target.value || undefined)}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            disabled={!users?.length}
          >
            <option value="">Any user</option>
            {users?.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Calendar size={12} className="inline mr-1" />
            Date range
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => updateFilter('startDate', e.target.value || undefined)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Start date"
            />
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => updateFilter('endDate', e.target.value || undefined)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.workspaceId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                Workspace: {workspaces?.find((w: any) => w.id === filters.workspaceId)?.name}
                <button
                  onClick={() => updateFilter('workspaceId', undefined)}
                  className="ml-1 hover:text-primary-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.channelId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                #{channels?.find((c: any) => c.id === filters.channelId)?.name}
                <button
                  onClick={() => updateFilter('channelId', undefined)}
                  className="ml-1 hover:text-primary-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.userId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                From: {users?.find((u: any) => u.id === filters.userId)?.firstName} {users?.find((u: any) => u.id === filters.userId)?.lastName}
                <button
                  onClick={() => updateFilter('userId', undefined)}
                  className="ml-1 hover:text-primary-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            
            {(filters.startDate || filters.endDate) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                {filters.startDate} - {filters.endDate || 'now'}
                <button
                  onClick={() => {
                    updateFilter('startDate', undefined);
                    updateFilter('endDate', undefined);
                  }}
                  className="ml-1 hover:text-primary-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;