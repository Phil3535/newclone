import React from 'react';
import ContentRow from '../components/ContentRow';
import { mockTVShows } from '../mockData';

const TVShowsPage = () => {
  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">TV Shows</h1>
        
        <div className="space-y-8">
          <ContentRow title="Popular TV Shows" items={mockTVShows} />
          <ContentRow title="Drama Series" items={mockTVShows.filter(s => s.genre.includes('Drama'))} />
          <ContentRow title="Action Series" items={mockTVShows.filter(s => s.genre.includes('Action'))} />
        </div>
      </div>
    </div>
  );
};

export default TVShowsPage;