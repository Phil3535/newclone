import React, { useEffect, useState } from 'react';
import ContentRow from '../components/ContentRow';
import { contentAPI } from '../services/api';

const MoviesPage = () => {
  const [movies, setMovies] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const [page1, page2] = await Promise.all([
          contentAPI.getMovies(1),
          contentAPI.getMovies(2),
        ]);

        const allMovies = [...page1, ...page2];
        setMovies(allMovies);
        setActionMovies(allMovies.filter(m => m.genre && m.genre.toLowerCase().includes('action')));
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-white text-xl">Loading movies...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Movies</h1>
        
        <div className="space-y-8">
          {movies.length > 0 && <ContentRow title="Popular Movies" items={movies.slice(0, 20)} />}
          {actionMovies.length > 0 && <ContentRow title="Action Movies" items={actionMovies} />}
        </div>
      </div>
    </div>
  );
};

export default MoviesPage;