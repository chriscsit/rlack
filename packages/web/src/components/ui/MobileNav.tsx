import { useState, useEffect } from 'react';
import { Menu, X, Hash, MessageSquare, Users, Bell } from 'lucide-react';
import { useAppStore } from '../../store/app';
import { useNotificationStore } from '../../store/notifications';
import ThemeToggle from './ThemeToggle';
import NotificationCenter from '../notifications/NotificationCenter';

interface MobileNavProps {
  isOpen: boolean;
  onToggle: () => void;
}

const MobileNav = ({ isOpen, onToggle }: MobileNavProps) => {
  const { workspaces, currentWorkspace, channels, directMessages } = useAppStore();
  const { unreadCount } = useNotificationStore();

  // Close nav when screen size increases
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isOpen) {
        onToggle();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onToggle]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onToggle}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {currentWorkspace?.name || 'Rlack'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <NotificationCenter />
            <ThemeToggle size="sm" />
            <button
              onClick={onToggle}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button className="w-full flex items-center space-x-3 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <MessageSquare size={18} />
                <span>All Messages</span>
              </button>
              <button className="w-full flex items-center space-x-3 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Users size={18} />
                <span>People</span>
              </button>
            </div>
          </div>

          {/* Channels */}
          {channels.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Channels
              </h2>
              <div className="space-y-1">
                {channels.slice(0, 8).map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      // Navigate to channel
                      onToggle();
                    }}
                    className="w-full flex items-center space-x-3 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <Hash size={16} />
                    <span className="truncate">{channel.name}</span>
                    {channel.unreadCount && channel.unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                {channels.length > 8 && (
                  <button className="w-full text-left p-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    +{channels.length - 8} more channels
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Direct Messages */}
          {directMessages.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Direct Messages
              </h2>
              <div className="space-y-1">
                {directMessages.slice(0, 6).map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => {
                      // Navigate to DM
                      onToggle();
                    }}
                    className="w-full flex items-center space-x-3 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {dm.participants[0]?.firstName?.[0]}
                      </span>
                    </div>
                    <span className="truncate">
                      {dm.participants.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
                    </span>
                    {dm.unreadCount && dm.unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {dm.unreadCount > 99 ? '99+' : dm.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Workspaces */}
          {workspaces.length > 1 && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Workspaces
              </h2>
              <div className="space-y-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      // Switch workspace
                      onToggle();
                    }}
                    className={`w-full flex items-center space-x-3 p-2 rounded-lg ${
                      workspace.id === currentWorkspace?.id
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {workspace.name[0]}
                      </span>
                    </div>
                    <span className="truncate">{workspace.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileNav;