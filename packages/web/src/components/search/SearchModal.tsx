import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Filter, 
  Calendar,
  User,
  Hash,
  File,
  MessageSquare,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useAppStore } from '../../store/app';
import { useDebounce } from '../../hooks/useDebounce';
import SearchResults from './SearchResults';
import SearchFilters from './SearchFilters';
import SearchSuggestions from './SearchSuggestions';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SearchFilters {
  type: 'all' | 'messages' | 'files' | 'users' | 'channels';
  workspaceId?: string;
  channelId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ type: 'all' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const { currentWorkspace } = useAppStore();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setFilters({ type: 'all' });
      setShowFilters(false);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return null;
      
      const params = new URLSearchParams({
        query: debouncedQuery,
        type: filters.type,
        ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
        ...(filters.channelId && { channelId: filters.channelId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });
      
      const response = await api.get(`/search?${params}`);
      return response.data;
    },
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  // Search suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (query.length < 2) return null;
      
      const response = await api.get(`/search/suggestions?query=${encodeURIComponent(query)}`);
      return response.data;
    },
    enabled: isOpen && query.length >= 2 && !searchResults,
  });

  // Recent searches (stored in localStorage)
  const recentSearches = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('rlack-recent-searches') || '[]').slice(0, 5);
    } catch {
      return [];
    }
  }, [isOpen]);

  const saveRecentSearch = (searchQuery: string) => {
    if (searchQuery.length < 2) return;
    
    try {
      const recent = JSON.parse(localStorage.getItem('rlack-recent-searches') || '[]');
      const filtered = recent.filter((s: string) => s !== searchQuery);
      const updated = [searchQuery, ...filtered].slice(0, 10);
      localStorage.setItem('rlack-recent-searches', JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleSearch = () => {
    if (query.length >= 2) {
      saveRecentSearch(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleQuickFilter = (type: SearchFilters['type']) => {
    setFilters(prev => ({ ...prev, type }));
    if (query.length >= 2) {
      handleSearch();
    }
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    saveRecentSearch(recentQuery);
  };

  if (!isOpen) return null;

  const showSuggestions = query.length >= 2 && !searchResults && suggestions?.suggestions;
  const showRecent = query.length < 2 && recentSearches.length > 0;
  const showResults = searchResults && query.length >= 2;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search ${currentWorkspace?.name || 'Rlack'}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-primary-50 border-primary-200 text-primary-600' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Filters"
            >
              <Filter size={20} />
            </button>
            
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick filters */}
          <div className="flex items-center space-x-2 mt-3">
            {[
              { key: 'all', label: 'All', icon: Search },
              { key: 'messages', label: 'Messages', icon: MessageSquare },
              { key: 'files', label: 'Files', icon: File },
              { key: 'users', label: 'People', icon: User },
              { key: 'channels', label: 'Channels', icon: Hash },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleQuickFilter(key as SearchFilters['type'])}
                className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.type === key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && query.length >= 2 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Searching...</p>
              </div>
            </div>
          )}

          {showRecent && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Clock size={16} className="mr-2" />
                Recent searches
              </h3>
              <div className="space-y-2">
                {recentSearches.map((recentQuery: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className="w-full flex items-center justify-between p-2 text-left rounded-lg hover:bg-gray-50 group"
                  >
                    <span className="text-gray-700">{recentQuery}</span>
                    <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSuggestions && (
            <SearchSuggestions
              suggestions={suggestions.suggestions}
              onSuggestionClick={(suggestion) => {
                // Handle navigation based on suggestion type
                console.log('Suggestion clicked:', suggestion);
                onClose();
              }}
            />
          )}

          {showResults && (
            <SearchResults
              results={searchResults}
              query={query}
              onResultClick={() => onClose()}
            />
          )}

          {query.length >= 2 && !isLoading && !searchResults && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500">
                  Try adjusting your search terms or filters
                </p>
              </div>
            </div>
          )}

          {query.length < 2 && !showRecent && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search Rlack</h3>
                <p className="text-gray-500">
                  Find messages, files, people, and channels
                </p>
              </div>
            </div>
          )}
        </div>

                  {/* Footer */}
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>↵ to search</span>
              <span>ESC to close</span>
              <span>⌘K to open search</span>
            </div>
            {searchResults?.totalCounts && (
              <span>
                {searchResults.totalCounts.total} results
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;