import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Search, Play, Grid, List, LogOut } from 'lucide-react';
import SimplePlayer from '../components/SimplePlayer';
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
  const [streamPreview, setStreamPreview] = useState(null);
  const [profile, setProfile] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [showDebug, setShowDebug] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const addDebug = (message) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    addDebug('Starting to load data...');
    setLoading(true);
    
    try {
      // Check authentication
      const isAuth = authService.isAuthenticated();
      addDebug(`Authentication check: ${isAuth ? 'PASSED' : 'FAILED'}`);
      
      if (!isAuth) {
        addDebug('STOP: Not authenticated. Please login again.');
        setLoading(false);
        // Don't auto-redirect, let user see the debug info
        toast({
          title: 'Session Expired',
          description: 'Please login again.',
          variant: 'destructive',
        });
        return;
      }

      // Get active profile
      const profileId = localStorage.getItem('active_profile_id');
      addDebug(`Profile ID: ${profileId || 'NOT FOUND'}`);
      
      if (!profileId) {
        addDebug('STOP: No IPTV profile connected');
        setLoading(false);
        toast({
          title: 'No IPTV Connection',
          description: 'Go back to dashboard and connect IPTV.',
        });
        return;
      }

      setProfile({ profile_id: profileId });
      addDebug('Requesting channels from API...');

      // Load categories and channels
      const [cats, chans] = await Promise.all([
        iptvService.getCategories(profileId),
        iptvService.getChannels(profileId)
      ]);

      addDebug(`Categories received: ${cats.length}`);
      addDebug(`Channels received: ${chans.length}`);

      setCategories(cats);
      setChannels(chans);
      setFilteredChannels(chans);
      
      if (chans.length === 0) {
        addDebug('⚠️ WARNING: Your IPTV returned 0 channels!');
        addDebug('Check your IPTV server credentials');
      } else {
        addDebug(`✓ SUCCESS: ${chans.length} channels loaded`);
      }
    } catch (error) {
      addDebug(`❌ ERROR: ${error.message}`);
      addDebug(`Error details: ${error.toString()}`);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      addDebug('--- Loading finished ---');
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
        description: 'Could not load stream',
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
      {/* Debug Panel */}
      {showDebug && debugInfo.length > 0 && (
        <div className="fixed top-20 right-4 z-50 bg-black/90 border border-cyan-500 rounded-lg p-4 max-w-md max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-cyan-400 font-bold text-sm">Debug Info</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(false)}
              className="text-gray-400 hover:text-white h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
          <div className="space-y-1">
            {debugInfo.map((info, i) => (
              <p key={i} className="text-xs text-gray-300 font-mono">{info}</p>
            ))}
          </div>
        </div>
      )}

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
              <p className="text-gray-400 text-lg mb-2">No channels found</p>
              <p className="text-gray-500 text-sm mb-4">Your IPTV provider returned no channels.</p>
              <Button onClick={() => navigate('/app')} variant="outline" className="border-cyan-500 text-cyan-400">
                Go Back to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stream Preview Modal */}
      {streamPreview && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-gray-900 border-cyan-500 p-6">
            <h2 className="text-white text-2xl font-bold mb-4">{streamPreview.name}</h2>
            
            <div className="bg-black border border-gray-700 rounded p-4 mb-6">
              <p className="text-gray-400 text-xs mb-2">Stream URL:</p>
              <p className="text-cyan-400 text-sm break-all font-mono">{streamPreview.url}</p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setPlayingStream(streamPreview);
                  setStreamPreview(null);
                }}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
              >
                ▶ Play Stream
              </Button>
              <Button
                onClick={() => setStreamPreview(null)}
                variant="outline"
                className="border-gray-600 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>

            <p className="text-gray-500 text-xs mt-4 text-center">
              If playback fails, copy this URL and test in VLC or another player
            </p>
          </Card>
        </div>
      )}

      {/* Video Player - Simple Native */}
      {playingStream && (
        <SimplePlayer
          streamUrl={playingStream.url}
          channelName={playingStream.name}
          onClose={() => setPlayingStream(null)}
        />
      )}

      {/* Show stream URL for debugging */}
      {playingStream && (
        <div className="fixed bottom-4 left-4 z-[60] bg-black/90 border border-yellow-400 rounded p-3 max-w-md">
          <p className="text-yellow-400 text-xs font-bold mb-1">DEBUG - Stream URL:</p>
          <p className="text-white text-xs break-all font-mono">{playingStream.url}</p>
        </div>
      )}
    </div>
  );
};

export default ChannelsPage;