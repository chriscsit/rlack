import { useState } from 'react';
import { Download, ExternalLink, Eye, X, FileText, Image, Video, Music, Archive, Code } from 'lucide-react';
import { File } from '../../types';

interface FilePreviewProps {
  file: File;
  showPreview?: boolean;
  compact?: boolean;
  onRemove?: () => void;
}

const FilePreview = ({ file, showPreview = true, compact = false, onRemove }: FilePreviewProps) => {
  const [imageError, setImageError] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return Archive;
    if (mimeType.includes('javascript') || mimeType.includes('json') || fileName.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|php|html|css|sql)$/)) return Code;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = file.mimeType?.startsWith('image/');
  const isVideo = file.mimeType?.startsWith('video/');
  const isAudio = file.mimeType?.startsWith('audio/');
  const isPDF = file.mimeType?.includes('pdf');

  const FileIcon = getFileIcon(file.mimeType || '', file.originalName);

  const handleDownload = () => {
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  const handlePreview = () => {
    if (isImage || isPDF) {
      setShowFullPreview(true);
    } else {
      handleDownload();
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
        <FileIcon size={16} className="text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.originalName}</p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>
        <div className="flex items-center space-x-1">
          {showPreview && (isImage || isPDF) && (
            <button
              onClick={handlePreview}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              title="Preview"
            >
              <Eye size={14} />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            title="Download"
          >
            <Download size={14} />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-gray-500 hover:text-red-600 rounded"
              title="Remove"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
        {/* File preview */}
        {isImage && showPreview && !imageError ? (
          <div className="mb-3">
            <img
              src={`/api/files/${file.id}/thumbnail`}
              alt={file.originalName}
              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handlePreview}
              onError={() => setImageError(true)}
            />
          </div>
        ) : isVideo && showPreview ? (
          <div className="mb-3 relative">
            <video
              className="w-full h-48 object-cover rounded-lg"
              controls
              preload="metadata"
            >
              <source src={`/api/files/${file.id}/stream`} type={file.mimeType} />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : isAudio && showPreview ? (
          <div className="mb-3">
            <audio controls className="w-full">
              <source src={`/api/files/${file.id}/stream`} type={file.mimeType} />
              Your browser does not support the audio element.
            </audio>
          </div>
        ) : (
          <div className="mb-3 flex items-center justify-center h-24 bg-gray-50 rounded-lg">
            <FileIcon size={32} className="text-gray-400" />
          </div>
        )}

        {/* File info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                {file.originalName}
              </h4>
              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                <span>{formatFileSize(file.size)}</span>
                {file.mimeType && (
                  <>
                    <span>•</span>
                    <span className="uppercase">{file.mimeType.split('/')[1]}</span>
                  </>
                )}
              </div>
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Remove"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {showPreview && (isImage || isPDF) && (
              <button
                onClick={handlePreview}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Eye size={12} />
                <span>Preview</span>
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Download size={12} />
              <span>Download</span>
            </button>
            <button
              onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <ExternalLink size={12} />
              <span>Open</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full preview modal */}
      {showFullPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {file.originalName}
              </h3>
              <button
                onClick={() => setShowFullPreview(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {isImage ? (
                <img
                  src={`/api/files/${file.id}`}
                  alt={file.originalName}
                  className="max-w-full max-h-[80vh] object-contain mx-auto"
                />
              ) : isPDF ? (
                <iframe
                  src={`/api/files/${file.id}`}
                  className="w-full h-[80vh]"
                  title={file.originalName}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FilePreview;