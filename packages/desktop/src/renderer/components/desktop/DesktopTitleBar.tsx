import { useAuthStore } from '../../store/auth';
import { useAppStore } from '../../store/app';

const DesktopTitleBar = () => {
  const { user } = useAuthStore();
  const { currentWorkspace, currentChannel, currentDM } = useAppStore();

  const getTitle = () => {
    if (!user) return 'Rlack';
    
    if (currentChannel) {
      return `#${currentChannel.name} - ${currentWorkspace?.name || 'Rlack'}`;
    }
    
    if (currentDM) {
      const otherUser = currentDM.participants.find(p => p.id !== user.id);
      return `${otherUser?.firstName} ${otherUser?.lastName} - Rlack`;
    }
    
    if (currentWorkspace) {
      return `${currentWorkspace.name} - Rlack`;
    }
    
    return 'Rlack';
  };

  return (
    <div className="desktop-titlebar">
      <span className="text-gray-700 font-medium text-sm">
        {getTitle()}
      </span>
    </div>
  );
};

export default DesktopTitleBar;