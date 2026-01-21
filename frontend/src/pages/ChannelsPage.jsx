import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Search, Play, Grid, List, LogOut } from 'lucide-react';
import HLSPlayer from '../components/HLSPlayer';
import iptvService from '../services/iptvService';
import authService from '../services/authService';
import { useToast } from '../hooks/use-toast';

const ChannelsPage = () => {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [playingStream, setPlayingStream] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Get active profile
      const profileId = localStorage.getItem('active_profile_id');
      if (!profileId) {
        toast({
          title: 'No IPTV Connection',
          description: 'Please connect your IPTV service first.',
        });
        navigate('/app');
        return;
      }

      console.log('Loading channels for profile:', profileId);
      setProfile({ profile_id: profileId });

      // Load categories and channels
      const [cats, chans] = await Promise.all([
        iptvService.getCategories(profileId),
        iptvService.getChannels(profileId)
      ]);

      console.log('Categories loaded:', cats.length);
      console.log('Channels loaded:', chans.length);

      setCategories(cats);
      setChannels(chans);
      setFilteredChannels(chans);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error Loading Channels',
        description: 'Failed to load channels. Please try reconnecting your IPTV.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = channels;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(ch => ch.category_id === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(ch =>
        ch.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredChannels(filtered);
  }, [searchQuery, selectedCategory, channels]);

  const playChannel = async (channel) => {
    if (!profile) return;

    const streamUrl = await iptvService.getStreamUrl(profile.profile_id, channel.stream_id);
    if (streamUrl) {
      setPlayingStream({
        url: streamUrl,
        name: channel.name,
      });
    } else {
      toast({
        title: 'Stream Error',
        description: 'Could not load stream URL',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading channels...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27]">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-cyan-500/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              <span className="text-cyan-400">Empire</span>
              <span className="text-pink-400"> Streams</span>
            </h1>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/app')}
                className="text-gray-400 hover:text-white"
              >
                Settings
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="border-gray-700 text-white hover:bg-white/10"
            >
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
            </Button>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? 'bg-cyan-500 text-black' : 'border-gray-700 text-white'}
              >
                All
              </Button>
              {categories.slice(0, 10).map((cat) => (
                <Button
                  key={cat.category_id}
                  variant={selectedCategory === cat.category_id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.category_id)}
                  className={selectedCategory === cat.category_id ? 'bg-cyan-500 text-black' : 'border-gray-700 text-white'}
                >
                  {cat.category_name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Channels Grid */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}>
          {filteredChannels.length > 0 ? (
            filteredChannels.map((channel) => (
              <Card
                key={channel.stream_id}
                className="group bg-gray-900/80 border-gray-800 hover:border-cyan-500/50 transition-all cursor-pointer overflow-hidden"
                onClick={() => playChannel(channel)}
              >
                <div className="aspect-video relative bg-gray-800 flex items-center justify-center">
                  {channel.stream_icon ? (
                    <img
                      src={channel.stream_icon}
                      alt={channel.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-4xl font-bold text-cyan-400">
                      {channel.name?.charAt(0) || 'TV'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-12 w-12 text-cyan-400" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-white font-semibold text-sm line-clamp-2">
                    {channel.name}
                  </h3>
                  {channel.num && (
                    <p className="text-gray-400 text-xs mt-1">Ch {channel.num}</p>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">No channels found</p>
            </div>
          )}
        </div>
      </div>

      {/* Video Player */}
      {playingStream && (
        <HLSPlayer
          streamUrl={playingStream.url}
          channelName={playingStream.name}
          onClose={() => setPlayingStream(null)}
        />
      )}
    </div>
  );
};

export default ChannelsPage;