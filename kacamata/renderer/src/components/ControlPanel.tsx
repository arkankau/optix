import React, { useState, useEffect } from 'react';
import { Profile } from '../types';

declare global {
  interface Window {
    electronAPI: any;
  }
}

export function ControlPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [lfdInspired, setLfdInspired] = useState(false);
  const [lambda, setLambda] = useState(0.02);
  const [myopia, setMyopia] = useState(-4.0);
  const [cylinder, setCylinder] = useState(0);
  const [distance, setDistance] = useState(60);
  const [contrastBoost, setContrastBoost] = useState(1.0);

  useEffect(() => {
    // Load profiles
    window.electronAPI?.profiles.list().then((p: Profile[]) => {
      setProfiles(p);
      if (p.length > 0) {
        setCurrentProfile(p[0]);
        setMyopia(p[0].rx.sphere_D);
        setCylinder(p[0].rx.cylinder_D ?? 0);
        setLambda(p[0].wiener_lambda ?? 0.02);
      }
    });
  }, []);

  const handleProfileChange = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setCurrentProfile(profile);
      setMyopia(profile.rx.sphere_D);
      setCylinder(profile.rx.cylinder_D ?? 0);
      setLambda(profile.wiener_lambda ?? 0.02);
    }
  };

  const applySettings = () => {
    if (!currentProfile) return;
    
    // Send settings update to overlay
    window.electronAPI?.vision.updatePSF({
      sphere_D: myopia,
      cylinder_D: cylinder !== 0 ? cylinder : undefined,
      axis_deg: currentProfile.rx.axis_deg,
      distance_cm: distance,
      display_ppi: currentProfile.ppi,
      display_width_px: currentProfile.display.width_px,
      display_height_px: currentProfile.display.height_px,
      display_diag_in: currentProfile.display.diag_in,
    }, lfdInspired);
  };

  useEffect(() => {
    applySettings();
  }, [myopia, cylinder, distance, lfdInspired]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      padding: '16px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '24px',
          background: 'linear-gradient(90deg, #00f260, #0575e6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Clarity Control Panel
        </h2>
        <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>
          Real-time Vision Correction Overlay
        </p>
      </div>

      {/* Profile Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
          Profile
        </label>
        <select
          value={currentProfile?.id || ''}
          onChange={(e) => handleProfileChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#0f3460',
            border: '1px solid #16213e',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
          }}
        >
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Processing Toggle */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: isProcessing ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
          borderRadius: '8px',
          cursor: 'pointer',
          border: `2px solid ${isProcessing ? '#0f0' : '#f00'}`,
        }}>
          <input
            type="checkbox"
            checked={isProcessing}
            onChange={(e) => setIsProcessing(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <span style={{ fontSize: '16px', fontWeight: '600' }}>
            {isProcessing ? '✅ Processing Enabled' : '⏸️ Processing Paused'}
          </span>
        </label>
      </div>

      {/* LFD Mode */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: 'rgba(0, 122, 255, 0.1)',
          borderRadius: '8px',
          cursor: 'pointer',
          border: '1px solid #0575e6',
        }}>
          <input
            type="checkbox"
            checked={lfdInspired}
            onChange={(e) => setLfdInspired(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <span style={{ fontSize: '14px' }}>LFD-Inspired Mode (Advanced)</span>
        </label>
      </div>

      {/* Myopia Control */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
          Myopia Correction (Diopters): {myopia.toFixed(2)}
        </label>
        <input
          type="range"
          min="-12"
          max="0"
          step="0.25"
          value={myopia}
          onChange={(e) => setMyopia(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#0575e6',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginTop: '4px' }}>
          <span>-12D (Strong)</span>
          <span>0D (None)</span>
        </div>
      </div>

      {/* Cylinder (Astigmatism) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
          Astigmatism (Cylinder): {cylinder.toFixed(2)}
        </label>
        <input
          type="range"
          min="-6"
          max="0"
          step="0.25"
          value={cylinder}
          onChange={(e) => setCylinder(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#00f260',
          }}
        />
      </div>

      {/* Distance */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
          Viewing Distance: {distance}cm
        </label>
        <input
          type="range"
          min="30"
          max="150"
          step="5"
          value={distance}
          onChange={(e) => setDistance(parseInt(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#0575e6',
          }}
        />
      </div>

      {/* Lambda (Regularization) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
          Sharpness (λ): {lambda.toFixed(4)}
        </label>
        <input
          type="range"
          min="0.001"
          max="0.05"
          step="0.001"
          value={lambda}
          onChange={(e) => setLambda(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#f093fb',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginTop: '4px' }}>
          <span>Sharp (Noisy)</span>
          <span>Smooth (Blurry)</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #333' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#aaa' }}>Quick Actions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={applySettings}
            style={{
              padding: '12px',
              background: 'linear-gradient(90deg, #00f260, #0575e6)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✨ Apply Settings
          </button>
          <button
            onClick={() => window.close()}
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Close Panel
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
        <h4 style={{ fontSize: '12px', margin: '0 0 8px 0', color: '#aaa' }}>Keyboard Shortcuts</h4>
        <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.6' }}>
          <div><code style={{ background: '#0f3460', padding: '2px 6px', borderRadius: '3px' }}>Ctrl+Shift+O</code> Toggle Overlay</div>
          <div><code style={{ background: '#0f3460', padding: '2px 6px', borderRadius: '3px' }}>Ctrl+Shift+C</code> Open Control Panel</div>
        </div>
      </div>
    </div>
  );
}
