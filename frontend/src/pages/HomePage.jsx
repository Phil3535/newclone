import React, { useEffect, useState } from 'react';
import HeroSection from '../components/HeroSection';
import ContentRow from '../components/ContentRow';
import { mockMovies, mockTVShows, mockAnime, getTrending } from '../mockData';

const HomePage = () => {
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    // Get random featured content
    const allContent = [...mockMovies, ...mockTVShows];
    const randomIndex = Math.floor(Math.random() * allContent.length);
    setFeatured(allContent[randomIndex]);
    setTrending(getTrending());
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <HeroSection content={featured} />
      
      <div className="relative z-10 -mt-32 space-y-8 pb-16">
        <ContentRow title="Trending Now" items={trending} />
        <ContentRow title="Popular Movies" items={mockMovies} />
        <ContentRow title="TV Shows" items={mockTVShows} />
        <ContentRow title="Anime" items={mockAnime} />
      </div>
    </div>
  );
};

export default HomePage;