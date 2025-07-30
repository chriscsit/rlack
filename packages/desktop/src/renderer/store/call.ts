import { create } from 'zustand';
import { CallParticipant, CallStatus, CallOptions } from '../lib/webrtc';

interface CallState {
  // Call state
  status: CallStatus;
  callId: string | null;
  isVideo: boolean;
  isAudio: boolean;
  isScreenSharing: boolean;
  
  // Local state
  isMuted: boolean;
  isVideoOff: boolean;
  localStream: MediaStream | null;
  
  // Participants
  participants: CallParticipant[];
  
  // Incoming call
  incomingCall: {
    callId: string;
    caller: any;
    options: CallOptions;
  } | null;
  
  // UI state
  showCallControls: boolean;
  isMinimized: boolean;
  
  // Actions
  setStatus: (status: CallStatus) => void;
  setCallId: (callId: string | null) => void;
  setCallOptions: (options: Partial<CallOptions>) => void;
  setLocalState: (state: { isMuted?: boolean; isVideoOff?: boolean; isScreenSharing?: boolean }) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setParticipants: (participants: CallParticipant[]) => void;
  addParticipant: (participant: CallParticipant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participant: CallParticipant) => void;
  setIncomingCall: (call: { callId: string; caller: any; options: CallOptions } | null) => void;
  setShowCallControls: (show: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as CallStatus,
  callId: null,
  isVideo: false,
  isAudio: true,
  isScreenSharing: false,
  isMuted: false,
  isVideoOff: false,
  localStream: null,
  participants: [],
  incomingCall: null,
  showCallControls: true,
  isMinimized: false,
};

export const useCallStore = create<CallState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  
  setCallId: (callId) => set({ callId }),
  
  setCallOptions: (options) => set((state) => ({
    isVideo: options.video !== undefined ? options.video : state.isVideo,
    isAudio: options.audio !== undefined ? options.audio : state.isAudio,
    isScreenSharing: options.screen !== undefined ? options.screen : state.isScreenSharing,
  })),
  
  setLocalState: (newState) => set((state) => ({
    isMuted: newState.isMuted !== undefined ? newState.isMuted : state.isMuted,
    isVideoOff: newState.isVideoOff !== undefined ? newState.isVideoOff : state.isVideoOff,
    isScreenSharing: newState.isScreenSharing !== undefined ? newState.isScreenSharing : state.isScreenSharing,
  })),
  
  setLocalStream: (stream) => set({ localStream: stream }),
  
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants, participant]
  })),
  
  removeParticipant: (participantId) => set((state) => ({
    participants: state.participants.filter(p => p.id !== participantId)
  })),
  
  updateParticipant: (updatedParticipant) => set((state) => ({
    participants: state.participants.map(p => 
      p.id === updatedParticipant.id ? updatedParticipant : p
    )
  })),
  
  setIncomingCall: (call) => set({ incomingCall: call }),
  
  setShowCallControls: (show) => set({ showCallControls: show }),
  
  setIsMinimized: (minimized) => set({ isMinimized: minimized }),
  
  reset: () => set({ ...initialState }),
}));