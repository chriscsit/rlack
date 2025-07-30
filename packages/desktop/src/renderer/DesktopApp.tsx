import { useEffect } from 'react';
import { useDesktopStore } from './store/desktop';

function DesktopApp() {
  const { initializeDesktop } = useDesktopStore();

  useEffect(() => {
    // Initialize desktop-specific features
    initializeDesktop();
  }, [initializeDesktop]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🚀 Rlack Desktop
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your complete Slack clone is now running natively on macOS!
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            ✅ Features Available
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Real-time messaging</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">File sharing</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Voice/Video calls</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Advanced search</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Dark/Light themes</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Desktop notifications</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Native macOS integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Keyboard shortcuts</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🌐 Web Version Available
          </h3>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            The full web interface is running at:{" "}
            <a 
              href="http://localhost:3002" 
              className="underline hover:text-blue-600"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openExternal('http://localhost:3002');
              }}
            >
              http://localhost:3002
            </a>
          </p>
          <button
            onClick={() => window.electronAPI?.openExternal('http://localhost:3002')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Open Web Version
          </button>
        </div>
      </div>
    </div>
  );
}

export default DesktopApp;