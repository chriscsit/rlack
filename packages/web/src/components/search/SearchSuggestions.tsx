import { Hash, User, ArrowRight } from 'lucide-react';

interface SearchSuggestionsProps {
  suggestions: any[];
  onSuggestionClick: (suggestion: any) => void;
}

const SearchSuggestions = ({ suggestions, onSuggestionClick }: SearchSuggestionsProps) => {
  if (!suggestions?.length) return null;

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Suggestions
      </h3>
      <div className="space-y-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.type}-${suggestion.id}-${index}`}
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full flex items-center justify-between p-2 text-left rounded-lg hover:bg-gray-50 group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 flex items-center justify-center">
                {suggestion.type === 'channel' ? (
                  <Hash size={16} className="text-gray-500" />
                ) : suggestion.type === 'user' ? (
                  <User size={16} className="text-gray-500" />
                ) : null}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 truncate">
                    {suggestion.icon}{suggestion.name}
                  </span>
                  {suggestion.type === 'user' && suggestion.status === 'ONLINE' && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </div>
                {suggestion.type === 'channel' && suggestion.workspace && (
                  <span className="text-sm text-gray-500 truncate">
                    in {suggestion.workspace}
                  </span>
                )}
                {suggestion.type === 'user' && suggestion.username && (
                  <span className="text-sm text-gray-500 truncate">
                    @{suggestion.username}
                  </span>
                )}
              </div>
            </div>
            
            <ArrowRight 
              size={14} 
              className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchSuggestions;