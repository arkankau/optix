import React, { useState, useEffect } from 'react';
import { Profile, Rx } from '../types';

interface Props {
  onComplete: (profile: Profile) => void;
  onBack: () => void;
}

export function CalibrationScreen({ onComplete, onBack }: Props) {
  const [sphere_D, setSphere_D] = useState<string>('-2.0');
  const [cylinder_D, setCylinder_D] = useState<string>('');
  const [axis_deg, setAxis_deg] = useState<string>('');
  const [distance_cm, setDistance_cm] = useState<string>('60');
  const [profileName, setProfileName] = useState<string>('My Profile');

  // Get display info
  useEffect(() => {
    const width = window.screen.width;
    const height = window.screen.height;
    // Estimate diagonal (common sizes)
    const diag_in = Math.sqrt(width * width + height * height) / 96; // Rough estimate
    const ppi = Math.sqrt(width * width + height * height) / diag_in;
  }, []);

  const handleSubmit = () => {
    const display = {
      width_px: window.screen.width,
      height_px: window.screen.height,
      diag_in: Math.sqrt(window.screen.width ** 2 + window.screen.height ** 2) / 96,
    };
    const ppi = Math.sqrt(display.width_px ** 2 + display.height_px ** 2) / display.diag_in;

    const rx: Rx = {
      sphere_D: parseFloat(sphere_D) || 0,
      cylinder_D: cylinder_D ? parseFloat(cylinder_D) : null,
      axis_deg: axis_deg ? parseFloat(axis_deg) : null,
    };

    // Compute kernel (simplified - would use PSF engine)
    const kernel = {
      sigma_x: Math.abs(rx.sphere_D) * 2,
      sigma_y: Math.abs(rx.sphere_D) * 2,
      theta_deg: rx.axis_deg || 0,
      size: 21,
    };

    const profile: Profile = {
      id: `profile-${Date.now()}`,
      name: profileName,
      rx,
      display,
      ppi,
      distance_cm_nominal: parseFloat(distance_cm) || 60,
      ambient_light_level: null,
      kernel,
      wiener_lambda: 0.008,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Save profile
    window.electronAPI?.profiles.save(profile).then(() => {
      onComplete(profile);
    });
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        padding: '40px',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          background: '#2a2a2a',
          borderRadius: '16px',
          padding: '40px',
        }}
      >
        <h2 style={{ fontSize: '28px', marginBottom: '30px' }}>Enter Prescription</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>
              Profile Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>
              Sphere (Diopters) *
            </label>
            <input
              type="number"
              step="0.25"
              value={sphere_D}
              onChange={(e) => setSphere_D(e.target.value)}
              placeholder="-2.00"
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
              }}
            />
            <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
              Negative for myopia (e.g., -2.00)
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>
              Cylinder (Optional)
            </label>
            <input
              type="number"
              step="0.25"
              value={cylinder_D}
              onChange={(e) => setCylinder_D(e.target.value)}
              placeholder="-0.75"
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>
              Axis (Degrees, 0-180)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="180"
              value={axis_deg}
              onChange={(e) => setAxis_deg(e.target.value)}
              placeholder="90"
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.8 }}>
              Viewing Distance (cm)
            </label>
            <input
              type="number"
              step="5"
              value={distance_cm}
              onChange={(e) => setDistance_cm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: '14px',
                background: '#3a3a3a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1,
                padding: '14px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

