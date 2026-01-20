import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { Button } from './ui/button';

const HeroSection = ({ content }) => {
  const navigate = useNavigate();

  if (!content) return null;

  return (
    <div className="relative h-[70vh] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={content.backdrop}
          alt={content.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {content.title}
          </h1>
          <p className="text-lg text-gray-200 mb-6 line-clamp-3">
            {content.synopsis}
          </p>
          <div className="flex items-center gap-4 mb-6 text-sm text-gray-300">
            <span className="bg-yellow-400 text-black px-2 py-1 rounded font-bold">
              {content.rating}
            </span>
            <span>{content.year}</span>
            <span>{content.genre.split(',')[0]}</span>
            {content.type === 'movie' ? (
              <span>{content.duration}</span>
            ) : (
              <span>{content.seasons} Seasons</span>
            )}
          </div>
          <div className="flex gap-4">
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
              onClick={() => navigate(`/details/${content.type}/${content.id}`)}
            >
              <Play className="h-5 w-5 mr-2 fill-black" />
              Play Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-white hover:bg-white/10"
              onClick={() => navigate(`/details/${content.type}/${content.id}`)}
            >
              <Info className="h-5 w-5 mr-2" />
              More Info
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;