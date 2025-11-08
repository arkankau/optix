/**
 * Clear Meter HUD Component
 * Shows auto-clear size recommendations and current status
 */

import React from 'react';

export interface ClearMeterData {
  // Clear guidance
  fontPx: number;
  strokeMin: number;
  thetaArcmin: number;
  ppd: number;
  scaleFactor: number;
  needsAutoScale: boolean;
  
  // Current state
  currentFontPx: number;
  autoScaleEnabled: boolean;
  
  // Vision params
  deltaD: number;
  distance_cm: number;
}

interface Props {
  data: ClearMeterData | null;
  visible?: boolean;
  onToggleAutoScale?: () => void;
}

export function ClearMeter({ data, visible = true, onToggleAutoScale }: Props) {
  if (!visible || !data) return null;

  const statusColor = data.needsAutoScale ? '#ff9900' : '#00ff00';
  const scalePercent = ((data.scaleFactor - 1) * 100).toFixed(0);
  const isOptimal = !data.needsAutoScale;

  return (
    <div
      style={{
        position: 'fixed',
        top: 60,
        right: 10,
        width: '280px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        padding: '12px',
        borderRadius: '6px',
        border: `2px solid ${statusColor}`,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              animation: data.needsAutoScale ? 'pulse 2s infinite' : 'none',
            }}
          />
          <strong style={{ fontSize: '14px' }}>Clear Meter</strong>
        </div>
        <div style={{ fontSize: '10px', color: '#888' }}>ΔD: {data.deltaD.toFixed(2)}D</div>
      </div>

      {/* Status */}
      <div
        style={{
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: isOptimal ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 153, 0, 0.1)',
          borderRadius: '4px',
          borderLeft: `3px solid ${statusColor}`,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {isOptimal ? '✓ Optimal Clarity' : '⚠ Scaling Recommended'}
        </div>
        <div style={{ fontSize: '11px', color: '#ccc' }}>
          {isOptimal
            ? 'Text size is sufficient for current blur level'
            : `Increase UI scale by ${scalePercent}% for better legibility`}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div>
          <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>Target</div>
          <div style={{ fontWeight: 'bold' }}>{data.thetaArcmin.toFixed(1)}′</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>PPD</div>
          <div style={{ fontWeight: 'bold' }}>{data.ppd.toFixed(1)}</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>Recommended</div>
          <div style={{ fontWeight: 'bold', color: statusColor }}>{data.fontPx}px</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>Current</div>
          <div style={{ fontWeight: 'bold' }}>{data.currentFontPx}px</div>
        </div>
      </div>

      {/* Stroke info */}
      <div style={{ marginBottom: '12px', fontSize: '11px', color: '#aaa' }}>
        Min stroke: {data.strokeMin.toFixed(2)}px
      </div>

      {/* Auto-scale toggle */}
      {onToggleAutoScale && (
        <button
          onClick={onToggleAutoScale}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: data.autoScaleEnabled ? '#007bff' : '#444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = data.autoScaleEnabled ? '#0056b3' : '#555';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = data.autoScaleEnabled ? '#007bff' : '#444';
          }}
        >
          Auto-Clear: {data.autoScaleEnabled ? 'ON' : 'OFF'}
        </button>
      )}

      {/* Help text */}
      <div
        style={{
          marginTop: '12px',
          fontSize: '10px',
          color: '#666',
          borderTop: '1px solid #333',
          paddingTop: '8px',
        }}
      >
        Auto-Clear automatically scales UI elements to maintain legibility under myopic blur.
      </div>
    </div>
  );
}

/**
 * Compact Clear Meter (minimal version)
 */
export function CompactClearMeter({ data, visible = true }: Props) {
  if (!visible || !data) return null;

  const statusColor = data.needsAutoScale ? '#ff9900' : '#00ff00';
  const statusIcon = data.needsAutoScale ? '⚠' : '✓';

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '11px',
        padding: '4px 10px',
        borderRadius: '3px',
        border: `1px solid ${statusColor}`,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <span style={{ color: statusColor }}>{statusIcon}</span> Clear: {data.fontPx}px (
      {data.currentFontPx}px) | {data.thetaArcmin.toFixed(1)}′
    </div>
  );
}

/**
 * Add pulse animation for attention
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);


