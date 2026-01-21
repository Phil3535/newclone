import React from 'react';

const SimplePlayer = ({ streamUrl, channelName, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black',
      zIndex: 9999
    }}>
      <video
        src={streamUrl}
        controls
        autoPlay
        playsInline
        webkit-playsinline="true"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        onError={(e) => {
          console.error('Video error:', e);
          alert('Video failed to load. Close and try again.');
        }}
      />
      
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          padding: '10px 15px',
          fontSize: '16px',
          cursor: 'pointer',
          zIndex: 10000
        }}
      >
        ✕ Close
      </button>
    </div>
  );
};

export default SimplePlayer;
