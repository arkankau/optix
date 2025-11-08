/**
 * Telemetry HUD: Display performance and vision correction metrics
 * Shows ΔD, bundles, refinement stats, FPS, pipeline mode
 */

import React from 'react';

export interface TelemetryData {
  // Performance
  fps: number;
  latency_ms: number;
  frameTime_ms: number;
  
  // Vision correction
  distance_cm: number;
  deltaD: number;
  sigma_x: number;
  sigma_y: number;
  theta: number;
  
  // Ray-bundle
  numBundles: number;
  pipelineMode: string;
  refinementDelta?: number;
  refinementIters?: number;
  
  // Bypass
  bypass: boolean;
}

interface Props {
  data: TelemetryData | null;
  visible?: boolean;
}

export function TelemetryHUD({ data, visible = true }: Props) {
  if (!visible || !data) return null;

  const fpsColor = data.fps >= 45 ? '#00ff00' : data.fps >= 30 ? '#ffff00' : '#ff0000';
  const bypassColor = data.bypass ? '#00ff00' : '#888888';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '11px',
        padding: '8px 12px',
        borderRadius: '4px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '8px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {/* Performance */}
      <div>
        <div style={{ color: '#aaaaaa', marginBottom: '4px' }}>PERFORMANCE</div>
        <div>
          FPS: <span style={{ color: fpsColor, fontWeight: 'bold' }}>{data.fps.toFixed(0)}</span>
        </div>
        <div>Latency: {data.latency_ms.toFixed(2)}ms</div>
        <div>Frame: {data.frameTime_ms.toFixed(2)}ms</div>
      </div>

      {/* Vision Correction */}
      <div>
        <div style={{ color: '#aaaaaa', marginBottom: '4px' }}>CORRECTION</div>
        <div>Distance: {data.distance_cm.toFixed(0)}cm</div>
        <div>
          ΔD: <span style={{ fontWeight: 'bold' }}>{data.deltaD.toFixed(2)}D</span>
        </div>
        <div>
          σ: ({data.sigma_x.toFixed(2)}, {data.sigma_y.toFixed(2)})px
        </div>
        {data.theta !== 0 && <div>θ: {data.theta.toFixed(0)}°</div>}
      </div>

      {/* Ray-Bundle */}
      <div>
        <div style={{ color: '#aaaaaa', marginBottom: '4px' }}>RAY-BUNDLE</div>
        <div>Bundles: {data.numBundles}</div>
        <div>
          Mode: <span style={{ color: '#00ccff' }}>{data.pipelineMode}</span>
        </div>
        {data.refinementDelta !== undefined && (
          <div>Refine: Δ{(data.refinementDelta * 1000).toFixed(2)}×10⁻³</div>
        )}
        {data.refinementIters !== undefined && data.refinementIters > 0 && (
          <div>Iters: {data.refinementIters}</div>
        )}
      </div>

      {/* Status */}
      <div>
        <div style={{ color: '#aaaaaa', marginBottom: '4px' }}>STATUS</div>
        <div>
          Bypass:{' '}
          <span style={{ color: bypassColor, fontWeight: 'bold' }}>
            {data.bypass ? 'YES' : 'NO'}
          </span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#666666' }}>
          Light Field Display Approach (Qiu et al. 2023)
        </div>
      </div>
    </div>
  );
}

/**
 * Compact HUD version (minimal footprint)
 */
export function CompactTelemetryHUD({ data, visible = true }: Props) {
  if (!visible || !data) return null;

  const fpsColor = data.fps >= 45 ? '#00ff00' : data.fps >= 30 ? '#ffff00' : '#ff0000';

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '10px',
        padding: '4px 8px',
        borderRadius: '3px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <span style={{ color: fpsColor }}>{data.fps}</span> FPS | ΔD: {data.deltaD.toFixed(2)}D |{' '}
      {data.pipelineMode} | K={data.numBundles}
    </div>
  );
}


