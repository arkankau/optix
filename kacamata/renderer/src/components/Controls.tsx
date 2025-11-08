import React from 'react';
import { Profile } from '../types';

interface Props {
  profile: Profile | null;
  isProcessing: boolean;
  onToggleProcessing: () => void;
  splitMode: boolean;
  onToggleSplitMode: () => void;
  lfdInspired: boolean;
  onToggleLFD: () => void;
  onFeedback: (feedback: 'too_blurry' | 'too_sharp' | 'ok') => void;
  lambda: number;
  onLambdaChange: (lambda: number) => void;
  sigmaX: number;
  sigmaY: number;
  bypass: boolean;
  fps: number;
  latency: number;
  distance: number;
  myopia?: number;
  onMyopiaChange?: (myopia: number) => void;
  onDistanceChange?: (distance: number) => void;
  cylinder?: number;
  onCylinderChange?: (cylinder: number) => void;
  onTestImage?: () => void;
}

export function Controls({
  profile,
  isProcessing,
  onToggleProcessing,
  splitMode,
  onToggleSplitMode,
  lfdInspired,
  onToggleLFD,
  onFeedback,
  lambda,
  onLambdaChange,
  sigmaX,
  sigmaY,
  bypass,
  fps,
  latency,
  distance,
  myopia,
  onMyopiaChange,
  onDistanceChange,
  cylinder,
  onCylinderChange,
  onTestImage,
}: Props) {
  const handleFeedback = (type: 'too_blurry' | 'too_sharp' | 'ok') => {
    onFeedback(type);
  };

  return (
    <div
      style={{
        background: '#1a1a1a',
        borderTop: '1px solid #333',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={onToggleProcessing}
          style={{
            padding: '12px 24px',
            background: isProcessing ? '#4caf50' : '#666',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {isProcessing ? '● Processing' : '○ Paused'}
        </button>

        <button
          onClick={onToggleSplitMode}
          style={{
            padding: '12px 24px',
            background: splitMode ? '#2196f3' : '#666',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {splitMode ? 'Split View' : 'Single View'}
        </button>

        <button
          onClick={onToggleLFD}
          style={{
            padding: '12px 24px',
            background: lfdInspired ? '#9c27b0' : '#666',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
          }}
          title="LFD-Inspired Mode: Ray-level correction (experimental)"
        >
          {lfdInspired ? 'LFD Mode' : '2D Mode'}
        </button>

        {onTestImage && (
          <button
            onClick={onTestImage}
            style={{
              padding: '12px 24px',
              background: '#ff9800',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Test Image Correction
          </button>
        )}

        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            onClick={() => handleFeedback('too_blurry')}
            style={{
              padding: '10px 16px',
              background: '#f44336',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Too Blurry
          </button>
          <button
            onClick={() => handleFeedback('ok')}
            style={{
              padding: '10px 16px',
              background: '#4caf50',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            OK
          </button>
          <button
            onClick={() => handleFeedback('too_sharp')}
            style={{
              padding: '10px 16px',
              background: '#ff9800',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Too Sharp
          </button>
        </div>
      </div>

      {/* Real-time Parameter Controls - Compact Sliders */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          padding: '12px 16px',
          background: '#252525',
          borderRadius: '8px',
          border: '1px solid #444',
          flexWrap: 'wrap',
        }}
      >
        {/* Myopia Slider */}
        {onMyopiaChange && myopia !== undefined && (
          <div style={{ flex: '1', minWidth: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>Myopia:</label>
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
              onChange={(e) => onMyopiaChange(parseFloat(e.target.value))}
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
        )}

        {/* Distance Slider */}
        {onDistanceChange && (
          <div style={{ flex: '1', minWidth: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>Distance:</label>
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
              onChange={(e) => onDistanceChange(parseFloat(e.target.value))}
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
        )}

        {/* Cylinder Slider */}
        {onCylinderChange && cylinder !== undefined && (
          <div style={{ flex: '1', minWidth: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>Cylinder:</label>
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
              onChange={(e) => onCylinderChange(parseFloat(e.target.value))}
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
        )}

        {/* Lambda Slider (compact) */}
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
            onChange={(e) => onLambdaChange(parseFloat(e.target.value))}
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

      <div
        style={{
          display: 'flex',
          gap: '24px',
          fontSize: '13px',
          opacity: '0.8',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <strong>FPS:</strong> {fps}
        </div>
        <div>
          <strong>Latency:</strong> {latency}ms
        </div>
        <div>
          <strong>Distance:</strong> {distance.toFixed(1)}cm
        </div>
        <div>
          <strong>λ:</strong> {lambda.toFixed(4)}
        </div>
        <div>
          <strong>σx/σy:</strong> {sigmaX.toFixed(3)} / {sigmaY.toFixed(3)}
        </div>
        <div>
          <strong>Bypass:</strong> {bypass ? 'true' : 'false'}
        </div>
        {profile && (
          <div>
            <strong>Profile:</strong> {profile.name} ({profile.rx.sphere_D}D)
          </div>
        )}
      </div>

      <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
        Hotkeys: Ctrl+E (Toggle Overlay) | Ctrl+S (Split Mode) | Ctrl+R (Recalibrate)
      </div>
    </div>
  );
}

