import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@/types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): void {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Convenience methods for common actions
  joinChannel(channelId: string): void {
    this.emit('join_channel', { channelId });
  }

  leaveChannel(channelId: string): void {
    this.emit('leave_channel', { channelId });
  }

  joinDM(dmId: string): void {
    this.emit('join_dm', { dmId });
  }

  startTyping(channelId?: string, dmId?: string): void {
    this.emit('typing_start', { channelId, dmId });
  }

  stopTyping(channelId?: string, dmId?: string): void {
    this.emit('typing_stop', { channelId, dmId });
  }

  updateStatus(status: string, customStatus?: string): void {
    this.emit('update_status', { status, customStatus });
  }

  startCall(channelId: string, type: 'VOICE' | 'VIDEO'): void {
    this.emit('call_start', { channelId, type });
  }

  joinCall(callId: string): void {
    this.emit('call_join', { callId });
  }

  leaveCall(callId: string): void {
    this.emit('call_leave', { callId });
  }

  sendWebRTCOffer(callId: string, offer: RTCSessionDescriptionInit, targetUserId: string): void {
    this.emit('webrtc_offer', { callId, offer, targetUserId });
  }

  sendWebRTCAnswer(callId: string, answer: RTCSessionDescriptionInit, targetUserId: string): void {
    this.emit('webrtc_answer', { callId, answer, targetUserId });
  }

  sendWebRTCIceCandidate(callId: string, candidate: RTCIceCandidateInit, targetUserId: string): void {
    this.emit('webrtc_ice_candidate', { callId, candidate, targetUserId });
  }
}

export const socketService = new SocketService();
export default socketService;