import { socketService } from './socket';

export interface CallParticipant {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  muted?: boolean;
  videoOff?: boolean;
}

export interface CallOptions {
  video: boolean;
  audio: boolean;
  screen?: boolean;
}

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

class WebRTCService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private participants: Map<string, CallParticipant> = new Map();
  private isInitialized = false;
  
  // Configuration for STUN/TURN servers
  private readonly configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers for production
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'username',
      //   credential: 'password'
      // }
    ],
    iceCandidatePoolSize: 10,
  };

  // Event handlers
  private onCallStartedHandler?: (participants: CallParticipant[]) => void;
  private onCallEndedHandler?: () => void;
  private onParticipantJoinedHandler?: (participant: CallParticipant) => void;
  private onParticipantLeftHandler?: (participantId: string) => void;
  private onParticipantUpdatedHandler?: (participant: CallParticipant) => void;
  private onLocalStreamChangedHandler?: (stream: MediaStream | null) => void;
  private onIncomingCallHandler?: (callData: any) => void;
  private onCallRejectedHandler?: (reason: string) => void;

  constructor() {
    this.setupSocketListeners();
  }

  // Initialize WebRTC service
  initialize() {
    if (this.isInitialized) return;
    
    // Check browser support
    if (!this.isBrowserSupported()) {
      throw new Error('WebRTC is not supported in this browser');
    }

    this.isInitialized = true;
  }

  // Check if browser supports WebRTC
  private isBrowserSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection &&
      window.RTCSessionDescription &&
      window.RTCIceCandidate
    );
  }

  // Set up socket event listeners for WebRTC signaling
  private setupSocketListeners() {
    socketService.on('call_initiated', this.handleCallInitiated.bind(this));
    socketService.on('call_accepted', this.handleCallAccepted.bind(this));
    socketService.on('call_rejected', this.handleCallRejected.bind(this));
    socketService.on('call_ended', this.handleCallEnded.bind(this));
    socketService.on('participant_joined', this.handleParticipantJoined.bind(this));
    socketService.on('participant_left', this.handleParticipantLeft.bind(this));
    socketService.on('webrtc_offer', this.handleOffer.bind(this));
    socketService.on('webrtc_answer', this.handleAnswer.bind(this));
    socketService.on('webrtc_ice_candidate', this.handleIceCandidate.bind(this));
    socketService.on('participant_muted', this.handleParticipantMuted.bind(this));
    socketService.on('participant_video_toggled', this.handleParticipantVideoToggled.bind(this));
  }

  // Get user media (camera and microphone)
  async getUserMedia(options: CallOptions): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: options.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: options.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      this.onLocalStreamChangedHandler?.(stream);
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to access camera or microphone');
    }
  }

  // Get screen sharing stream
  async getScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        },
        audio: true,
      });
      
      this.screenStream = stream;
      
      // Handle screen share end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });
      
      return stream;
    } catch (error) {
      console.error('Error accessing screen share:', error);
      throw new Error('Failed to access screen sharing');
    }
  }

  // Start a call
  async startCall(participantIds: string[], options: CallOptions): Promise<void> {
    try {
      this.initialize();
      
      // Get user media
      await this.getUserMedia(options);
      
      // Emit call initiation to server
      socketService.emit('initiate_call', {
        participantIds,
        options,
      });
      
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(callId: string, options: CallOptions): Promise<void> {
    try {
      this.initialize();
      
      // Get user media
      await this.getUserMedia(options);
      
      // Emit call acceptance to server
      socketService.emit('accept_call', {
        callId,
        options,
      });
      
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }

  // Reject an incoming call
  rejectCall(callId: string, reason: string = 'Declined'): void {
    socketService.emit('reject_call', { callId, reason });
  }

  // End the current call
  endCall(): void {
    socketService.emit('end_call', {});
    this.cleanup();
  }

  // Toggle mute
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        
        // Notify other participants
        socketService.emit('participant_muted', {
          muted: !audioTrack.enabled,
        });
        
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  // Toggle video
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        
        // Notify other participants
        socketService.emit('participant_video_toggled', {
          videoOff: !videoTrack.enabled,
        });
        
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  // Start screen sharing
  async startScreenShare(): Promise<void> {
    try {
      const screenStream = await this.getScreenShare();
      
      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      
      for (const [participantId, pc] of this.peerConnections) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      this.onLocalStreamChangedHandler?.(screenStream);
      
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  // Stop screen sharing
  async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    // Switch back to camera if available
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      
      for (const [participantId, pc] of this.peerConnections) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      this.onLocalStreamChangedHandler?.(this.localStream);
    }
  }

  // Create peer connection
  private createPeerConnection(participantId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.configuration);
    
    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    // Handle ice candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('webrtc_ice_candidate', {
          targetId: participantId,
          candidate: event.candidate,
        });
      }
    };
    
    // Handle remote stream
    pc.ontrack = (event) => {
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.stream = event.streams[0];
        this.participants.set(participantId, participant);
        this.onParticipantUpdatedHandler?.(participant);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${participantId}:`, pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.handleParticipantLeft({ participantId });
      }
    };
    
    this.peerConnections.set(participantId, pc);
    return pc;
  }

  // Socket event handlers
  private async handleCallInitiated(data: any) {
    this.onIncomingCallHandler?.(data);
  }

  private async handleCallAccepted(data: any) {
    // Update participants
    data.participants.forEach((participant: CallParticipant) => {
      this.participants.set(participant.id, participant);
    });
    
    this.onCallStartedHandler?.(Array.from(this.participants.values()));
  }

  private handleCallRejected(data: any) {
    this.onCallRejectedHandler?.(data.reason);
    this.cleanup();
  }

  private handleCallEnded(data: any) {
    this.onCallEndedHandler?.(data);
    this.cleanup();
  }

  private async handleParticipantJoined(data: any) {
    const participant: CallParticipant = data.participant;
    this.participants.set(participant.id, participant);
    
    // Create peer connection for new participant
    const pc = this.createPeerConnection(participant.id);
    
    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    socketService.emit('webrtc_offer', {
      targetId: participant.id,
      offer,
    });
    
    this.onParticipantJoinedHandler?.(participant);
  }

  private handleParticipantLeft(data: any) {
    const { participantId } = data;
    
    // Close peer connection
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }
    
    // Remove participant
    this.participants.delete(participantId);
    
    this.onParticipantLeftHandler?.(participantId);
  }

  private async handleOffer(data: any) {
    const { fromId, offer } = data;
    
    const pc = this.createPeerConnection(fromId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    socketService.emit('webrtc_answer', {
      targetId: fromId,
      answer,
    });
  }

  private async handleAnswer(data: any) {
    const { fromId, answer } = data;
    
    const pc = this.peerConnections.get(fromId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleIceCandidate(data: any) {
    const { fromId, candidate } = data;
    
    const pc = this.peerConnections.get(fromId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private handleParticipantMuted(data: any) {
    const { participantId, muted } = data;
    const participant = this.participants.get(participantId);
    
    if (participant) {
      participant.muted = muted;
      this.participants.set(participantId, participant);
      this.onParticipantUpdatedHandler?.(participant);
    }
  }

  private handleParticipantVideoToggled(data: any) {
    const { participantId, videoOff } = data;
    const participant = this.participants.get(participantId);
    
    if (participant) {
      participant.videoOff = videoOff;
      this.participants.set(participantId, participant);
      this.onParticipantUpdatedHandler?.(participant);
    }
  }

  // Cleanup function
  private cleanup() {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    
    // Clear participants
    this.participants.clear();
    
    this.onLocalStreamChangedHandler?.(null);
  }

  // Event handler setters
  onCallStarted(handler: (participants: CallParticipant[]) => void) {
    this.onCallStartedHandler = handler;
  }

  onCallEnded(handler: () => void) {
    this.onCallEndedHandler = handler;
  }

  onParticipantJoined(handler: (participant: CallParticipant) => void) {
    this.onParticipantJoinedHandler = handler;
  }

  onParticipantLeft(handler: (participantId: string) => void) {
    this.onParticipantLeftHandler = handler;
  }

  onParticipantUpdated(handler: (participant: CallParticipant) => void) {
    this.onParticipantUpdatedHandler = handler;
  }

  onLocalStreamChanged(handler: (stream: MediaStream | null) => void) {
    this.onLocalStreamChangedHandler = handler;
  }

  onIncomingCall(handler: (callData: any) => void) {
    this.onIncomingCallHandler = handler;
  }

  onCallRejected(handler: (reason: string) => void) {
    this.onCallRejectedHandler = handler;
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  getParticipants(): CallParticipant[] {
    return Array.from(this.participants.values());
  }

  isScreenSharing(): boolean {
    return !!this.screenStream;
  }

  isSupported(): boolean {
    return this.isBrowserSupported();
  }
}

export const webrtcService = new WebRTCService();