import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '../components/ui/input';
import ContentCard from '../components/ContentCard';
import { contentAPI } from '../services/api';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const data = await contentAPI.search(searchQuery);
      setResults(data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Search</h1>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-12">
          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for movies, TV shows, anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 h-14 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-lg"
            />
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-white text-xl">Searching...</div>
          </div>
        ) : query && (
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">
              {results.length > 0 ? (
                <>Found {results.length} results for "{query}"</>
              ) : (
                <>No results found for "{query}"</>
              )}
            </h2>
            
            {results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.map((item) => (
                  <ContentCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {!query && !loading && (
          <div className="text-center py-20">
            <SearchIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Start searching for your favorite content</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;