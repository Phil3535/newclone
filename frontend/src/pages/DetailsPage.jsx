import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Play, Plus, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import ContentRow from '../components/ContentRow';
import VideoPlayer from '../components/VideoPlayer';
import { contentAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

const DetailsPage = () => {
  const { type, id } = useParams();
  const [content, setContent] = useState(null);
  const [similarContent, setSimilarContent] = useState([]);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const details = await contentAPI.getDetails(type, id);
        setContent(details);

        // Fetch similar content (trending as fallback)
        const similar = await contentAPI.getTrending();
        setSimilarContent(similar.slice(0, 10));

        // Check if in watchlist
        const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        setIsInWatchlist(watchlist.some(w => w.id === parseInt(id) && w.type === type));
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [type, id]);

  const toggleWatchlist = () => {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    if (isInWatchlist) {
      const updated = watchlist.filter(w => !(w.id === parseInt(id) && w.type === type));
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

  const handlePlayTrailer = () => {
    if (content && content.videos && content.videos.length > 0) {
      setShowPlayer(true);
    } else {
      toast({
        title: "No Trailer Available",
        description: "Sorry, no trailer is available for this content.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Content not found</div>
      </div>
    );
  }

  const firstVideo = content.videos && content.videos.length > 0 ? content.videos[0] : null;

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative h-[80vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          {content.backdrop ? (
            <img
              src={content.backdrop}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-900" />
          )}
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
                <span>{content.seasons} Season{content.seasons > 1 ? 's' : ''}</span>
              )}
            </div>
            <p className="text-lg text-gray-200 mb-6 leading-relaxed">
              {content.synopsis}
            </p>
            {content.genre && (
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2">Genre</div>
                <div className="text-white">{content.genre}</div>
              </div>
            )}
            {content.cast && (
              <div className="mb-8">
                <div className="text-sm text-gray-400 mb-2">Cast</div>
                <div className="text-white">{content.cast}</div>
              </div>
            )}
            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                onClick={handlePlayTrailer}
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
        <VideoPlayer
          videoKey={firstVideo ? firstVideo.key : null}
          videoName={firstVideo ? firstVideo.name : null}
          onClose={() => setShowPlayer(false)}
        />
      )}

      {/* Similar Content */}
      {similarContent.length > 0 && (
        <div className="relative z-10 py-16">
          <ContentRow title="More Like This" items={similarContent} />
        </div>
      )}
    </div>
  );
};

export default DetailsPage;