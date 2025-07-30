import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useAuthStore } from '../../store/auth';
import { useAppStore } from '../../store/app';
import { socketService } from '../../lib/socket';
import { api } from '../../lib/axios';
import { Message, DirectMessage as DMType } from '../../types';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  type: 'channel' | 'dm';
  channelId?: string;
  dmId?: string;
}

const MessageList = ({ type, channelId, dmId }: MessageListProps) => {
  const { user } = useAuthStore();
  const { currentChannel, currentDM, typingUsers } = useAppStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);

  // Intersection observer for auto-scroll
  const { ref: bottomRef, inView } = useInView();

  // Query key based on type
  const queryKey = type === 'channel' 
    ? ['messages', 'channel', channelId]
    : ['messages', 'dm', dmId];

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (type === 'channel' && channelId) {
        const response = await api.get(`/channels/${channelId}/messages`);
        return response.data;
      } else if (type === 'dm' && dmId) {
        const response = await api.get(`/users/direct-messages/${dmId}/messages`);
        return response.data;
      }
      return { messages: [] };
    },
    enabled: !!(type === 'channel' ? channelId : dmId),
    refetchOnWindowFocus: false,
  });

  const messages = messagesData?.messages || [];

  // Auto-scroll to bottom when new messages arrive or when component mounts
  useEffect(() => {
    if (hasScrolledToBottom || inView) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasScrolledToBottom, inView]);

  // Set up real-time message listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // Add message to cache if it belongs to current channel/DM
      if (
        (type === 'channel' && message.channelId === channelId) ||
        (type === 'dm' && message.dmId === dmId)
      ) {
        queryClient.setQueryData(queryKey, (old: any) => ({
          ...old,
          messages: [...(old?.messages || []), message],
        }));
      }
    };

    const handleMessageUpdated = (message: Message) => {
      queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        messages: (old?.messages || []).map((m: Message) =>
          m.id === message.id ? message : m
        ),
      }));
    };

    const handleMessageDeleted = (messageId: string) => {
      queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        messages: (old?.messages || []).filter((m: Message) => m.id !== messageId),
      }));
    };

    const handleReactionAdded = (data: { messageId: string; reaction: any }) => {
      queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        messages: (old?.messages || []).map((m: Message) =>
          m.id === data.messageId
            ? { ...m, reactions: [...(m.reactions || []), data.reaction] }
            : m
        ),
      }));
    };

    const handleReactionRemoved = (data: { messageId: string; reactionId: string }) => {
      queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        messages: (old?.messages || []).map((m: Message) =>
          m.id === data.messageId
            ? { 
                ...m, 
                reactions: (m.reactions || []).filter(r => r.id !== data.reactionId)
              }
            : m
        ),
      }));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
    };
  }, [queryKey, type, channelId, dmId, queryClient]);

  // Join appropriate room when component mounts
  useEffect(() => {
    if (type === 'channel' && currentChannel) {
      socketService.joinChannel(currentChannel.id);
    } else if (type === 'dm' && currentDM) {
      socketService.joinDM(currentDM.id);
    }

    return () => {
      // Leave room when component unmounts or changes
      if (type === 'channel' && currentChannel) {
        socketService.leaveChannel(currentChannel.id);
      }
    };
  }, [type, currentChannel, currentDM]);

  // Group messages by date
  const groupedMessages = messages.reduce((groups: any[], message: Message) => {
    const messageDate = new Date(message.createdAt).toDateString();
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.date !== messageDate) {
      groups.push({
        date: messageDate,
        messages: [message],
      });
    } else {
      lastGroup.messages.push(message);
    }

    return groups;
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Welcome message for empty channels */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              {type === 'channel' 
                ? `Welcome to #${currentChannel?.name}!`
                : 'Start a conversation'
              }
            </div>
            <div className="text-sm text-gray-400">
              {type === 'channel'
                ? 'This is the beginning of your conversation in this channel.'
                : 'Send a message to get started.'
              }
            </div>
          </div>
        )}

        {/* Messages grouped by date */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center justify-center my-4">
              <div className="flex-1 border-t border-gray-200" />
              <div className="px-4 py-1 bg-white text-xs text-gray-500 font-medium rounded-full border border-gray-200">
                {new Date(group.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-2">
              {group.messages.map((message: Message, index: number) => {
                const prevMessage = group.messages[index - 1];
                const isConsecutive = prevMessage && 
                  prevMessage.authorId === message.authorId &&
                  new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 5 * 60 * 1000; // 5 minutes

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isConsecutive={isConsecutive}
                    isOwn={message.authorId === user?.id}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <TypingIndicator 
          typingUsers={typingUsers}
          currentUserId={user?.id || ''}
        />

        {/* Bottom ref for auto-scroll */}
        <div ref={bottomRef} />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;