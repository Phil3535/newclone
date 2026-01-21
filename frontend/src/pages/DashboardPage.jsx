import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tv, Plus, Settings, LogOut, User } from 'lucide-react';
import authService from '../services/authService';
import iptvService from '../services/iptvService';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    const userProfile = await authService.getProfile();
    setUser(userProfile);

    const iptvProfiles = await iptvService.getProfiles();
    setProfiles(iptvProfiles);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const selectProfile = (profileId) => {
    localStorage.setItem('active_profile_id', profileId);
    navigate('/channels');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27]">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              <span className="text-cyan-400">Empire</span>
              <span className="text-pink-400"> Streams</span>
            </h1>
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

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        {user && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome back{user.full_name ? `, ${user.full_name}` : ''}!
            </h2>
            <p className="text-gray-400">
              Subscription: <span className="text-yellow-400 font-semibold capitalize">{user.subscription_status}</span>
            </p>
            {user.subscription_expires && (
              <p className="text-gray-400 text-sm">
                Expires: {new Date(user.subscription_expires).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* IPTV Profiles */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Tv className="h-6 w-6 text-cyan-400" />
            Your IPTV Connections
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card
                key={profile.profile_id}
                className="p-6 bg-gray-900/80 border-cyan-500/20 hover:border-cyan-500 transition-all cursor-pointer"
                onClick={() => selectProfile(profile.profile_id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-cyan-500/20 p-3 rounded-lg">
                    <Tv className="h-6 w-6 text-cyan-400" />
                  </div>
                </div>
                <h4 className="text-white font-semibold mb-1">{profile.profile_name}</h4>
                <p className="text-gray-400 text-sm">
                  Added {new Date(profile.created_at).toLocaleDateString()}
                </p>
                <Button className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
                  Watch Channels
                </Button>
              </Card>
            ))}

            {/* Add New Profile */}
            <Card
              className="p-6 bg-gray-900/50 border-dashed border-2 border-gray-700 hover:border-cyan-500 transition-all cursor-pointer flex items-center justify-center"
              onClick={() => navigate('/connect-iptv')}
            >
              <div className="text-center">
                <div className="bg-cyan-500/20 p-4 rounded-full inline-block mb-3">
                  <Plus className="h-8 w-8 text-cyan-400" />
                </div>
                <p className="text-white font-semibold">Add IPTV</p>
                <p className="text-gray-400 text-sm">Connect new service</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 bg-gray-900/80 border-gray-800">
            <div className="flex items-center gap-4">
              <div className="bg-pink-500/20 p-3 rounded-lg">
                <User className="h-6 w-6 text-pink-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold">Account Settings</h4>
                <p className="text-gray-400 text-sm">Manage your profile</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gray-900/80 border-gray-800">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/20 p-3 rounded-lg">
                <Settings className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold">Subscription</h4>
                <p className="text-gray-400 text-sm">Manage your plan</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Empty State */}
        {profiles.length === 0 && (
          <Card className="p-12 bg-gray-900/80 border-cyan-500/20 text-center mt-8">
            <div className="bg-cyan-500/20 p-6 rounded-full inline-block mb-4">
              <Tv className="h-12 w-12 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No IPTV Connected</h3>
            <p className="text-gray-400 mb-6">
              Connect your IPTV service to start watching live TV channels
            </p>
            <Button
              onClick={() => navigate('/connect-iptv')}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Connect IPTV Now
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
