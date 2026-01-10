import React from 'react';
import { Box } from '@mui/material';

const VideoBackground = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src="/Video/图片转动图.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional overlay for better text readability
        }}
      />
    </Box>
  );
};

export default VideoBackground;
