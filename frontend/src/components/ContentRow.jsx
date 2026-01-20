import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './ContentCard';
import { Button } from './ui/button';

const ContentRow = ({ title, items }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -800 : 800;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 px-4 sm:px-6 lg:px-8">
        {title}
      </h2>
      <div className="relative group">
        {/* Left Scroll Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white h-12 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-48">
              <ContentCard item={item} />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white h-12 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
};

export default ContentRow;