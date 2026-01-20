import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Play, Plus, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import ContentRow from '../components/ContentRow';
import { getAllContent, getTrending } from '../mockData';
import { useToast } from '../hooks/use-toast';

const DetailsPage = () => {
  const { type, id } = useParams();
  const [content, setContent] = useState(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const allContent = getAllContent();
    const item = allContent.find(c => c.id === parseInt(id) && c.type === type);
    setContent(item);

    // Check if in watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setIsInWatchlist(watchlist.some(w => w.id === parseInt(id)));
  }, [type, id]);

  const toggleWatchlist = () => {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    if (isInWatchlist) {
      const updated = watchlist.filter(w => w.id !== content.id);
      localStorage.setItem('watchlist', JSON.stringify(updated));
      setIsInWatchlist(false);
      toast({
        title: "Removed from Watchlist",
        description: `${content.title} has been removed from your watchlist.`,
      });
    } else {
      watchlist.push(content);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      setIsInWatchlist(true);
      toast({
        title: "Added to Watchlist",
        description: `${content.title} has been added to your watchlist.`,
      });
    }
  };

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative h-[80vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={content.backdrop}
            alt={content.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center pt-20">
          <div className="max-w-3xl">
            <div className="bg-yellow-400 text-black px-3 py-1 rounded inline-block text-sm font-bold uppercase mb-4">
              {content.type}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg">
              {content.title}
            </h1>
            <div className="flex items-center gap-4 mb-6 text-sm text-gray-300">
              <div className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold">{content.rating}</span>
              </div>
              <span>{content.year}</span>
              {content.type === 'movie' ? (
                <span>{content.duration}</span>
              ) : (
                <span>{content.seasons} Seasons</span>
              )}
            </div>
            <p className="text-lg text-gray-200 mb-6 leading-relaxed">
              {content.synopsis}
            </p>
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">Genre</div>
              <div className="text-white">{content.genre}</div>
            </div>
            <div className="mb-8">
              <div className="text-sm text-gray-400 mb-2">Cast</div>
              <div className="text-white">{content.cast}</div>
            </div>
            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                onClick={() => setShowPlayer(true)}
              >
                <Play className="h-5 w-5 mr-2 fill-black" />
                Play Trailer
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-600 text-white hover:bg-white/10"
                onClick={toggleWatchlist}
              >
                {isInWatchlist ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    In Watchlist
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add to Watchlist
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {showPlayer && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:text-yellow-400"
              onClick={() => setShowPlayer(false)}
            >
              <span className="text-2xl">✕</span>
            </Button>
            <div className="relative pt-[56.25%] bg-gray-900 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Play className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                  <p className="text-xl">Trailer Player</p>
                  <p className="text-sm text-gray-400 mt-2">Video player will be integrated with TMDB API</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Similar Content */}
      <div className="relative z-10 py-16">
        <ContentRow title="More Like This" items={getTrending().slice(0, 8)} />
      </div>
    </div>
  );
};

export default DetailsPage;