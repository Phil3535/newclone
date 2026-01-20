import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Monitor, Palette } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoplay: false,
    highQuality: true,
    subtitles: true,
  });
  const { toast } = useToast();

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved.",
    });
  };

  const settingSections = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Receive updates about new content',
      key: 'notifications',
    },
    {
      icon: Monitor,
      title: 'Auto-Play Next Episode',
      description: 'Automatically play the next episode',
      key: 'autoplay',
    },
    {
      icon: Palette,
      title: 'High Quality Playback',
      description: 'Stream in the highest available quality',
      key: 'highQuality',
    },
    {
      icon: User,
      title: 'Subtitles',
      description: 'Show subtitles by default',
      key: 'subtitles',
    },
  ];

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-yellow-400" />
          <h1 className="text-4xl font-bold text-white">Settings</h1>
        </div>

        <div className="space-y-4">
          {settingSections.map((section) => (
            <Card key={section.key} className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-400/10 p-3 rounded-lg">
                    <section.icon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{section.title}</h3>
                    <p className="text-gray-400 text-sm">{section.description}</p>
                  </div>
                </div>
                <Switch
                  checked={settings[section.key]}
                  onCheckedChange={() => handleToggle(section.key)}
                />
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-gray-900 border-gray-800 p-6 mt-8">
          <h3 className="text-white font-semibold text-lg mb-4">About BeeTV</h3>
          <div className="space-y-2 text-gray-400 text-sm">
            <p>Version: 1.0.0</p>
            <p>A streaming platform for movies, TV shows, and anime</p>
            <p className="text-yellow-400 mt-4">Built with React & FastAPI</p>
          </div>
        </Card>

        <div className="mt-8">
          <Button
            variant="outline"
            className="border-red-600 text-red-500 hover:bg-red-600/10 hover:text-red-400"
          >
            Clear All Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;