import React, { useEffect, useState } from 'react';
import HeroSection from '../components/HeroSection';
import ContentRow from '../components/ContentRow';
import { contentAPI } from '../services/api';

const HomePage = () => {
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState([]);
  const [movies, setMovies] = useState([]);
  const [tvShows, setTVShows] = useState([]);
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const [trendingData, moviesData, tvShowsData, animeData] = await Promise.all([
          contentAPI.getTrending(),
          contentAPI.getMovies(),
          contentAPI.getTVShows(),
          contentAPI.getAnime(),
        ]);

        setTrending(trendingData);
        setMovies(moviesData);
        setTVShows(tvShowsData);
        setAnime(animeData);

        // Set random featured content from trending
        if (trendingData.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(5, trendingData.length));
          setFeatured(trendingData[randomIndex]);
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading amazing content...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <HeroSection content={featured} />
      
      <div className="relative z-10 -mt-32 space-y-8 pb-16">
        {trending.length > 0 && <ContentRow title="Trending Now" items={trending} />}
        {movies.length > 0 && <ContentRow title="Popular Movies" items={movies} />}
        {tvShows.length > 0 && <ContentRow title="TV Shows" items={tvShows} />}
        {anime.length > 0 && <ContentRow title="Anime" items={anime} />}
      </div>
    </div>
  );
};

export default HomePage;