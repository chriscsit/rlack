import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Download, Grid, List, Calendar, FileText, Image, Video, Music } from 'lucide-react';
import { api } from '../../lib/axios';
import { File } from '../../types';
import FilePreview from './FilePreview';

interface FileGalleryProps {
  workspaceId?: string;
  channelId?: string;
  dmId?: string;
  userId?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'documents' | 'videos' | 'audio' | 'other';
type SortBy = 'date' | 'name' | 'size' | 'type';

const FileGallery = ({ workspaceId, channelId, dmId, userId }: FileGalleryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch files
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['files', { workspaceId, channelId, dmId, userId }],
    queryFn: async () => {
      let url = '/files';
      const params = new URLSearchParams();
      
      if (workspaceId) params.append('workspaceId', workspaceId);
      if (channelId) params.append('channelId', channelId);
      if (dmId) params.append('dmId', dmId);
      if (userId) params.append('userId', userId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      return response.data;
    },
  });

  const files = filesData?.files || [];

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files.filter((file: File) => {
      // Search filter
      if (searchQuery && !file.originalName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filterType !== 'all') {
        const mimeType = file.mimeType || '';
        switch (filterType) {
          case 'images':
            return mimeType.startsWith('image/');
          case 'documents':
            return (
              mimeType.includes('pdf') ||
              mimeType.includes('document') ||
              mimeType.includes('spreadsheet') ||
              mimeType.includes('presentation') ||
              mimeType.startsWith('text/')
            );
          case 'videos':
            return mimeType.startsWith('video/');
          case 'audio':
            return mimeType.startsWith('audio/');
          case 'other':
            return !(
              mimeType.startsWith('image/') ||
              mimeType.startsWith('video/') ||
              mimeType.startsWith('audio/') ||
              mimeType.includes('pdf') ||
              mimeType.includes('document') ||
              mimeType.includes('spreadsheet') ||
              mimeType.includes('presentation') ||
              mimeType.startsWith('text/')
            );
          default:
            return true;
        }
      }

      return true;
    });

    // Sort files
    filtered.sort((a: File, b: File) => {
      switch (sortBy) {
        case 'name':
          return a.originalName.localeCompare(b.originalName);
        case 'size':
          return b.size - a.size;
        case 'type':
          return (a.mimeType || '').localeCompare(b.mimeType || '');
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    return filtered;
  }, [files, searchQuery, filterType, sortBy]);

  const getFilterCounts = () => {
    const counts = {
      all: files.length,
      images: 0,
      documents: 0,
      videos: 0,
      audio: 0,
      other: 0,
    };

    files.forEach((file: File) => {
      const mimeType = file.mimeType || '';
      if (mimeType.startsWith('image/')) counts.images++;
      else if (mimeType.startsWith('video/')) counts.videos++;
      else if (mimeType.startsWith('audio/')) counts.audio++;
      else if (
        mimeType.includes('pdf') ||
        mimeType.includes('document') ||
        mimeType.includes('spreadsheet') ||
        mimeType.includes('presentation') ||
        mimeType.startsWith('text/')
      ) counts.documents++;
      else counts.other++;
    });

    return counts;
  };

  const filterCounts = getFilterCounts();

  const handleDownloadAll = () => {
    filteredAndSortedFiles.forEach((file: File) => {
      window.open(`/api/files/${file.id}/download`, '_blank');
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Files</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            >
              {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Toggle filters"
            >
              <Filter size={20} />
            </button>
            {filteredAndSortedFiles.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Download size={16} />
                <span>Download All</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">File Type</label>
                <div className="space-y-1">
                  {[
                    { key: 'all', label: 'All Files', icon: FileText, count: filterCounts.all },
                    { key: 'images', label: 'Images', icon: Image, count: filterCounts.images },
                    { key: 'documents', label: 'Documents', icon: FileText, count: filterCounts.documents },
                    { key: 'videos', label: 'Videos', icon: Video, count: filterCounts.videos },
                    { key: 'audio', label: 'Audio', icon: Music, count: filterCounts.audio },
                    { key: 'other', label: 'Other', icon: FileText, count: filterCounts.other },
                  ].map(({ key, label, icon: Icon, count }) => (
                    <button
                      key={key}
                      onClick={() => setFilterType(key as FilterType)}
                      className={`w-full flex items-center justify-between px-2 py-1 text-xs rounded ${
                        filterType === key
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <Icon size={12} />
                        <span>{label}</span>
                      </div>
                      <span className="text-xs">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                  <option value="type">Type</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? `No files match "${searchQuery}"`
                : filterType !== 'all'
                ? `No ${filterType} files found`
                : 'No files have been shared yet'}
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
            }
          >
            {filteredAndSortedFiles.map((file: File) => (
              <div key={file.id}>
                <FilePreview
                  file={file}
                  compact={viewMode === 'list'}
                  showPreview={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileGallery;