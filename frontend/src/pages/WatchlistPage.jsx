import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import ContentCard from '../components/ContentCard';

const WatchlistPage = () => {
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const loadWatchlist = () => {
      const saved = JSON.parse(localStorage.getItem('watchlist') || '[]');
      setWatchlist(saved);
    };

    loadWatchlist();
    
    // Listen for storage changes
    window.addEventListener('storage', loadWatchlist);
    return () => window.removeEventListener('storage', loadWatchlist);
  }, []);

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-8 w-8 text-yellow-400 fill-yellow-400" />
          <h1 className="text-4xl font-bold text-white">My Watchlist</h1>
        </div>

        {watchlist.length > 0 ? (
          <>
            <p className="text-gray-400 mb-8">
              You have {watchlist.length} {watchlist.length === 1 ? 'item' : 'items'} in your watchlist
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {watchlist.map((item) => (
                <ContentCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Your watchlist is empty</p>
            <p className="text-gray-500 text-sm">Add movies, TV shows, and anime to watch later</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchlistPage;