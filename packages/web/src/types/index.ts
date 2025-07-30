export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  status: 'ONLINE' | 'AWAY' | 'DO_NOT_DISTURB' | 'OFFLINE';
  customStatus?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
  updatedAt: string;
  members: WorkspaceMember[];
  channels: Channel[];
  _count?: {
    members: number;
    channels: number;
  };
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  joinedAt: string;
  user: User;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DIRECT';
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members: ChannelMember[];
}

export interface ChannelMember {
  id: string;
  userId: string;
  channelId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: User;
}

export interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM' | 'CALL_START' | 'CALL_END';
  channelId?: string;
  directMessageId?: string;
  threadId?: string;
  authorId: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  reactions: Reaction[];
  files: File[];
  mentions: MessageMention[];
}

export interface Reaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  createdAt: string;
  user: User;
}

export interface MessageMention {
  id: string;
  messageId: string;
  userId: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: User[];
  messages: Message[];
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  channelId?: string;
  messageId?: string;
  workspaceId: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy: User;
  channel?: Pick<Channel, 'id' | 'name'>;
}

export interface Call {
  id: string;
  type: 'VOICE' | 'VIDEO';
  status: 'ACTIVE' | 'ENDED';
  channelId?: string;
  startedById: string;
  startedAt: string;
  endedAt?: string;
  participants: User[];
}

export interface Thread {
  id: string;
  messageId: string;
  channelId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  messages: Message[];
}

// API Response types
export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

// Socket event types
export interface SocketEvents {
  // Connection
  connect: () => void;
  disconnect: () => void;
  
  // Messages
  new_message: (message: Message) => void;
  message_updated: (message: Message) => void;
  message_deleted: (data: { messageId: string }) => void;
  
  // Reactions
  reaction_added: (data: { messageId: string; reaction: Reaction; reactions: Reaction[] }) => void;
  reaction_removed: (data: { messageId: string; emoji: string; userId: string; reactions: Reaction[] }) => void;
  
  // Typing
  user_typing: (data: { userId: string; username: string; channelId?: string; dmId?: string }) => void;
  user_stopped_typing: (data: { userId: string; username: string; channelId?: string; dmId?: string }) => void;
  
  // User status
  user_status_changed: (data: { userId: string; status: string; customStatus?: string }) => void;
  
  // Calls
  call_started: (data: { call: Call; startedBy: User }) => void;
  call_ended: (data: { callId: string }) => void;
  user_joined_call: (data: { userId: string; username: string; avatar?: string }) => void;
  user_left_call: (data: { userId: string; username: string }) => void;
  
  // WebRTC
  webrtc_offer: (data: { offer: RTCSessionDescriptionInit; fromUserId: string; targetUserId: string }) => void;
  webrtc_answer: (data: { answer: RTCSessionDescriptionInit; fromUserId: string; targetUserId: string }) => void;
  webrtc_ice_candidate: (data: { candidate: RTCIceCandidateInit; fromUserId: string; targetUserId: string }) => void;
  
  // Errors
  error: (data: { message: string }) => void;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

export interface CreateWorkspaceForm {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateChannelForm {
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE';
  workspaceId: string;
}

export interface SendMessageForm {
  content: string;
  channelId?: string;
  directMessageId?: string;
  threadId?: string;
}

// UI State types
export interface UIState {
  sidebarCollapsed: boolean;
  currentWorkspace?: Workspace;
  currentChannel?: Channel;
  currentDM?: DirectMessage;
  activeCall?: Call;
  typingUsers: Array<{
    userId: string;
    username: string;
    channelId?: string;
    dmId?: string;
  }>;
}

// App state
export interface AppState extends UIState {
  user?: User;
  workspaces: Workspace[];
  isAuthenticated: boolean;
}