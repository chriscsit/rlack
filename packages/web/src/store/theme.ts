import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getResolvedTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

const applyTheme = (resolvedTheme: ResolvedTheme) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Update meta theme color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#1f2937' : '#ffffff');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      
      setTheme: (theme: Theme) => {
        const resolvedTheme = getResolvedTheme(theme);
        set({ theme, resolvedTheme });
        applyTheme(resolvedTheme);
      },
      
      toggleTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          const systemTheme = getSystemTheme();
          get().setTheme(systemTheme === 'dark' ? 'light' : 'dark');
        } else {
          get().setTheme(theme === 'light' ? 'dark' : 'light');
        }
      },
      
      initializeTheme: () => {
        const { theme } = get();
        const resolvedTheme = getResolvedTheme(theme);
        set({ resolvedTheme });
        applyTheme(resolvedTheme);
        
        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => {
            if (get().theme === 'system') {
              const newResolvedTheme = getSystemTheme();
              set({ resolvedTheme: newResolvedTheme });
              applyTheme(newResolvedTheme);
            }
          };
          
          mediaQuery.addEventListener('change', handleChange);
          
          // Cleanup function is returned but not used since this is a singleton store
          return () => mediaQuery.removeEventListener('change', handleChange);
        }
      },
    }),
    {
      name: 'rlack-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);