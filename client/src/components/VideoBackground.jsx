import React from 'react';
import { Box } from '@mui/material';

const VideoBackground = () => {
  // 使用 lazy loading 延迟加载视频，不阻塞页面渲染
  const [shouldLoadVideo, setShouldLoadVideo] = React.useState(false);

  React.useEffect(() => {
    // 页面加载完成后再加载视频，使用 requestIdleCallback 在空闲时加载
    const loadVideo = () => setShouldLoadVideo(true);
    
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(loadVideo, { timeout: 500 });
    } else {
      setTimeout(loadVideo, 100);
    }
  }, []);

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
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // 先显示背景色
      }}
    >
      {shouldLoadVideo && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="none" // 不预加载，进一步减少初始加载
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src="/Video/bj.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
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
