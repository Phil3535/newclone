import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import iptvService from '../services/iptvService';

const IPTVConnectPage = () => {
  const [serverUrl, setServerUrl] = useState('');
  const [port, setPort] = useState('8080');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profileName, setProfileName] = useState('My IPTV');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await iptvService.connectIPTV(serverUrl, port, username, password, profileName);

    if (result.success) {
      toast({
        title: 'Connected!',
        description: 'IPTV service connected successfully.',
      });
      localStorage.setItem('active_profile_id', result.data.profile_id);
      navigate('/channels');
    } else {
      toast({
        title: 'Connection Failed',
        description: result.error,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 bg-gray-900/80 backdrop-blur-sm border-cyan-500/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">
            Connect Your <span className="text-cyan-400">IPTV</span>
          </h1>
          <p className="text-gray-400 text-sm">Enter your Xtreme Codes API credentials</p>
        </div>

        <form onSubmit={handleConnect} className="space-y-6">
          <div>
            <label className="text-white text-sm mb-2 block">Profile Name</label>
            <Input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="My IPTV"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-white text-sm mb-2 block">Server URL or IP</label>
              <Input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="example.com or 192.168.1.1"
              />
              <p className="text-gray-500 text-xs mt-1">Don't include http:// or port</p>
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">Port</label>
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="8080"
              />
            </div>
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Your IPTV username"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Your IPTV password"
            />
          </div>

          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              <strong>Note:</strong> These are your IPTV provider credentials, not your Empire Streams account.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-lg py-6"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect IPTV'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/channels')}
            className="text-gray-400 hover:text-white"
          >
            Skip for now
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default IPTVConnectPage;