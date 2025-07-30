import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesktopStore } from '../../store/desktop';
import { useAppStore } from '../../store/app';

const ElectronMenuHandler = () => {
  const navigate = useNavigate();
  const { registerMenuHandler, unregisterMenuHandler } = useDesktopStore();
  const { setSidebarCollapsed, sidebarCollapsed } = useAppStore();

  useEffect(() => {
    // Register menu handlers
    registerMenuHandler('new-workspace', () => {
      navigate('/workspace/select');
      // TODO: Open new workspace modal
    });

    registerMenuHandler('new-channel', () => {
      // TODO: Open new channel modal
      console.log('New channel requested from menu');
    });

    registerMenuHandler('preferences', () => {
      // TODO: Open preferences modal
      console.log('Preferences requested from menu');
    });

    registerMenuHandler('toggle-sidebar', () => {
      setSidebarCollapsed(!sidebarCollapsed);
    });

    // Cleanup on unmount
    return () => {
      unregisterMenuHandler('new-workspace');
      unregisterMenuHandler('new-channel');
      unregisterMenuHandler('preferences');
      unregisterMenuHandler('toggle-sidebar');
    };
  }, [registerMenuHandler, unregisterMenuHandler, navigate, setSidebarCollapsed, sidebarCollapsed]);

  return null; // This component doesn't render anything
};

export default ElectronMenuHandler;