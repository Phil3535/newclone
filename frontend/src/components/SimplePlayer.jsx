import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const SimplePlayer = ({ streamUrl, channelName, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <h2 className="text-white text-lg font-bold">{channelName}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Video - Native HTML5 */}
      <div className="flex-1 bg-black">
        <video
          src={streamUrl}
          controls
          autoPlay
          playsInline
          className="w-full h-full"
          style={{ maxHeight: '100vh' }}
        >
          Your browser does not support video playback.
        </video>
      </div>

      {/* Stream Info */}
      <div className="bg-gray-900 border-t border-gray-800 p-2">
        <p className="text-gray-400 text-xs truncate">Stream: {streamUrl}</p>
      </div>
    </div>
  );
};

export default SimplePlayer;
