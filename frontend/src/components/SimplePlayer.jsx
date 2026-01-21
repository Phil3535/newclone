import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const SimplePlayer = ({ streamUrl, channelName, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close Button */}
      <Button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-gray-900 hover:bg-gray-800"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Channel Name */}
      <div className="absolute top-4 left-4 z-10 bg-black/70 px-4 py-2 rounded">
        <p className="text-white font-semibold">{channelName}</p>
      </div>

      {/* Simple Native Video */}
      <video
        src={streamUrl}
        controls
        autoPlay
        playsInline
        webkit-playsinline="true"
        className="w-full h-full"
      />
    </div>
  );
};

export default SimplePlayer;
