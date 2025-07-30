import { useState } from 'react';
import { Phone, Video, Users, X } from 'lucide-react';
import { useCallStore } from '../../store/call';
import { webrtcService } from '../../lib/webrtc';
import { useAppStore } from '../../store/app';
import { useAuthStore } from '../../store/auth';
import toast from 'react-hot-toast';

interface CallButtonProps {
  variant?: 'voice' | 'video';
  size?: 'sm' | 'md' | 'lg';
  participants?: string[]; // User IDs to call
  className?: string;
}

const CallButton = ({ 
  variant = 'voice', 
  size = 'md', 
  participants = [], 
  className = '' 
}: CallButtonProps) => {
  const { status, setStatus, setCallOptions } = useCallStore();
  const { currentChannel, currentDM } = useAppStore();
  const [showCallModal, setShowCallModal] = useState(false);
  const [starting, setStarting] = useState(false);

  // Determine participants based on context
  const getParticipants = () => {
    if (participants.length > 0) return participants;
    
    if (currentDM) {
      // For DM, call the other participant
      return currentDM.participants
        .filter(p => p.id !== useAuthStore.getState().user?.id) // Exclude current user
        .map(p => p.id);
    }
    
    if (currentChannel) {
      // For channels, we'd need to get channel members
      // This would require additional API call or channel member data
      return [];
    }
    
    return [];
  };

  const handleStartCall = async (withVideo: boolean = false) => {
    if (starting || status !== 'idle') return;
    
    const callParticipants = getParticipants();
    
    if (callParticipants.length === 0) {
      toast.error('No participants available for call');
      return;
    }

    setStarting(true);
    
    try {
      await webrtcService.startCall(callParticipants, {
        video: withVideo,
        audio: true,
      });
      
      setStatus('calling');
      setCallOptions({
        video: withVideo,
        audio: true,
      });
      
      setShowCallModal(false);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      setStarting(false);
    }
  };

  const handleClick = () => {
    if (variant === 'voice') {
      handleStartCall(false);
    } else {
      handleStartCall(true);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const isDisabled = starting || status !== 'idle' || getParticipants().length === 0;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          rounded hover:bg-gray-100 transition-colors
          ${sizeClasses[size]}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        title={`Start ${variant} call`}
      >
        {starting ? (
          <div className={`w-${iconSizes[size]} h-${iconSizes[size]} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`} />
        ) : variant === 'video' ? (
          <Video size={iconSizes[size]} className="text-gray-600" />
        ) : (
          <Phone size={iconSizes[size]} className="text-gray-600" />
        )}
      </button>

      {/* Call options modal for channels */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Start a call</h3>
              <button
                onClick={() => setShowCallModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleStartCall(false)}
                disabled={starting}
                className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Phone size={20} className="text-gray-600" />
                <div className="text-left">
                  <div className="font-medium">Voice call</div>
                  <div className="text-sm text-gray-500">Audio only</div>
                </div>
              </button>
              
              <button
                onClick={() => handleStartCall(true)}
                disabled={starting}
                className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Video size={20} className="text-gray-600" />
                <div className="text-left">
                  <div className="font-medium">Video call</div>
                  <div className="text-sm text-gray-500">Audio and video</div>
                </div>
              </button>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              {getParticipants().length === 1 ? (
                'Start a call with 1 participant'
              ) : (
                `Start a call with ${getParticipants().length} participants`
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallButton;