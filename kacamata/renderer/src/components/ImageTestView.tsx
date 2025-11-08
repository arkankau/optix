import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Profile } from '../types';

interface Props {
  profile: Profile | null;
  onBack: () => void;
}

export function ImageTestView({ profile, onBack }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [myopia, setMyopia] = useState(profile?.rx.sphere_D ?? -4.0);
  const [distance, setDistance] = useState(profile?.distance_cm_nominal ?? 60);
  const [cylinder, setCylinder] = useState(profile?.rx.cylinder_D ?? 0);
  const [lambda, setLambda] = useState(profile?.wiener_lambda ?? 0.02);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageLoadedRef = useRef(false);

  // Initialize from profile on mount
  useEffect(() => {
    if (profile) {
      setMyopia(profile.rx.sphere_D);
      setDistance(profile.distance_cm_nominal ?? 60);
      setCylinder(profile.rx.cylinder_D ?? 0);
      setLambda(profile.wiener_lambda ?? 0.02);
    }
  }, [profile]);

  const processImage = useCallback(async () => {
    if (!selectedImage || !originalCanvasRef.current || !imageLoadedRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = originalCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Update PSF first with current parameters
      await window.electronAPI?.vision.updatePSF({
        sphere_D: myopia,
        cylinder_D: cylinder !== 0 ? cylinder : undefined,
        axis_deg: profile?.rx.axis_deg ?? 0,
        distance_cm: distance,
        display_ppi: profile?.ppi ?? 96,
        display_width_px: canvas.width,
        display_height_px: canvas.height,
        display_diag_in: profile?.display.diag_in ?? 24,
      });

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const buffer = imageData.data.buffer;

      // Process with current parameters
      const processed = await window.electronAPI?.vision.processFrame({
        buffer,
        width: canvas.width,
        height: canvas.height,
        psfParams: {
          sphere_D: myopia,
          cylinder_D: cylinder !== 0 ? cylinder : undefined,
          axis_deg: profile?.rx.axis_deg ?? 0,
          distance_cm: distance,
          display_ppi: profile?.ppi ?? 96,
          display_width_px: canvas.width,
          display_height_px: canvas.height,
          display_diag_in: profile?.display.diag_in ?? 24,
        },
        lambda,
        lfd_inspired: false,
        contrast_boost: 1.0,
      });

      if (processed) {
        // Convert processed buffer to image
        const processedImageData = new ImageData(
          new Uint8ClampedArray(processed),
          canvas.width,
          canvas.height
        );
        
        const processedCanvas = processedCanvasRef.current;
        if (processedCanvas) {
          processedCanvas.width = canvas.width;
          processedCanvas.height = canvas.height;
          const processedCtx = processedCanvas.getContext('2d');
          if (processedCtx) {
            processedCtx.putImageData(processedImageData, 0, 0);
            setProcessedImage(processedCanvas.toDataURL());
          }
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, myopia, distance, cylinder, lambda, profile]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setSelectedImage(imageUrl);
      setProcessedImage(null);
      imageLoadedRef.current = false;
      
      // Load image to canvas
      const img = new Image();
      img.onload = () => {
        const canvas = originalCanvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            imageLoadedRef.current = true;
            // Trigger processing after image loads
            setTimeout(() => {
              processImage();
            }, 200);
          }
        }
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  // Auto-process when parameters change (with debouncing)
  useEffect(() => {
    if (!imageLoadedRef.current || !selectedImage) return;
    
    const timeoutId = setTimeout(() => {
      processImage();
    }, 300); // Debounce 300ms
    
    return () => clearTimeout(timeoutId);
  }, [processImage, selectedImage]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← Back to Live View
        </button>
        <h2 style={{ margin: 0, color: 'white', fontSize: '18px' }}>Image Correction Test</h2>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '16px 24px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '10px 20px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Upload Image
          </button>

          <button
            onClick={processImage}
            disabled={!selectedImage || isProcessing}
            style={{
              padding: '10px 20px',
              background: selectedImage && !isProcessing ? '#4caf50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: selectedImage && !isProcessing ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {isProcessing ? 'Processing...' : 'Apply Correction'}
          </button>
        </div>

        {/* Compact Sliders */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '8px' }}>
          {/* Myopia Slider */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>Myopia (D):</label>
              <span style={{ fontSize: '12px', color: '#4caf50', fontFamily: 'monospace' }}>
                {myopia.toFixed(2)}D
              </span>
            </div>
            <input
              type="range"
              min="-8.0"
              max="0.0"
              step="0.25"
              value={myopia}
              onChange={(e) => setMyopia(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: '#444',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Distance Slider */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>Distance (cm):</label>
              <span style={{ fontSize: '12px', color: '#2196f3', fontFamily: 'monospace' }}>
                {distance.toFixed(0)}cm
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: '#444',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Cylinder Slider */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>Cylinder (D):</label>
              <span style={{ fontSize: '12px', color: '#ff9800', fontFamily: 'monospace' }}>
                {cylinder.toFixed(2)}D
              </span>
            </div>
            <input
              type="range"
              min="-4.0"
              max="4.0"
              step="0.25"
              value={cylinder}
              onChange={(e) => setCylinder(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: '#444',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Lambda Slider (smaller, hidden label) */}
          <div style={{ flex: '1', minWidth: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>λ:</label>
              <span style={{ fontSize: '12px', color: '#9c27b0', fontFamily: 'monospace' }}>
                {lambda.toFixed(3)}
              </span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.1"
              step="0.001"
              value={lambda}
              onChange={(e) => setLambda(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: '#444',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>

      {/* Image Display */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: '16px',
          padding: '16px',
          overflow: 'auto',
        }}
      >
        {/* Original Image */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: '#ccc', fontSize: '14px', fontWeight: '600' }}>Original</div>
          <div
            style={{
              flex: 1,
              background: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              overflow: 'auto',
            }}
          >
            {selectedImage ? (
              <canvas
                ref={originalCanvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div style={{ color: '#666', fontSize: '14px' }}>No image uploaded</div>
            )}
          </div>
        </div>

        {/* Processed Image */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: '#ccc', fontSize: '14px', fontWeight: '600' }}>Corrected</div>
          <div
            style={{
              flex: 1,
              background: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              overflow: 'auto',
            }}
          >
            {processedImage ? (
              <canvas
                ref={processedCanvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div style={{ color: '#666', fontSize: '14px' }}>
                {selectedImage ? 'Click "Apply Correction" to process' : 'Upload an image first'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

