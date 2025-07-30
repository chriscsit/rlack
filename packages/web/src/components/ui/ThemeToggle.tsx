import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../../store/theme';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
}

const ThemeToggle = ({ variant = 'button', size = 'md' }: ThemeToggleProps) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore();

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const buttonSize = size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-3' : 'p-2';

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`${buttonSize} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100`}
        title="Toggle theme"
      >
        {resolvedTheme === 'dark' ? (
          <Sun size={iconSize} />
        ) : (
          <Moon size={iconSize} />
        )}
      </button>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={toggleTheme}
        className={`${buttonSize} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100`}
        title="Toggle theme"
      >
        {theme === 'system' ? (
          <Monitor size={iconSize} />
        ) : theme === 'dark' ? (
          <Moon size={iconSize} />
        ) : (
          <Sun size={iconSize} />
        )}
      </button>
      
      {/* Dropdown menu */}
      <div className="absolute right-0 top-full mt-2 py-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <button
          onClick={() => setTheme('light')}
          className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${
            theme === 'light' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          <Sun size={16} className="mr-3" />
          Light mode
        </button>
        
        <button
          onClick={() => setTheme('dark')}
          className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${
            theme === 'dark' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          <Moon size={16} className="mr-3" />
          Dark mode
        </button>
        
        <button
          onClick={() => setTheme('system')}
          className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${
            theme === 'system' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          <Monitor size={16} className="mr-3" />
          System preference
        </button>
      </div>
    </div>
  );
};

export default ThemeToggle;