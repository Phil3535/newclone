import React, { useEffect, useState } from 'react';
import ContentRow from '../components/ContentRow';
import { contentAPI } from '../services/api';

const TVShowsPage = () => {
  const [tvShows, setTVShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTVShows = async () => {
      setLoading(true);
      try {
        const [page1, page2] = await Promise.all([
          contentAPI.getTVShows(1),
          contentAPI.getTVShows(2),
        ]);

        setTVShows([...page1, ...page2]);
      } catch (error) {
        console.error('Error fetching TV shows:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTVShows();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-white text-xl">Loading TV shows...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">TV Shows</h1>
        
        <div className="space-y-8">
          {tvShows.length > 0 && <ContentRow title="Popular TV Shows" items={tvShows.slice(0, 20)} />}
        </div>
      </div>
    </div>
  );
};

export default TVShowsPage;