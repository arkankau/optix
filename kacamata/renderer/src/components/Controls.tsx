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
  sigmaX: number;
  sigmaY: number;
  bypass: boolean;
  fps: number;
  latency: number;
  distance: number;
  nearifyMode?: string;
  nearifyRegion?: string;
  nearifyDeltaD?: number;
  nearifyScale?: number;
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
  sigmaX,
  sigmaY,
  bypass,
  fps,
  latency,
  distance,
  nearifyMode,
  nearifyRegion,
  nearifyDeltaD,
  nearifyScale,
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

      <div
        style={{
          display: 'flex',
          gap: '24px',
          fontSize: '13px',
          opacity: 0.8,
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
        {splitMode && nearifyMode && (
          <>
            <div style={{ borderLeft: '2px solid #22c55e', paddingLeft: '12px' }}>
              <strong>Mode:</strong> {nearifyMode}
            </div>
            <div>
              <strong>Region:</strong> {nearifyRegion}
            </div>
            <div>
              <strong>ΔD:</strong> {nearifyDeltaD?.toFixed(2)}D
            </div>
            {nearifyScale && nearifyScale > 1.0 && (
              <div>
                <strong>Scale:</strong> {nearifyScale.toFixed(2)}×
              </div>
            )}
          </>
        )}
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

