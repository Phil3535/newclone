import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const VideoPlayer = ({ videoKey, videoName, onClose }) => {
  if (!videoKey) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
        <div className="relative w-full max-w-5xl">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-12 right-0 text-white hover:text-yellow-400"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="bg-gray-900 rounded-lg p-12 text-center">
            <p className="text-white text-xl mb-2">No Trailer Available</p>
            <p className="text-gray-400">Sorry, no video is available for this content.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-12 right-0 text-white hover:text-yellow-400 z-10"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        {videoName && (
          <div className="text-white text-lg mb-4 font-semibold">{videoName}</div>
        )}
        <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden shadow-2xl">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
            title={videoName || 'Video Player'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;