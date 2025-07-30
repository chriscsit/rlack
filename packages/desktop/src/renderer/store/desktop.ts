import { create } from 'zustand';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage: (channel: string, ...args: unknown[]) => void;
        on: (channel: string, func: (...args: unknown[]) => void) => () => void;
        once: (channel: string, func: (...args: unknown[]) => void) => void;
      };
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
      notification: {
        show: (options: { title: string; body: string }) => Promise<void>;
      };
      dialog: {
        showSaveDialog: (options: any) => Promise<any>;
        showOpenDialog: (options: any) => Promise<any>;
      };
      platform: string;
      isDev: boolean;
    };
  }
}

interface DesktopState {
  // Window state
  isMaximized: boolean;
  isFullscreen: boolean;
  setMaximized: (maximized: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;

  // Notifications
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  showNotification: (title: string, body: string) => void;

  // Menu handlers
  menuHandlers: Map<string, () => void>;
  registerMenuHandler: (action: string, handler: () => void) => void;
  unregisterMenuHandler: (action: string) => void;

  // Storage helpers
  getStoredValue: <T>(key: string, defaultValue: T) => Promise<T>;
  setStoredValue: (key: string, value: any) => Promise<void>;
  deleteStoredValue: (key: string) => Promise<void>;

  // Auto-updater
  updateAvailable: boolean;
  updateDownloaded: boolean;
  setUpdateAvailable: (available: boolean) => void;
  setUpdateDownloaded: (downloaded: boolean) => void;

  // Deep linking
  handleDeepLink: (url: string) => void;

  // Initialize desktop features
  initializeDesktop: () => void;
}

export const useDesktopStore = create<DesktopState>((set, get) => ({
  // Window state
  isMaximized: false,
  isFullscreen: false,
  setMaximized: (maximized) => set({ isMaximized: maximized }),
  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

  // Notifications
  notificationsEnabled: true,
  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  showNotification: async (title: string, body: string) => {
    const { notificationsEnabled } = get();
    if (notificationsEnabled && window.electron) {
      await window.electron.notification.show({ title, body });
    }
  },

  // Menu handlers
  menuHandlers: new Map(),
  registerMenuHandler: (action: string, handler: () => void) => {
    const { menuHandlers } = get();
    menuHandlers.set(action, handler);
    set({ menuHandlers: new Map(menuHandlers) });
  },
  unregisterMenuHandler: (action: string) => {
    const { menuHandlers } = get();
    menuHandlers.delete(action);
    set({ menuHandlers: new Map(menuHandlers) });
  },

  // Storage helpers
  getStoredValue: async <T,>(key: string, defaultValue: T): Promise<T> => {
    if (!window.electron) return defaultValue;
    try {
      const value = await window.electron.store.get(key);
      return value !== undefined ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  setStoredValue: async (key: string, value: any) => {
    if (window.electron) {
      await window.electron.store.set(key, value);
    }
  },
  deleteStoredValue: async (key: string) => {
    if (window.electron) {
      await window.electron.store.delete(key);
    }
  },

  // Auto-updater
  updateAvailable: false,
  updateDownloaded: false,
  setUpdateAvailable: (available) => set({ updateAvailable: available }),
  setUpdateDownloaded: (downloaded) => set({ updateDownloaded: downloaded }),

  // Deep linking
  handleDeepLink: (url: string) => {
    console.log('Deep link received:', url);
    // Parse the URL and navigate accordingly
    // Example: rlack://workspace/team-name/channel/general
    const parsedUrl = new URL(url);
    // Handle navigation based on the URL
  },

  // Initialize desktop features
  initializeDesktop: () => {
    if (!window.electron) return;

    // Load stored preferences
    get().getStoredValue('notificationsEnabled', true).then((enabled) => {
      set({ notificationsEnabled: enabled });
    });

    // Set up menu handlers
    const unsubscribers: Array<() => void> = [];

    // Menu event listeners
    const menuNewWorkspace = window.electron.ipcRenderer.on('menu-new-workspace', () => {
      const handler = get().menuHandlers.get('new-workspace');
      if (handler) handler();
    });
    unsubscribers.push(menuNewWorkspace);

    const menuNewChannel = window.electron.ipcRenderer.on('menu-new-channel', () => {
      const handler = get().menuHandlers.get('new-channel');
      if (handler) handler();
    });
    unsubscribers.push(menuNewChannel);

    const menuPreferences = window.electron.ipcRenderer.on('menu-preferences', () => {
      const handler = get().menuHandlers.get('preferences');
      if (handler) handler();
    });
    unsubscribers.push(menuPreferences);

    const menuToggleSidebar = window.electron.ipcRenderer.on('menu-toggle-sidebar', () => {
      const handler = get().menuHandlers.get('toggle-sidebar');
      if (handler) handler();
    });
    unsubscribers.push(menuToggleSidebar);

    const deepLinkHandler = window.electron.ipcRenderer.on('deep-link', (url: string) => {
      get().handleDeepLink(url);
    });
    unsubscribers.push(deepLinkHandler);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  },
}));