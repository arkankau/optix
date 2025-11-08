/**
 * Nearify HUD: Display distance-aware UI scaling guidance
 * Shows far point, ΔD, target angular size, UI scale, and move hints
 */

import React from 'react';

export interface NearifyHUDData {
  // Current state
  distanceCm: number;
  farPointCm: number;
  
  // Vision metrics
  deltaD: number;
  thetaArcmin: number;
  
  // Scaling
  uiScale: number;
  fontPxMin: number;
  fontPxCurrent: number;
  
  // Status
  inClearZone: boolean;
  moveHint: string | null;
  
  // Mode
  nearifyEnabled: boolean;
}

interface Props {
  data: NearifyHUDData | null;
  visible?: boolean;
  onToggleNearify?: () => void;
}

export function NearifyHUD({ data, visible = true, onToggleNearify }: Props) {
  if (!visible || !data) return null;

  const statusColor = data.inClearZone ? '#00ff00' : '#ff9900';
  const scalePercent = ((data.uiScale - 1) * 100).toFixed(0);
  const showMoveHint = data.moveHint !== null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        width: '300px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        padding: '14px',
        borderRadius: '8px',
        border: `2px solid ${statusColor}`,
        zIndex: 9999,
        boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
            }}
          />
          <strong style={{ fontSize: '16px' }}>Nearify Mode</strong>
        </div>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          {data.nearifyEnabled ? 'Active' : 'Off'}
        </div>
      </div>

      {/* Status Card */}
      <div
        style={{
          marginBottom: '14px',
          padding: '10px',
          backgroundColor: data.inClearZone ? 'rgba(0, 255, 0, 0.08)' : 'rgba(255, 153, 0, 0.08)',
          borderRadius: '6px',
          borderLeft: `4px solid ${statusColor}`,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
          {data.inClearZone ? '✓ Inside Clear Zone' : '⚠ Outside Clear Zone'}
        </div>
        <div style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.4' }}>
          {data.inClearZone
            ? 'Native clarity - no scaling needed'
            : `UI scaled ${scalePercent}% to maintain legibility`}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <MetricCard label="Distance" value={`${data.distanceCm}cm`} />
        <MetricCard 
          label="Far Point" 
          value={`${data.farPointCm}cm`}
          highlight={!data.inClearZone}
        />
        <MetricCard 
          label="ΔD" 
          value={`${data.deltaD.toFixed(2)}D`}
          highlight={data.deltaD > 0}
        />
        <MetricCard label="θ Target" value={`${data.thetaArcmin.toFixed(1)}′`} />
        <MetricCard 
          label="UI Scale" 
          value={`${data.uiScale.toFixed(2)}×`}
          highlight={data.uiScale > 1.1}
        />
        <MetricCard 
          label="Font Size" 
          value={`${data.fontPxMin}px`}
          subtitle={`(current: ${data.fontPxCurrent}px)`}
        />
      </div>

      {/* Move Hint */}
      {showMoveHint && (
        <div
          style={{
            padding: '10px',
            backgroundColor: 'rgba(255, 153, 0, 0.15)',
            borderRadius: '6px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '18px' }}>💡</div>
          <div style={{ fontSize: '12px', color: '#ffa500', lineHeight: '1.4' }}>
            {data.moveHint}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {onToggleNearify && (
        <button
          onClick={onToggleNearify}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: data.nearifyEnabled ? '#007bff' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = data.nearifyEnabled ? '#0056b3' : '#666';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = data.nearifyEnabled ? '#007bff' : '#555';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Nearify: {data.nearifyEnabled ? 'ON' : 'OFF'}
        </button>
      )}

      {/* Footer Info */}
      <div
        style={{
          marginTop: '14px',
          fontSize: '11px',
          color: '#666',
          borderTop: '1px solid #333',
          paddingTop: '10px',
          lineHeight: '1.5',
        }}
      >
        <strong>Nearify Mode</strong>: Scales UI to keep content within your accommodation range.
        No blur filters - just bigger, clearer content.
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({ 
  label, 
  value, 
  subtitle, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '4px',
        border: highlight ? '1px solid #ffa500' : '1px solid transparent',
      }}
    >
      <div style={{ color: '#888', fontSize: '10px', marginBottom: '3px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontWeight: 'bold', fontSize: '15px', color: highlight ? '#ffa500' : '#fff' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Nearify HUD (minimal version)
 */
export function CompactNearifyHUD({ data, visible = true }: Props) {
  if (!visible || !data) return null;

  const statusColor = data.inClearZone ? '#00ff00' : '#ff9900';
  const statusIcon = data.inClearZone ? '✓' : '⚠';

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '11px',
        padding: '5px 12px',
        borderRadius: '4px',
        border: `1px solid ${statusColor}`,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <span style={{ color: statusColor }}>{statusIcon}</span> Nearify: {data.uiScale.toFixed(2)}× | 
      ΔD: {data.deltaD.toFixed(2)}D | {data.distanceCm}cm / {data.farPointCm}cm
    </div>
  );
}


