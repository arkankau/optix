import { useEffect, useState, useRef } from 'react';

export function useDistanceTracking(enabled: boolean) {
  const [distance, setDistance] = useState<number>(60); // cm
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const initMediaPipe = async () => {
      try {
        // Dynamic import of MediaPipe Face Mesh
        // Use default import for proper constructor
        const FaceMeshModule = await import('@mediapipe/face_mesh');
        const FaceMesh = FaceMeshModule.FaceMesh || (FaceMeshModule as any).default;
        
        if (!FaceMesh) {
          console.warn('MediaPipe FaceMesh not available, distance tracking disabled');
          return;
        }

        const faceMesh = new FaceMesh({
          locateFile: (file: string) => {
            // Try to load from CDN, fallback to local if needed
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
          },
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // Estimate distance using face size heuristic
            // Use interpupillary distance or face width as proxy
            const leftEye = landmarks[33]; // Left eye corner
            const rightEye = landmarks[263]; // Right eye corner
            
            if (leftEye && rightEye) {
              const eyeDistance = Math.sqrt(
                Math.pow(leftEye.x - rightEye.x, 2) + 
                Math.pow(leftEye.y - rightEye.y, 2)
              );
              
              // Rough calibration: ~6.4cm interpupillary distance at 60cm
              // Scale inversely with eye distance in image
              const estimatedDistance = (6.4 * 60) / (eyeDistance * 100); // Convert to cm
              
              // Smooth with EMA
              setDistance((prev) => 0.2 * estimatedDistance + 0.8 * prev);
            }
          }
        });

        faceMeshRef.current = faceMesh;

        // Start webcam for face tracking
        const startWebcam = async () => {
          try {
            const webcamStream = await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480 },
            });
            
            const video = document.createElement('video');
            video.srcObject = webcamStream;
            video.autoplay = true;
            video.playsInline = true;
            video.style.display = 'none';
            document.body.appendChild(video);
            videoRef.current = video;

            const processFrame = async () => {
              if (video.readyState === video.HAVE_ENOUGH_DATA && faceMeshRef.current) {
                await faceMeshRef.current.send({ image: video });
              }
              requestAnimationFrame(processFrame);
            };

            video.addEventListener('loadeddata', () => {
              processFrame();
            });
          } catch (err) {
            console.error('Failed to start webcam:', err);
          }
        };

        startWebcam();
      } catch (error) {
        console.error('Failed to initialize MediaPipe:', error);
      }
    };

    initMediaPipe();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [enabled]);

  return { distance, videoRef };
}

