import React from 'react';
import ContentRow from '../components/ContentRow';
import { mockMovies } from '../mockData';

const MoviesPage = () => {
  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Movies</h1>
        
        <div className="space-y-8">
          <ContentRow title="Popular Movies" items={mockMovies} />
          <ContentRow title="Action Movies" items={mockMovies.filter(m => m.genre.includes('Action'))} />
          <ContentRow title="Drama Movies" items={mockMovies.filter(m => m.genre.includes('Drama'))} />
        </div>
      </div>
    </div>
  );
};

export default MoviesPage;