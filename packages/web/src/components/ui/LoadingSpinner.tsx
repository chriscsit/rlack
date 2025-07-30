import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
  text?: string;
}

const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'spinner', 
  className = '', 
  text 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  if (variant === 'spinner') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <Loader2 className={`${sizeClasses[size]} text-primary-600 dark:text-primary-400 animate-spin`} />
        {text && (
          <p className={`mt-2 text-gray-600 dark:text-gray-400 ${textSizeClasses[size]}`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${sizeClasses[size]} bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse`}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.4s'
              }}
            />
          ))}
        </div>
        {text && (
          <p className={`mt-2 text-gray-600 dark:text-gray-400 ${textSizeClasses[size]}`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`${sizeClasses[size]} bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse`} />
        {text && (
          <p className={`mt-2 text-gray-600 dark:text-gray-400 ${textSizeClasses[size]} animate-pulse`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  return null;
};

export default LoadingSpinner;