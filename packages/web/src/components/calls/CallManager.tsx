import { useEffect } from 'react';
import { useCallStore } from '../../store/call';
import { webrtcService } from '../../lib/webrtc';
import VideoCall from './VideoCall';
import IncomingCall from './IncomingCall';
import toast from 'react-hot-toast';

const CallManager = () => {
  const {
    status,
    setStatus,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setLocalStream,
    setIncomingCall,
    reset,
  } = useCallStore();

  useEffect(() => {
    // Set up WebRTC event handlers
    webrtcService.onCallStarted((participants) => {
      setStatus('connected');
      setParticipants(participants);
      toast.success('Call connected');
    });

    webrtcService.onCallEnded(() => {
      setStatus('ended');
      toast.success('Call ended');
      setTimeout(() => {
        reset();
      }, 1000);
    });

    webrtcService.onParticipantJoined((participant) => {
      addParticipant(participant);
      toast.success(`${participant.firstName} joined the call`);
    });

    webrtcService.onParticipantLeft((participantId) => {
      removeParticipant(participantId);
      toast.success('Participant left the call');
    });

    webrtcService.onParticipantUpdated((participant) => {
      updateParticipant(participant);
    });

    webrtcService.onLocalStreamChanged((stream) => {
      setLocalStream(stream);
    });

    webrtcService.onIncomingCall((callData) => {
      setIncomingCall({
        callId: callData.callId,
        caller: callData.caller,
        options: callData.options,
      });
      
      // Play incoming call sound
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Incoming call from ${callData.caller.firstName} ${callData.caller.lastName}`, {
          icon: '/icon-192x192.png',
          tag: 'incoming-call',
        });
      }
    });

    webrtcService.onCallRejected((reason) => {
      toast.error(`Call rejected: ${reason}`);
      reset();
    });

    // Check WebRTC support
    if (!webrtcService.isSupported()) {
      toast.error('WebRTC is not supported in this browser');
    }

    // Cleanup on unmount
    return () => {
      // Note: WebRTC service handles its own cleanup
    };
  }, [
    setStatus,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setLocalStream,
    setIncomingCall,
    reset,
  ]);

  return (
    <>
      <IncomingCall />
      {(status === 'calling' || status === 'connected') && <VideoCall />}
    </>
  );
};

export default CallManager;