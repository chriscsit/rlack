import { Search, Star, Menu, Users, Info, Files } from 'lucide-react';
import { useAppStore } from '../../store/app';
import { useState } from 'react';
import FileGallery from '../files/FileGallery';
import CallButton from '../calls/CallButton';
import SearchModal from '../search/SearchModal';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationCenter from '../notifications/NotificationCenter';
import MobileNav from '../ui/MobileNav';

const TopBar = () => {
  const { 
    currentChannel, 
    currentDM, 
    currentWorkspace,
    setSidebarCollapsed,
    sidebarCollapsed 
  } = useAppStore();

  const [showFileGallery, setShowFileGallery] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const getTitle = () => {
    if (currentChannel) {
      return `#${currentChannel.name}`;
    }
    if (currentDM) {
      // Get the other participant's name
      return `Direct Message`; // TODO: Get actual participant name
    }
    return currentWorkspace?.name || 'Rlack';
  };

  const getSubtitle = () => {
    if (currentChannel) {
      return currentChannel.description || `${currentChannel.memberCount || 0} members`;
    }
    if (currentDM) {
      return 'Direct message';
    }
    return '';
  };

  return (
    <>
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 transition-colors">
        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu size={20} />
        </button>
      {/* Left section */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1 rounded hover:bg-gray-100 lg:hidden"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
        
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold text-gray-900">
            {getTitle()}
          </h1>
          {currentChannel && (
            <button className="p-1 rounded hover:bg-gray-100">
              <Star size={16} className="text-gray-400" />
            </button>
          )}
        </div>
        
        {getSubtitle() && (
          <span className="text-sm text-gray-500 hidden sm:block">
            {getSubtitle()}
          </span>
        )}
      </div>

      {/* Center section - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${currentChannel?.name || currentDM ? 'conversation' : currentWorkspace?.name || 'Rlack'}...`}
            className="w-full pl-10 pr-16 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onClick={() => setShowSearch(true)}
            readOnly
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <kbd className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-2">
        {/* Mobile search button */}
        <button
          onClick={() => setShowSearch(true)}
          className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Search size={20} />
        </button>
        
        <div className="hidden md:flex items-center space-x-2">
          <NotificationCenter />
          <ThemeToggle size="sm" />
        </div>
        {(currentChannel || currentDM) && (
          <>
            <CallButton variant="voice" size="md" />
            <CallButton variant="video" size="md" />
            <button 
              onClick={() => setShowFileGallery(!showFileGallery)}
              className={`p-2 rounded hover:bg-gray-100 ${showFileGallery ? 'bg-gray-100 text-primary-600' : 'text-gray-600'}`}
              title="Show files"
            >
              <Files size={16} />
            </button>
          </>
        )}
        
        {currentChannel && (
          <button className="p-2 rounded hover:bg-gray-100">
            <Users size={16} className="text-gray-600" />
          </button>
        )}
        
        <button className="p-2 rounded hover:bg-gray-100">
          <Info size={16} className="text-gray-600" />
        </button>
      </div>

      {/* File Gallery Modal */}
      {showFileGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Files in {currentChannel ? `#${currentChannel.name}` : 'Direct Message'}
              </h2>
              <button
                onClick={() => setShowFileGallery(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="h-full overflow-hidden">
              <FileGallery
                workspaceId={currentWorkspace?.id}
                channelId={currentChannel?.id}
                dmId={currentDM?.id}
              />
            </div>
          </div>
        </div>
      )}

      </div>
      
      {/* Mobile Navigation */}
      <MobileNav isOpen={showMobileNav} onToggle={() => setShowMobileNav(!showMobileNav)} />
      
      {/* Search Modal */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
};

export default TopBar;