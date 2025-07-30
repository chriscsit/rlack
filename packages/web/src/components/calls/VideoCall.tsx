import { useEffect, useRef, useState } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  Minimize2,
  Maximize2,
  Users,
  Settings,
  MessageSquare
} from 'lucide-react';
import { useCallStore } from '../../store/call';
import { webrtcService, CallParticipant } from '../../lib/webrtc';
import toast from 'react-hot-toast';

interface VideoCallProps {
  onClose?: () => void;
}

const VideoCall = ({ onClose }: VideoCallProps) => {
  const {
    status,
    isVideo,
    isMuted,
    isVideoOff,
    isScreenSharing,
    localStream,
    participants,
    isMinimized,
    showCallControls,
    setLocalState,
    setIsMinimized,
    setShowCallControls,
    reset,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (status === 'connected') {
      const resetControlsTimeout = () => {
        if (controlsTimeout) clearTimeout(controlsTimeout);
        setShowCallControls(true);
        
        const timeout = setTimeout(() => {
          setShowCallControls(false);
        }, 3000);
        setControlsTimeout(timeout);
      };

      resetControlsTimeout();
      
      return () => {
        if (controlsTimeout) clearTimeout(controlsTimeout);
      };
    }
  }, [status, controlsTimeout, setShowCallControls]);

  const handleToggleMute = () => {
    const muted = webrtcService.toggleMute();
    setLocalState({ isMuted: muted });
  };

  const handleToggleVideo = () => {
    const videoOff = webrtcService.toggleVideo();
    setLocalState({ isVideoOff: videoOff });
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await webrtcService.stopScreenShare();
        setLocalState({ isScreenSharing: false });
        toast.success('Screen sharing stopped');
      } else {
        await webrtcService.startScreenShare();
        setLocalState({ isScreenSharing: true });
        toast.success('Screen sharing started');
      }
    } catch (error) {
      toast.error('Failed to toggle screen sharing');
      console.error('Screen sharing error:', error);
    }
  };

  const handleEndCall = () => {
    webrtcService.endCall();
    reset();
    onClose?.();
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (status === 'idle' || status === 'ended') {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-900 rounded-lg p-3 shadow-lg flex items-center space-x-3 min-w-[250px]">
          <div className="flex-1">
            <div className="text-white text-sm font-medium">
              {status === 'calling' ? 'Calling...' : `Call with ${participants.length + 1} participants`}
            </div>
            <div className="text-gray-400 text-xs">
              {status === 'connected' ? 'Connected' : 'Connecting...'}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-full transition-colors ${
                isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isMuted ? <MicOff size={16} className="text-white" /> : <Mic size={16} className="text-white" />}
            </button>
            
            <button
              onClick={handleEndCall}
              className="p-2 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
            >
              <PhoneOff size={16} className="text-white" />
            </button>
            
            <button
              onClick={handleMinimize}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <Maximize2 size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4 transition-opacity duration-300 ${
        showCallControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h2 className="text-lg font-medium">
              {status === 'calling' ? 'Calling...' : 'Video Call'}
            </h2>
            <p className="text-gray-300 text-sm">
              {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Users size={20} className="text-white" />
            </button>
            
            <button
              onClick={handleMinimize}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Minimize2 size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 relative">
        {/* Main video (first participant or screen share) */}
        <div className="absolute inset-0">
          {participants.length > 0 ? (
            <ParticipantVideo
              participant={participants[0]}
              isMain={true}
            />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} />
                </div>
                <p className="text-lg">Waiting for participants...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20">
          {localStream && isVideo && !isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <VideoOff size={20} />
                </div>
                <p className="text-xs">You</p>
              </div>
            </div>
          )}
          
          {isMuted && (
            <div className="absolute top-2 left-2 p-1 bg-red-600 rounded">
              <MicOff size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Other participants (grid for multiple) */}
        {participants.length > 1 && (
          <div className="absolute bottom-20 left-4 right-4">
            <div className="flex space-x-2 overflow-x-auto">
              {participants.slice(1).map((participant) => (
                <div key={participant.id} className="flex-shrink-0 w-32 h-24">
                  <ParticipantVideo participant={participant} isMain={false} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-6 transition-opacity duration-300 ${
        showCallControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleToggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
          </button>

          {isVideo && (
            <button
              onClick={handleToggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {isVideoOff ? <VideoOff size={24} className="text-white" /> : <Video size={24} className="text-white" />}
            </button>
          )}

          <button
            onClick={handleToggleScreenShare}
            className={`p-4 rounded-full transition-colors ${
              isScreenSharing 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isScreenSharing ? <MonitorOff size={24} className="text-white" /> : <Monitor size={24} className="text-white" />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          >
            <PhoneOff size={24} className="text-white" />
          </button>

          <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <Settings size={24} className="text-white" />
          </button>

          <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <MessageSquare size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Participants panel */}
      {showParticipants && (
        <div className="absolute top-0 right-0 w-80 h-full bg-gray-900/95 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Participants ({participants.length + 1})</h3>
            <button
              onClick={() => setShowParticipants(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            {/* Current user */}
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">You</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">You</p>
                <div className="flex items-center space-x-2">
                  {isMuted && <MicOff size={12} className="text-red-400" />}
                  {isVideoOff && <VideoOff size={12} className="text-red-400" />}
                </div>
              </div>
            </div>
            
            {/* Other participants */}
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {participant.firstName?.[0]}{participant.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">
                    {participant.firstName} {participant.lastName}
                  </p>
                  <div className="flex items-center space-x-2">
                    {participant.muted && <MicOff size={12} className="text-red-400" />}
                    {participant.videoOff && <VideoOff size={12} className="text-red-400" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Participant video component
interface ParticipantVideoProps {
  participant: CallParticipant;
  isMain: boolean;
}

const ParticipantVideo = ({ participant, isMain }: ParticipantVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = participant.stream && !participant.videoOff;

  return (
    <div className={`relative w-full h-full bg-gray-900 ${isMain ? '' : 'rounded-lg overflow-hidden'}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <div className="text-center text-white">
            <div className={`${isMain ? 'w-24 h-24' : 'w-12 h-12'} bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2`}>
              <span className={`text-white font-medium ${isMain ? 'text-2xl' : 'text-sm'}`}>
                {participant.firstName?.[0]}{participant.lastName?.[0]}
              </span>
            </div>
            <p className={`${isMain ? 'text-lg' : 'text-xs'}`}>
              {participant.firstName} {participant.lastName}
            </p>
          </div>
        </div>
      )}
      
      {/* Status indicators */}
      <div className="absolute bottom-2 left-2 flex items-center space-x-1">
        {participant.muted && (
          <div className="p-1 bg-red-600 rounded">
            <MicOff size={isMain ? 16 : 12} className="text-white" />
          </div>
        )}
        {participant.videoOff && (
          <div className="p-1 bg-gray-600 rounded">
            <VideoOff size={isMain ? 16 : 12} className="text-white" />
          </div>
        )}
      </div>
      
      {/* Name overlay */}
      <div className="absolute bottom-2 right-2">
        <div className="px-2 py-1 bg-black/50 rounded text-white text-sm">
          {participant.firstName} {participant.lastName}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;