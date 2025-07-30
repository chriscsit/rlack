import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/app';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/axios';
import { DirectMessage } from '../../types';
import MessageList from '../../components/messaging/MessageList';
import MessageInput from '../../components/messaging/MessageInput';

const DirectMessagePage = () => {
  const { dmId } = useParams();
  const { user } = useAuthStore();
  const { setCurrentDM, currentDM } = useAppStore();

  // Fetch direct message by ID
  const { data: dm } = useQuery({
    queryKey: ['direct-message', dmId],
    queryFn: async () => {
      if (!dmId) return null;
      const response = await api.get(`/users/direct-messages/${dmId}`);
      return response.data.directMessage as DirectMessage;
    },
    enabled: !!dmId,
  });

  // Update current DM
  useEffect(() => {
    if (dm && dm.id !== currentDM?.id) {
      setCurrentDM(dm);
    }
  }, [dm, currentDM, setCurrentDM]);

  if (!dm) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Conversation not found
          </h2>
          <p className="text-gray-600">
            This direct message conversation doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const otherUser = dm.participants.find(p => p.id !== user?.id);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {otherUser?.firstName?.charAt(0)}{otherUser?.lastName?.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {otherUser?.firstName} {otherUser?.lastName}
            </h2>
            <p className="text-sm text-gray-500">@{otherUser?.username}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList type="dm" dmId={dm.id} />
      
      {/* Message input */}
      <MessageInput type="dm" dmId={dm.id} />
    </div>
  );
};

export default DirectMessagePage;