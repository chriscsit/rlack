import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Smile, AtSign } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import FileUploadZone from '../files/FileUploadZone';
import { useAuthStore } from '../../store/auth';
import { useAppStore } from '../../store/app';
import { socketService } from '../../lib/socket';
import { api } from '../../lib/axios';
import toast from 'react-hot-toast';

interface MessageInputProps {
  type: 'channel' | 'dm';
  channelId?: string;
  dmId?: string;
}

const MessageInput = ({ type, channelId, dmId }: MessageInputProps) => {
  const { user } = useAuthStore();
  const { currentChannel, currentDM } = useAppStore();
  const queryClient = useQueryClient();
  
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.post('/messages', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      setMessage('');
      setFiles([]);
      // Refocus textarea
      textareaRef.current?.focus();
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      if (type === 'channel' && channelId) {
        socketService.startTyping(channelId);
      } else if (type === 'dm' && dmId) {
        socketService.startTyping(dmId);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  }, [isTyping, type, channelId, dmId]);

  const handleTypingStop = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      if (type === 'channel' && channelId) {
        socketService.stopTyping(channelId);
      } else if (type === 'dm' && dmId) {
        socketService.stopTyping(dmId);
      }
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [isTyping, type, channelId, dmId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && files.length === 0) return;

    handleTypingStop();

    const formData = new FormData();
    
    if (trimmedMessage) {
      formData.append('content', trimmedMessage);
    }

    if (type === 'channel' && channelId) {
      formData.append('channelId', channelId);
    } else if (type === 'dm' && dmId) {
      formData.append('dmId', dmId);
    }

    // Add files
    files.forEach((file) => {
      formData.append('files', file);
    });

    sendMessageMutation.mutate(formData);
  };

  // File upload handling
  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const [showFileUpload, setShowFileUpload] = useState(false);

  const placeholder = type === 'channel' 
    ? `Message #${currentChannel?.name}`
    : 'Send a direct message';

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* File upload zone */}
      {showFileUpload && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            selectedFiles={files}
            onRemoveFile={removeFile}
            maxSize={50 * 1024 * 1024} // 50MB
            multiple={true}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setShowFileUpload(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Input area */}
        <div className="relative border rounded-lg border-gray-300 focus-within:border-primary-500">
          <div className="flex items-end space-x-2 p-3">
            {/* Attachment button */}
            <button 
              onClick={() => setShowFileUpload(!showFileUpload)}
              className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                showFileUpload ? 'text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Paperclip size={20} />
            </button>

            {/* Message input */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full resize-none border-0 focus:ring-0 focus:outline-none text-sm max-h-32"
                rows={1}
              />
            </div>

            {/* Right buttons */}
            <div className="flex items-center space-x-1">
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <AtSign size={20} />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <Smile size={20} />
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() && files.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  (message.trim() || files.length > 0)
                    ? 'text-white bg-primary-600 hover:bg-primary-700'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-2 text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to send, 
          <kbd className="px-1 py-0.5 bg-gray-100 rounded ml-1">Shift + Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};

export default MessageInput;