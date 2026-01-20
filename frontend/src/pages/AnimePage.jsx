import React from 'react';
import ContentRow from '../components/ContentRow';
import { mockAnime } from '../mockData';

const AnimePage = () => {
  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Anime</h1>
        
        <div className="space-y-8">
          <ContentRow title="Popular Anime" items={mockAnime} />
          <ContentRow title="Action Anime" items={mockAnime.filter(a => a.genre.includes('Action'))} />
        </div>
      </div>
    </div>
  );
};

export default AnimePage;