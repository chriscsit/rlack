import { create } from 'zustand';
import { Workspace, Channel, DirectMessage, Call } from '@/types';

interface AppState {
  // UI State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Current selections
  currentWorkspace: Workspace | null;
  currentChannel: Channel | null;
  currentDM: DirectMessage | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  setCurrentDM: (dm: DirectMessage | null) => void;

  // Workspaces
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;

  // Calls
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;

  // Typing indicators
  typingUsers: Array<{
    userId: string;
    username: string;
    channelId?: string;
    dmId?: string;
  }>;
  addTypingUser: (user: { userId: string; username: string; channelId?: string; dmId?: string }) => void;
  removeTypingUser: (userId: string, channelId?: string, dmId?: string) => void;
  clearTypingUsers: () => void;

  // Reset all state
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // UI State
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Current selections
  currentWorkspace: null,
  currentChannel: null,
  currentDM: null,
  setCurrentWorkspace: (workspace) => set({ 
    currentWorkspace: workspace,
    currentChannel: null,
    currentDM: null 
  }),
  setCurrentChannel: (channel) => set({ 
    currentChannel: channel,
    currentDM: null 
  }),
  setCurrentDM: (dm) => set({ 
    currentDM: dm,
    currentChannel: null 
  }),

  // Workspaces
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  addWorkspace: (workspace) => set(state => ({ 
    workspaces: [...state.workspaces, workspace] 
  })),
  updateWorkspace: (id, updates) => set(state => ({
    workspaces: state.workspaces.map(w => 
      w.id === id ? { ...w, ...updates } : w
    ),
    currentWorkspace: state.currentWorkspace?.id === id 
      ? { ...state.currentWorkspace, ...updates } 
      : state.currentWorkspace
  })),

  // Calls
  activeCall: null,
  setActiveCall: (call) => set({ activeCall: call }),

  // Typing indicators
  typingUsers: [],
  addTypingUser: (user) => {
    const { typingUsers } = get();
    const exists = typingUsers.some(u => 
      u.userId === user.userId && 
      u.channelId === user.channelId && 
      u.dmId === user.dmId
    );
    
    if (!exists) {
      set({ typingUsers: [...typingUsers, user] });
    }
  },
  removeTypingUser: (userId, channelId, dmId) => set(state => ({
    typingUsers: state.typingUsers.filter(u => 
      !(u.userId === userId && u.channelId === channelId && u.dmId === dmId)
    )
  })),
  clearTypingUsers: () => set({ typingUsers: [] }),

  // Reset all state
  reset: () => set({
    sidebarCollapsed: false,
    currentWorkspace: null,
    currentChannel: null,
    currentDM: null,
    workspaces: [],
    activeCall: null,
    typingUsers: [],
  }),
}));