import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, X, Home, Film, Tv, Sparkles, Heart, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Film, label: 'Movies', path: '/movies' },
    { icon: Tv, label: 'TV Shows', path: '/tv-shows' },
    { icon: Sparkles, label: 'Anime', path: '/anime' },
    { icon: Heart, label: 'Watchlist', path: '/watchlist' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Hamburger */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <Link to="/" className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  <span className="text-yellow-400">Bee</span>
                  <span className="text-white">TV</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                Home
              </Link>
              <Link to="/movies" className="text-gray-300 hover:text-white transition-colors">
                Movies
              </Link>
              <Link to="/tv-shows" className="text-gray-300 hover:text-white transition-colors">
                TV Shows
              </Link>
              <Link to="/anime" className="text-gray-300 hover:text-white transition-colors">
                Anime
              </Link>
              <Link to="/watchlist" className="text-gray-300 hover:text-white transition-colors">
                Watchlist
              </Link>
            </div>

            {/* Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar */}
          {isSearchOpen && (
            <div className="pb-4">
              <form onSubmit={handleSearch}>
                <Input
                  type="text"
                  placeholder="Search movies, TV shows, anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                />
              </form>
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar Menu */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-gray-900 z-50 border-r border-gray-800 transform transition-transform duration-300">
            <div className="p-4">
              <div className="flex items-center justify-between mb-8">
                <div className="text-xl font-bold">
                  <span className="text-yellow-400">Bee</span>
                  <span className="text-white">TV</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;