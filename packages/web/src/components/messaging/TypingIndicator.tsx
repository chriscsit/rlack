interface TypingIndicatorProps {
  typingUsers: Array<{
    userId: string;
    username: string;
    channelId?: string;
    dmId?: string;
  }>;
  currentUserId: string;
}

const TypingIndicator = ({ typingUsers, currentUserId }: TypingIndicatorProps) => {
  // Filter out current user
  const otherTypingUsers = typingUsers.filter(user => user.userId !== currentUserId);

  if (otherTypingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return 'Someone is typing...';
    } else if (otherTypingUsers.length === 2) {
      return '2 people are typing...';
    } else {
      return 'Several people are typing...';
    }
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="italic">{getTypingText()}</span>
      </div>
    </div>
  );
};

export default TypingIndicator;