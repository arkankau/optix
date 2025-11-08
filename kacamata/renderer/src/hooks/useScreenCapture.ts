import { useEffect, useRef, useState } from 'react';

export function useScreenCapture() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const startCapture = async () => {
      try {
        console.log('Starting screen capture...');
        
        // Use Electron's desktopCapturer via IPC
        const sources = await window.electronAPI?.capture.getSources() || [];
        
        console.log('Screen sources:', sources);
        
        if (sources.length === 0) {
          setError('No screen sources available');
          console.error('No screen sources found');
          return;
        }

        // Create video element if it doesn't exist
        if (!videoRef.current) {
          const video = document.createElement('video');
          video.autoplay = true;
          video.playsInline = true;
          video.style.display = 'none';
          video.style.position = 'absolute';
          video.style.width = '1px';
          video.style.height = '1px';
          document.body.appendChild(video);
          videoRef.current = video;
        }

        const video = videoRef.current;

        // Request desktop capture stream
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // @ts-ignore - Electron-specific constraint
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sources[0].id,
            },
          } as any,
        });

        console.log('Got media stream:', mediaStream);
        console.log('Video tracks:', mediaStream.getVideoTracks());

        video.srcObject = mediaStream;
        setStream(mediaStream);

        // Wait for video to be ready and play it
        video.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
          // Ensure video plays
          video.play().catch((err) => {
            console.error('Failed to play video:', err);
          });
        });

        video.addEventListener('loadeddata', () => {
          console.log('Video data loaded, playing...');
          video.play().catch((err) => {
            console.error('Failed to play video on loadeddata:', err);
          });
        });

        video.addEventListener('play', () => {
          console.log('Video is playing!');
        });

        video.addEventListener('error', (e) => {
          console.error('Video element error:', e);
          setError('Video playback error');
        });

        // Try to play immediately
        video.play().catch((err) => {
          console.log('Video not ready to play yet, will retry on loadedmetadata');
        });

      } catch (err: any) {
        const errorMsg = err.message || 'Failed to capture screen';
        setError(errorMsg);
        console.error('Screen capture error:', err);
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });
      }
    };

    startCapture();

    return () => {
      if (stream) {
        console.log('Stopping screen capture stream');
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
      }
      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
        videoRef.current = null;
      }
    };
  }, []);

  return { stream, error, videoRef };
}

