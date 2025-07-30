import { useState } from 'react';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { useCallStore } from '../../store/call';
import { webrtcService } from '../../lib/webrtc';
import toast from 'react-hot-toast';

const IncomingCall = () => {
  const { incomingCall, setIncomingCall, setStatus, setCallOptions } = useCallStore();
  const [answering, setAnswering] = useState(false);
  const [answerWithVideo, setAnswerWithVideo] = useState(true);
  const [answerWithAudio, setAnswerWithAudio] = useState(true);

  if (!incomingCall) return null;

  const { caller, options } = incomingCall;

  const handleAccept = async () => {
    if (answering) return;
    
    setAnswering(true);
    
    try {
      await webrtcService.acceptCall(incomingCall.callId, {
        video: answerWithVideo,
        audio: answerWithAudio,
      });
      
      setStatus('connected');
      setCallOptions({
        video: answerWithVideo,
        audio: answerWithAudio,
      });
      setIncomingCall(null);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      setAnswering(false);
    }
  };

  const handleReject = () => {
    webrtcService.rejectCall(incomingCall.callId, 'Declined');
    setIncomingCall(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Caller info */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-semibold">
              {caller.firstName?.[0]}{caller.lastName?.[0]}
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">
            {caller.firstName} {caller.lastName}
          </h2>
          <p className="text-gray-500">@{caller.username}</p>
          <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {options.video ? <Video size={16} /> : <Phone size={16} />}
            <span>Incoming {options.video ? 'video' : 'voice'} call</span>
          </div>
        </div>

        {/* Call options */}
        <div className="space-y-4 mb-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">Answer with:</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setAnswerWithAudio(!answerWithAudio)}
                className={`p-3 rounded-full transition-colors ${
                  answerWithAudio 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}
                title={answerWithAudio ? 'Microphone on' : 'Microphone off'}
              >
                {answerWithAudio ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              
              {options.video && (
                <button
                  onClick={() => setAnswerWithVideo(!answerWithVideo)}
                  className={`p-3 rounded-full transition-colors ${
                    answerWithVideo 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}
                  title={answerWithVideo ? 'Camera on' : 'Camera off'}
                >
                  {answerWithVideo ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center space-x-6">
          <button
            onClick={handleReject}
            disabled={answering}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
          
          <button
            onClick={handleAccept}
            disabled={answering}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            {answering ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Phone size={24} className="text-white" />
            )}
          </button>
        </div>

        {answering && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Connecting...
          </p>
        )}
      </div>
    </div>
  );
};

export default IncomingCall;