import React, { useEffect, useState } from 'react';
import ContentRow from '../components/ContentRow';
import { contentAPI } from '../services/api';

const AnimePage = () => {
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnime = async () => {
      setLoading(true);
      try {
        const [page1, page2] = await Promise.all([
          contentAPI.getAnime(1),
          contentAPI.getAnime(2),
        ]);

        setAnime([...page1, ...page2]);
      } catch (error) {
        console.error('Error fetching anime:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnime();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-white text-xl">Loading anime...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Anime</h1>
        
        <div className="space-y-8">
          {anime.length > 0 && <ContentRow title="Popular Anime" items={anime.slice(0, 20)} />}
        </div>
      </div>
    </div>
  );
};

export default AnimePage;