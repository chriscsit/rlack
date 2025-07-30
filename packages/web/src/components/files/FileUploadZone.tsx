import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, Image, FileText, Video, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import FilePreview from './FilePreview';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  multiple?: boolean;
  disabled?: boolean;
}

const FileUploadZone = ({
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
  maxSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes,
  multiple = true,
  disabled = false,
}: FileUploadZoneProps) => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast.error(`${file.name} is too large. Maximum size is ${formatFileSize(maxSize)}.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} is not a supported file type.`);
          } else {
            toast.error(`Error with ${file.name}: ${error.message}`);
          }
        });
      });

      // Handle accepted files
      if (acceptedFiles.length > 0) {
        const validFiles = acceptedFiles.filter(file => {
          // Additional size check
          if (file.size > maxSize) {
            toast.error(`${file.name} is too large. Maximum size is ${formatFileSize(maxSize)}.`);
            return false;
          }
          return true;
        });

        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
        }
      }
    },
    [onFilesSelected, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes?.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) || {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
      'audio/*': ['.mp3', '.wav', '.aac', '.ogg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
    },
    maxSize,
    multiple,
    disabled,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    if (file.type.startsWith('audio/')) return Music;
    return FileText;
  };

  return (
    <div className="w-full">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive && !isDragReject
              ? 'border-primary-500 bg-primary-50'
              : isDragReject
              ? 'border-red-500 bg-red-50'
              : disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-2">
          {isDragActive ? (
            <>
              <Upload className="mx-auto h-12 w-12 text-primary-500" />
              <p className="text-primary-600 font-medium">
                {isDragReject ? 'Some files are not supported' : 'Drop files here'}
              </p>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="space-y-1">
                <p className="text-gray-600 font-medium">
                  {disabled ? 'File upload disabled' : 'Drop files here or click to select'}
                </p>
                <p className="text-sm text-gray-500">
                  Maximum file size: {formatFileSize(maxSize)}
                </p>
                {acceptedTypes && (
                  <p className="text-xs text-gray-400">
                    Supported: {acceptedTypes.join(', ')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {isDragReject && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90 rounded-lg">
            <div className="text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <p className="text-red-600 font-medium">Some files are not supported</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const FileIcon = getFileTypeIcon(file);
              const progress = uploadProgress[file.name] || 0;
              
              return (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <FileIcon size={20} className="text-gray-500 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    
                    {progress > 0 && progress < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(index);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;