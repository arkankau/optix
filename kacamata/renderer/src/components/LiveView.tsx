import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { Controls } from './Controls';
import { ImageTestView } from './ImageTestView';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { useDistanceTracking } from '../hooks/useDistanceTracking';

interface Props {
  profile: Profile | null;
  isOverlay: boolean;
}

export function LiveView({ profile, isOverlay }: Props) {
  const [showImageTest, setShowImageTest] = useState(false);
  
  // Show image test view if enabled
  if (showImageTest) {
    return <ImageTestView profile={profile} onBack={() => setShowImageTest(false)} />;
  }

  const [isProcessing, setIsProcessing] = useState(true); // Start with processing ON by default
  const [splitMode, setSplitMode] = useState(true);
  const [lfdInspired, setLfdInspired] = useState(false); // LFD-inspired mode toggle
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [lambda, setLambda] = useState(profile?.wiener_lambda ?? 0.02);
  const [myopia, setMyopia] = useState(profile?.rx.sphere_D ?? -4.0);
  const [manualDistance, setManualDistance] = useState(60);
  const [cylinder, setCylinder] = useState(profile?.rx.cylinder_D ?? 0);
  const [debugInfo, setDebugInfo] = useState({
    sigmaX: 0,
    sigmaY: 0,
    lambda: profile?.wiener_lambda ?? 0.02,
    bypass: false,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTime = useRef<number>(0);
  
  const { stream, videoRef } = useScreenCapture();
  const { distance } = useDistanceTracking(true);

  useEffect(() => {
    const baseLambda = profile?.wiener_lambda ?? 0.02;
    setLambda(baseLambda);
    setDebugInfo((info) => ({ ...info, lambda: baseLambda }));
    if (profile) {
      setMyopia(profile.rx.sphere_D);
      setCylinder(profile.rx.cylinder_D ?? 0);
    }
  }, [profile]);

  // Update manual distance when tracked distance changes
  useEffect(() => {
    setManualDistance(distance);
  }, [distance]);

  useEffect(() => {
    if (!profile) return;

    // Initialize vision engine with profile
    // Apply correction strength to prescription for stronger/weaker correction
    window.electronAPI?.vision
      .updatePSF(
      {
        sphere_D: myopia,
        cylinder_D: cylinder !== 0 ? cylinder : undefined,
        axis_deg: profile.rx.axis_deg,
        distance_cm: manualDistance,
        display_ppi: profile.ppi,
        display_width_px: profile.display.width_px,
        display_height_px: profile.display.height_px,
        display_diag_in: profile.display.diag_in,
      },
      lfdInspired
      )
      .then((models: any) => {
        if (models?.psf) {
          setDebugInfo((info) => ({
            ...info,
            sigmaX: models.psf.sigma_x ?? 0,
            sigmaY: models.psf.sigma_y ?? 0,
            bypass: !!models.psf.is_identity,
          }));
        }
      })
      .catch((err: any) => console.error('updatePSF error', err));
  }, [profile, manualDistance, lfdInspired, myopia, cylinder]);

  useEffect(() => {
    if (!stream || !profile) {
      console.log('Waiting for stream or profile. Stream:', !!stream, 'Profile:', !!profile);
      return;
    }

    console.log('Starting capture loop...');
    // Start capture loop
    startCaptureLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream, profile, isProcessing, manualDistance, lambda, lfdInspired, myopia, cylinder]);

  const startCaptureLoop = () => {
    if (!videoRef.current || !canvasRef.current || !processedCanvasRef.current) {
      console.warn('Missing refs for capture loop');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const processedCanvas = processedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const processedCtx = processedCanvas.getContext('2d');

    if (!ctx || !processedCtx) {
      console.warn('Failed to get canvas contexts');
      return;
    }

    let frameCount = 0;

    const loop = async () => {
      const startTime = performance.now();

      try {
        // Check if video has loaded and has data
        if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          // Ensure video is playing
          if (video.paused) {
            video.play().catch((err) => {
              console.warn('Failed to play video:', err);
            });
          }

          // Set canvas dimensions to match video (internal dimensions, not CSS)
          const targetWidth = video.videoWidth;
          const targetHeight = video.videoHeight;
          
          if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            console.log('Canvas size set to:', canvas.width, 'x', canvas.height);
          }

          // Draw video frame to canvas (this should show the desktop)
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Verify we drew something (check if canvas has non-black pixels)
            if (frameCount === 1) {
              const testPixel = ctx.getImageData(0, 0, 1, 1);
              console.log('First frame drawn, test pixel:', testPixel.data);
            }
          } catch (drawError) {
            console.error('Error drawing video to canvas:', drawError);
          }

          // Always show the original on the left canvas (for split view)
          // For processed canvas, show either processed or original
          if (isProcessing && profile) {
            // Get image data for processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const buffer = imageData.data.buffer;

            // Process frame
            try {
            const processed = await window.electronAPI?.vision.processFrame({
              buffer,
              width: canvas.width,
              height: canvas.height,
              psfParams: {
                sphere_D: myopia,
                cylinder_D: cylinder !== 0 ? cylinder : undefined,
                axis_deg: profile.rx.axis_deg,
                distance_cm: manualDistance,
                display_ppi: profile.ppi,
                display_width_px: profile.display.width_px,
                display_height_px: profile.display.height_px,
                display_diag_in: profile.display.diag_in,
              },
              lambda,
              lfd_inspired: lfdInspired,
              contrast_boost: 1.0,
            });

              if (processed) {
                const processedImageData = new ImageData(
                  new Uint8ClampedArray(processed),
                  canvas.width,
                  canvas.height
                );
                processedCanvas.width = canvas.width;
                processedCanvas.height = canvas.height;
                processedCtx.putImageData(processedImageData, 0, 0);
              } else {
                // Fallback: copy original
                processedCanvas.width = canvas.width;
                processedCanvas.height = canvas.height;
                processedCtx.drawImage(canvas, 0, 0);
              }
            } catch (processError) {
              console.error('Frame processing error:', processError);
              // Fallback: copy original
              processedCanvas.width = canvas.width;
              processedCanvas.height = canvas.height;
              processedCtx.drawImage(canvas, 0, 0);
            }
          } else {
            // Copy original to processed canvas when not processing
            processedCanvas.width = canvas.width;
            processedCanvas.height = canvas.height;
            processedCtx.drawImage(canvas, 0, 0);
          }

          frameCount++;
          if (frameCount % 60 === 0) {
            console.log('Frames processed:', frameCount, 'Video size:', video.videoWidth, 'x', video.videoHeight);
          }
        } else {
          // Video not ready yet
          if (frameCount < 10 || frameCount % 60 === 0) {
            console.log('Waiting for video data. Ready state:', video.readyState, 
              'Size:', video.videoWidth, 'x', video.videoHeight,
              'Paused:', video.paused,
              'CurrentTime:', video.currentTime);
            
            // Try to play if paused
            if (video.paused && video.readyState >= video.HAVE_METADATA) {
              video.play().catch((err) => {
                console.warn('Failed to play video:', err);
              });
            }
          }
        }

        // Calculate FPS and latency
        const frameTime = performance.now() - startTime;
        const elapsed = performance.now() - lastFrameTime.current;
        if (lastFrameTime.current > 0) {
          setFps(Math.round(1000 / elapsed));
        }
        setLatency(Math.round(frameTime));
        lastFrameTime.current = performance.now();
      } catch (error) {
        console.error('Capture loop error:', error);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
  };

  const handleFeedback = (feedback: 'too_blurry' | 'too_sharp' | 'ok') => {
    setLambda((prev) => {
      let next = prev;
      if (feedback === 'too_blurry') {
        next = Math.max(0.001, prev - 0.002);
      } else if (feedback === 'too_sharp') {
        next = Math.min(0.05, prev + 0.002);
      }
      setDebugInfo((info) => ({ ...info, lambda: next }));
      return next;
    });

    if (profile) {
      window.electronAPI?.vision
        .updatePSF(
          {
            sphere_D: profile.rx.sphere_D,
            cylinder_D: profile.rx.cylinder_D,
            distance_cm: distance,
            display_ppi: profile.ppi,
            display_width_px: profile.display.width_px,
            display_height_px: profile.display.height_px,
            display_diag_in: profile.display.diag_in,
          },
          lfdInspired
        )
        .then((models: any) => {
          if (models?.psf) {
            setDebugInfo((info) => ({
              ...info,
              sigmaX: models.psf.sigma_x ?? 0,
              sigmaY: models.psf.sigma_y ?? 0,
              bypass: !!models.psf.is_identity,
            }));
          }
        })
        .catch((err: any) => console.error('updatePSF error', err));
    }
  };

  // Video element is created and managed in useScreenCapture hook
  // No need to manually connect it here

  if (isOverlay) {
    // Full-screen overlay mode
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          pointerEvents: 'none',
        }}
      >
        <canvas
          ref={processedCanvasRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            pointerEvents: 'auto',
          }}
        >
          <div>FPS: {fps}</div>
          <div>Latency: {latency}ms</div>
          <div>Distance: {distance.toFixed(1)}cm</div>
          <div>
            σx/σy: {debugInfo.sigmaX.toFixed(3)} / {debugInfo.sigmaY.toFixed(3)}
          </div>
          <div>λ: {debugInfo.lambda.toFixed(4)}</div>
          <div>Bypass: {debugInfo.bypass ? 'true' : 'false'}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0a',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {splitMode ? (
          <>
            <div style={{ flex: 1, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(255, 0, 0, 0.7)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Original
              </div>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0, 255, 0, 0.7)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Corrected
              </div>
              <canvas
                ref={processedCanvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas
              ref={isProcessing ? processedCanvasRef : canvasRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        )}
      </div>

      <Controls
        profile={profile}
        isProcessing={isProcessing}
        onToggleProcessing={() => setIsProcessing(!isProcessing)}
        splitMode={splitMode}
        onToggleSplitMode={() => setSplitMode(!splitMode)}
        lfdInspired={lfdInspired}
        onToggleLFD={() => setLfdInspired(!lfdInspired)}
        onFeedback={handleFeedback}
        lambda={lambda}
        onLambdaChange={(newLambda) => {
          setLambda(newLambda);
          setDebugInfo((info) => ({ ...info, lambda: newLambda }));
        }}
        sigmaX={debugInfo.sigmaX}
        sigmaY={debugInfo.sigmaY}
        bypass={debugInfo.bypass}
        fps={fps}
        latency={latency}
        distance={manualDistance}
        myopia={myopia}
        onMyopiaChange={setMyopia}
        onDistanceChange={setManualDistance}
        cylinder={cylinder}
        onCylinderChange={setCylinder}
        onTestImage={() => setShowImageTest(true)}
      />
    </div>
  );
}

