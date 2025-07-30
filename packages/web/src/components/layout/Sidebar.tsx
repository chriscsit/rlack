import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Hash, Plus, ChevronDown, ChevronRight, MessageCircle, Users, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useAppStore } from '../../store/app';
import { api } from '../../lib/axios';
import { Channel, DirectMessage } from '../../types';

const Sidebar = () => {
  const navigate = useNavigate();
  const { workspaceSlug } = useParams();
  const { user } = useAuthStore();
  const { 
    workspaces, 
    currentWorkspace, 
    setCurrentWorkspace,
    currentChannel,
    setCurrentChannel,
    currentDM,
    setCurrentDM,
    sidebarCollapsed 
  } = useAppStore();

  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  // Find current workspace
  const workspace = workspaces.find(w => w.slug === workspaceSlug);

  // Fetch channels for current workspace
  const { data: channels } = useQuery({
    queryKey: ['channels', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const response = await api.get(`/workspaces/${workspace.slug}/channels`);
      return response.data.channels as Channel[];
    },
    enabled: !!workspace,
  });

  // Fetch direct messages
  const { data: directMessages } = useQuery({
    queryKey: ['direct-messages'],
    queryFn: async () => {
      const response = await api.get('/users/direct-messages');
      return response.data.directMessages as DirectMessage[];
    },
    enabled: !!user,
  });

  const handleChannelClick = (channel: Channel) => {
    setCurrentChannel(channel);
    setCurrentDM(null);
    navigate(`/workspace/${workspaceSlug}/channel/${channel.name}`);
  };

  const handleDMClick = (dm: DirectMessage) => {
    setCurrentDM(dm);
    setCurrentChannel(null);
    navigate(`/workspace/${workspaceSlug}/dm/${dm.id}`);
  };

  const handleWorkspaceSelect = (ws: typeof workspaces[0]) => {
    setCurrentWorkspace(ws);
    navigate(`/workspace/${ws.slug}`);
  };

  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 space-y-2">
        {/* Workspace selector */}
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center cursor-pointer">
          <span className="text-white font-bold text-sm">
            {workspace?.name?.charAt(0) || 'R'}
          </span>
        </div>
        
        {/* Quick actions */}
        <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <Hash size={20} className="text-gray-600" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <MessageCircle size={20} className="text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Workspace header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {workspace?.name?.charAt(0) || 'R'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {workspace?.name || 'Select Workspace'}
            </h2>
            <p className="text-sm text-gray-500">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-6">
          {/* Workspace switcher */}
          {workspaces.length > 1 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Workspaces
              </h3>
              <div className="space-y-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleWorkspaceSelect(ws)}
                    className={`w-full flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                      ws.id === workspace?.id
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-5 h-5 bg-primary-600 rounded flex items-center justify-center mr-2">
                      <span className="text-white text-xs font-bold">
                        {ws.name.charAt(0)}
                      </span>
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channels */}
          <div>
            <button
              onClick={() => setChannelsExpanded(!channelsExpanded)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700"
            >
              <span>Channels</span>
              <div className="flex items-center space-x-1">
                <Plus size={12} className="hover:text-gray-900 cursor-pointer" />
                {channelsExpanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </div>
            </button>
            
            {channelsExpanded && (
              <div className="space-y-1">
                {channels?.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel)}
                    className={`w-full flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                      currentChannel?.id === channel.id
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Hash size={16} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                    {channel.unreadCount && channel.unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {channel.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <button
              onClick={() => setDmsExpanded(!dmsExpanded)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700"
            >
              <span>Direct Messages</span>
              <div className="flex items-center space-x-1">
                <Plus size={12} className="hover:text-gray-900 cursor-pointer" />
                {dmsExpanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </div>
            </button>
            
            {dmsExpanded && (
              <div className="space-y-1">
                {directMessages?.map((dm) => {
                  const otherUser = dm.participants.find(p => p.id !== user?.id);
                  return (
                    <button
                      key={dm.id}
                      onClick={() => handleDMClick(dm)}
                      className={`w-full flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                        currentDM?.id === dm.id
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {otherUser?.firstName} {otherUser?.lastName}
                      </span>
                      {dm.unreadCount && dm.unreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {dm.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Bottom section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">@{user?.username}</p>
          </div>
          <button className="p-1 rounded hover:bg-gray-100">
            <Settings size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;