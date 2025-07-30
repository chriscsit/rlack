import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/app';
import { api } from '../../lib/axios';
import { Channel } from '../../types';
import MessageList from '../../components/messaging/MessageList';
import MessageInput from '../../components/messaging/MessageInput';

const ChannelPage = () => {
  const { workspaceSlug, channelName } = useParams();
  const { currentWorkspace, setCurrentChannel, currentChannel } = useAppStore();

  // Fetch channel by name
  const { data: channel } = useQuery({
    queryKey: ['channel', workspaceSlug, channelName],
    queryFn: async () => {
      if (!workspaceSlug || !channelName) return null;
      const response = await api.get(`/workspaces/${workspaceSlug}/channels/${channelName}`);
      return response.data.channel as Channel;
    },
    enabled: !!workspaceSlug && !!channelName,
  });

  // Update current channel
  useEffect(() => {
    if (channel && channel.id !== currentChannel?.id) {
      setCurrentChannel(channel);
    }
  }, [channel, currentChannel, setCurrentChannel]);

  // Join channel if not a member
  useEffect(() => {
    if (channel && !channel.isMember) {
      // Auto-join public channels
      if (channel.type === 'PUBLIC') {
        api.post(`/channels/${channel.id}/join`).catch(console.error);
      }
    }
  }, [channel]);

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Channel not found
          </h2>
          <p className="text-gray-600">
            The channel #{channelName} doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <MessageList type="channel" channelId={channel.id} />
      
      {/* Message input */}
      <MessageInput type="channel" channelId={channel.id} />
    </div>
  );
};

export default ChannelPage;