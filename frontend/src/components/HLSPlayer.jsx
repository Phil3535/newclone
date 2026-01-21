import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { X, Maximize, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

const HLSPlayer = ({ streamUrl, channelName, onClose }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) {
      setError('No stream URL provided');
      setIsLoading(false);
      return;
    }

    console.log('HLS Player: Loading stream:', streamUrl);
    setIsLoading(true);
    setError(null);

    const video = videoRef.current;

    if (Hls.isSupported()) {
      console.log('HLS Player: HLS.js is supported');
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        debug: false,
        xhrSetup: function(xhr, url) {
          // Add any custom headers if needed
          console.log('HLS Player: Loading fragment:', url);
        }
      });
      
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS Player: Manifest parsed successfully');
        setIsLoading(false);
        video.play().catch(e => {
          console.error('HLS Player: Autoplay failed:', e);
          setError('Click to play');
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Player: Error event:', data.type, data.details);
        
        if (data.fatal) {
          setIsLoading(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS Player: Network error, trying to recover...');
              setError('Network error - checking connection...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS Player: Media error, trying to recover...');
              setError('Media error - attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS Player: Fatal error, cannot recover');
              setError(`Stream error: ${data.details}`);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        console.log('HLS Player: Cleaning up');
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('HLS Player: Native HLS support (Safari/iOS)');
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        console.log('HLS Player: Metadata loaded');
        setIsLoading(false);
        video.play().catch(e => {
          console.error('HLS Player: Play error:', e);
          setError('Click to play');
        });
      });
      video.addEventListener('error', (e) => {
        console.error('HLS Player: Video error:', e);
        setError('Stream playback failed');
        setIsLoading(false);
      });
    } else {
      console.error('HLS Player: HLS not supported in this browser');
      setError('HLS playback not supported in your browser');
      setIsLoading(false);
    }
  }, [streamUrl]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => {
        console.error('Manual play failed:', e);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">{channelName}</h2>
            <p className="text-gray-400 text-sm">
              {isLoading ? 'Loading...' : error ? 'Error' : 'Now Playing'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls={false}
          autoPlay
          playsInline
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mb-4 mx-auto"></div>
              <p className="text-white text-lg">Loading stream...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center max-w-md p-6">
              <div className="text-red-400 text-6xl mb-4">⚠️</div>
              <h3 className="text-white text-xl font-bold mb-2">Playback Error</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <div className="space-y-2">
                <Button 
                  onClick={handlePlayClick}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-white/10 ml-2"
                >
                  Close
                </Button>
              </div>
              <p className="text-gray-500 text-xs mt-4">Stream URL: {streamUrl}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!error && !isLoading && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HLSPlayer;