import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Reply, Smile, Edit, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, Reaction } from '../../types';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/axios';
import toast from 'react-hot-toast';
import FilePreview from '../files/FilePreview';

interface MessageItemProps {
  message: Message;
  isConsecutive: boolean;
  isOwn: boolean;
}

const MessageItem = ({ message, isConsecutive, isOwn }: MessageItemProps) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const response = await api.post(`/messages/${message.id}/reactions`, { emoji });
      return response.data;
    },
    onError: () => {
      toast.error('Failed to add reaction');
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      await api.delete(`/messages/${message.id}/reactions/${reactionId}`);
    },
    onError: () => {
      toast.error('Failed to remove reaction');
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.put(`/messages/${message.id}`, { content });
      return response.data;
    },
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Message updated');
    },
    onError: () => {
      toast.error('Failed to update message');
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/messages/${message.id}`);
    },
    onSuccess: () => {
      toast.success('Message deleted');
    },
    onError: () => {
      toast.error('Failed to delete message');
    },
  });

  const handleReactionClick = (reaction: Reaction) => {
    const userReaction = reaction.users.find(u => u.id === user?.id);
    
    if (userReaction) {
      removeReactionMutation.mutate(reaction.id);
    } else {
      addReactionMutation.mutate(reaction.emoji);
    }
  };

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessageMutation.mutate(editContent.trim());
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        users: [],
        count: 0,
        id: reaction.id,
      };
    }
    acc[reaction.emoji].users.push(...reaction.users);
    acc[reaction.emoji].count = acc[reaction.emoji].users.length;
    return acc;
  }, {} as Record<string, { emoji: string; users: any[]; count: number; id: string }>) || {};

  return (
    <div
      className={`group relative hover:bg-gray-50 px-4 py-1 ${isConsecutive ? 'py-0.5' : 'py-2'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex space-x-3">
        {/* Avatar */}
        {!isConsecutive && (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-medium text-sm">
              {message.author.firstName?.charAt(0)}{message.author.lastName?.charAt(0)}
            </span>
          </div>
        )}
        
        {isConsecutive && (
          <div className="w-8 flex items-center justify-center">
            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {!isConsecutive && (
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="font-semibold text-gray-900">
                {message.author.firstName} {message.author.lastName}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(message.createdAt)}
              </span>
              {message.updatedAt !== message.createdAt && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
          )}

          {/* Message text */}
          <div className="text-gray-900">
            {isEditing ? (
              <div className="mt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  autoFocus
                />
                <div className="flex items-center justify-end space-x-2 mt-2 text-xs text-gray-500">
                  <span>Press Enter to save, Esc to cancel</span>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Files */}
          {message.files && message.files.length > 0 && (
            <div className="mt-2">
              {message.files.length === 1 ? (
                <FilePreview
                  file={message.files[0]}
                  showPreview={true}
                  compact={false}
                />
              ) : (
                <div className="space-y-2">
                  {message.files.map((file) => (
                    <FilePreview
                      key={file.id}
                      file={file}
                      showPreview={true}
                      compact={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.values(groupedReactions).map((reaction) => {
                const hasUserReacted = reaction.users.some(u => u.id === user?.id);
                return (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReactionClick({
                      id: reaction.id,
                      emoji: reaction.emoji,
                      users: reaction.users,
                    } as Reaction)}
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReacted
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && !isEditing && (
        <div className="absolute top-0 right-4 flex items-center space-x-1 bg-white border border-gray-200 rounded shadow-sm py-1 px-2">
          <button
            onClick={() => addReactionMutation.mutate('👍')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Smile size={14} className="text-gray-500" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Reply size={14} className="text-gray-500" />
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Edit size={14} className="text-gray-500" />
              </button>
              <button
                onClick={() => deleteMessageMutation.mutate()}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Trash2 size={14} className="text-gray-500" />
              </button>
            </>
          )}
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreHorizontal size={14} className="text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageItem;