import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'message' | 'mention' | 'call' | 'file' | 'system';
export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  timestamp: Date;
  workspaceId?: string;
  channelId?: string;
  dmId?: string;
  userId?: string;
  avatar?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: () => void;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  mentions: boolean;
  directMessages: boolean;
  keywords: string[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  workspaceSettings: Record<string, {
    enabled: boolean;
    channels: Record<string, boolean>;
  }>;
}

interface NotificationState {
  notifications: Notification[];
  settings: NotificationSettings;
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Permission handling
  requestPermission: () => Promise<boolean>;
  checkPermission: () => NotificationPermission;
  
  // Desktop notifications
  showDesktopNotification: (notification: Notification) => void;
  playNotificationSound: () => void;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  sound: true,
  desktop: true,
  mentions: true,
  directMessages: true,
  keywords: [],
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  workspaceSettings: {},
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      settings: defaultSettings,
      unreadCount: 0,
      
      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };
        
        set((state) => {
          const newNotifications = [notification, ...state.notifications].slice(0, 100); // Keep last 100
          const unreadCount = newNotifications.filter(n => n.status === 'unread').length;
          
          return {
            notifications: newNotifications,
            unreadCount,
          };
        });
        
        // Show desktop notification if enabled
        const { settings } = get();
        if (settings.enabled && settings.desktop && !isInQuietHours(settings)) {
          get().showDesktopNotification(notification);
        }
        
        // Play sound if enabled
        if (settings.enabled && settings.sound && !isInQuietHours(settings)) {
          get().playNotificationSound();
        }
      },
      
      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, status: 'read' as NotificationStatus } : n
          );
          const unreadCount = notifications.filter(n => n.status === 'unread').length;
          
          return { notifications, unreadCount };
        });
      },
      
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, status: 'read' as NotificationStatus })),
          unreadCount: 0,
        }));
      },
      
      removeNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.filter(n => n.id !== id);
          const unreadCount = notifications.filter(n => n.status === 'unread').length;
          
          return { notifications, unreadCount };
        });
      },
      
      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },
      
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      
      requestPermission: async () => {
        if (!('Notification' in window)) {
          return false;
        }
        
        if (Notification.permission === 'granted') {
          return true;
        }
        
        if (Notification.permission === 'denied') {
          return false;
        }
        
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      },
      
      checkPermission: () => {
        if (!('Notification' in window)) {
          return 'denied';
        }
        return Notification.permission;
      },
      
      showDesktopNotification: (notification) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
          return;
        }
        
        const desktopNotif = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.type === 'call',
          silent: false,
        });
        
        desktopNotif.onclick = () => {
          window.focus();
          desktopNotif.close();
          
          // Navigate to relevant location based on notification type
          if (notification.channelId) {
            // Navigate to channel
          } else if (notification.dmId) {
            // Navigate to DM
          }
        };
        
        // Auto-close after 5 seconds unless it's a call
        if (notification.type !== 'call') {
          setTimeout(() => {
            desktopNotif.close();
          }, 5000);
        }
      },
      
      playNotificationSound: () => {
        try {
          const audio = new Audio('/notification-sound.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Fallback to system beep if audio fails
            if ('AudioContext' in window) {
              const audioContext = new AudioContext();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
              
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.1);
            }
          });
        } catch (error) {
          console.warn('Could not play notification sound:', error);
        }
      },
    }),
    {
      name: 'rlack-notifications',
      partialize: (state) => ({
        settings: state.settings,
        notifications: state.notifications.slice(0, 50), // Persist only recent notifications
      }),
    }
  )
);

// Helper function to check if we're in quiet hours
function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
  const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle cases where quiet hours span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }
  
  return currentTime >= startTime && currentTime <= endTime;
}