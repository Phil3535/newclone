import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { Card } from './ui/card';

const ContentCard = ({ item }) => {
  return (
    <Link to={`/details/${item.type}/${item.id}`}>
      <Card className="group relative overflow-hidden bg-gray-900 border-gray-800 hover:border-yellow-400/50 transition-all duration-300 hover:scale-105 cursor-pointer">
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={item.poster}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-yellow-400 rounded-full p-4">
              <Play className="h-8 w-8 text-black fill-black" />
            </div>
          </div>

          {/* Rating Badge */}
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-xs font-semibold">{item.rating}</span>
          </div>

          {/* Type Badge */}
          <div className="absolute top-2 left-2 bg-yellow-400/90 backdrop-blur-sm px-2 py-1 rounded">
            <span className="text-black text-xs font-bold uppercase">{item.type}</span>
          </div>
        </div>

        <div className="p-3">
          <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1">
            {item.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{item.year}</span>
            <span>{item.type === 'movie' ? item.duration : `${item.seasons} Seasons`}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ContentCard;