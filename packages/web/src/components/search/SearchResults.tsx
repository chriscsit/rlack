import { useState } from 'react';
import { 
  MessageSquare, 
  File, 
  User, 
  Hash, 
  Calendar,
  Download,
  ExternalLink,
  MoreHorizontal,
  Reply
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/app';

interface SearchResultsProps {
  results: any;
  query: string;
  onResultClick: () => void;
}

const SearchResults = ({ results, query, onResultClick }: SearchResultsProps) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();
  const { setCurrentChannel, setCurrentDM } = useAppStore();

  const tabs = [
    { key: 'all', label: 'All', count: results.totalCounts?.total || 0 },
    { key: 'messages', label: 'Messages', count: results.totalCounts?.messages || 0 },
    { key: 'files', label: 'Files', count: results.totalCounts?.files || 0 },
    { key: 'users', label: 'People', count: results.totalCounts?.users || 0 },
    { key: 'channels', label: 'Channels', count: results.totalCounts?.channels || 0 },
  ].filter(tab => tab.count > 0);

  const handleMessageClick = (message: any) => {
    if (message.channel) {
      setCurrentChannel(message.channel);
      navigate(`/workspace/${message.channel.workspace?.slug || 'default'}/channel/${message.channel.name}`);
    } else if (message.directMessage) {
      setCurrentDM(message.directMessage);
      navigate(`/workspace/default/dm/${message.directMessage.id}`);
    }
    onResultClick();
  };

  const handleChannelClick = (channel: any) => {
    setCurrentChannel(channel);
    navigate(`/workspace/${channel.workspace?.slug || 'default'}/channel/${channel.name}`);
    onResultClick();
  };

  const handleUserClick = (user: any) => {
    // Navigate to user profile or start DM
    console.log('User clicked:', user);
    onResultClick();
  };

  const handleFileClick = (file: any) => {
    // Open file or navigate to file location
    window.open(`/api/files/${file.id}`, '_blank');
  };

  const renderMessage = (message: any) => (
    <div
      key={message.id}
      className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      onClick={() => handleMessageClick(message)}
    >
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">
            {message.author.firstName?.[0]}{message.author.lastName?.[0]}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">
              {message.author.firstName} {message.author.lastName}
            </span>
            <span className="text-sm text-gray-500">
              in {message.channel ? (
                <span className="flex items-center">
                  <Hash size={12} className="mr-1" />
                  {message.channel.name}
                </span>
              ) : (
                <span className="flex items-center">
                  <MessageSquare size={12} className="mr-1" />
                  Direct message
                </span>
              )}
            </span>
            <span className="text-sm text-gray-400">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          <div 
            className="text-gray-700 text-sm"
            dangerouslySetInnerHTML={{ __html: message.highlight || message.content }}
          />
          
          {message.files && message.files.length > 0 && (
            <div className="mt-2 flex items-center space-x-2">
              <File size={14} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                {message.files.length} file{message.files.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <Reply size={14} />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderFile = (file: any) => (
    <div
      key={file.id}
      className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      onClick={() => handleFileClick(file)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <File size={20} className="text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-gray-900 truncate"
            dangerouslySetInnerHTML={{ __html: file.highlight || file.originalName }}
          />
          <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
            <span>{(file.size / 1024).toFixed(1)} KB</span>
            <span>•</span>
            <span>
              Uploaded by {file.uploadedBy.firstName} {file.uploadedBy.lastName}
            </span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</span>
          </div>
          {file.channel && (
            <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
              <Hash size={12} />
              <span>{file.channel.name}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/api/files/${file.id}/download`, '_blank');
            }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Download"
          >
            <Download size={16} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleFileClick(file);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Open"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderUser = (user: any) => (
    <div
      key={user.id}
      className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      onClick={() => handleUserClick(user)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span 
              className="font-medium text-gray-900"
              dangerouslySetInnerHTML={{ 
                __html: `${user.highlight?.firstName || user.firstName || ''} ${user.highlight?.lastName || user.lastName || ''}`.trim() 
              }}
            />
            <span 
              className="text-gray-500"
              dangerouslySetInnerHTML={{ __html: `@${user.highlight?.username || user.username}` }}
            />
            <span className={`w-2 h-2 rounded-full ${
              user.status === 'ONLINE' ? 'bg-green-500' :
              user.status === 'AWAY' ? 'bg-yellow-500' :
              'bg-gray-400'
            }`} />
          </div>
          <div 
            className="text-sm text-gray-500 truncate"
            dangerouslySetInnerHTML={{ __html: user.highlight?.email || user.email }}
          />
        </div>
        
        <button className="px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-300 rounded-lg transition-colors">
          Message
        </button>
      </div>
    </div>
  );

  const renderChannel = (channel: any) => (
    <div
      key={channel.id}
      className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      onClick={() => handleChannelClick(channel)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Hash size={20} className="text-gray-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span 
              className="font-medium text-gray-900"
              dangerouslySetInnerHTML={{ __html: channel.highlight?.name || channel.name }}
            />
            <span className="text-sm text-gray-500">
              in {channel.workspace.name}
            </span>
          </div>
          {channel.description && (
            <div 
              className="text-sm text-gray-500 mt-1"
              dangerouslySetInnerHTML={{ __html: channel.highlight?.description || channel.description }}
            />
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
            <span>{channel._count.members} members</span>
            <span>{channel._count.messages} messages</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              channel.type === 'PUBLIC' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {channel.type.toLowerCase()}
            </span>
          </div>
        </div>
        
        <button className="px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-300 rounded-lg transition-colors">
          Join
        </button>
      </div>
    </div>
  );

  const getResultsToShow = () => {
    if (activeTab === 'all') {
      const allResults = [
        ...(results.messages || []),
        ...(results.files || []),
        ...(results.users || []),
        ...(results.channels || [])
      ].sort((a, b) => {
        const aDate = new Date(a.createdAt || a.uploadedAt || 0);
        const bDate = new Date(b.createdAt || b.uploadedAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
      return allResults;
    }
    return results[activeTab] || [];
  };

  const resultsToShow = getResultsToShow();

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="border-b border-gray-200 px-4">
          <div className="flex space-x-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {resultsToShow.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'messages' && <MessageSquare size={24} className="text-gray-400" />}
                {activeTab === 'files' && <File size={24} className="text-gray-400" />}
                {activeTab === 'users' && <User size={24} className="text-gray-400" />}
                {activeTab === 'channels' && <Hash size={24} className="text-gray-400" />}
                {activeTab === 'all' && <MessageSquare size={24} className="text-gray-400" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab === 'all' ? 'results' : activeTab} found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search terms or filters
              </p>
            </div>
          </div>
        ) : (
          <div>
            {resultsToShow.map((result: any) => {
              switch (result.type) {
                case 'message':
                  return renderMessage(result);
                case 'file':
                  return renderFile(result);
                case 'user':
                  return renderUser(result);
                case 'channel':
                  return renderChannel(result);
                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;