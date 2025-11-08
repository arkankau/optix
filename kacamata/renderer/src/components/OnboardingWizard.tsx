import React, { useState } from 'react';
import { Profile } from '../types';

interface Props {
  onComplete: (profile: Profile) => void;
  onSkipToManual: () => void;
}

export function OnboardingWizard({ onComplete, onSkipToManual }: Props) {
  const [step, setStep] = useState(0);

  const handleSelfTest = () => {
    // Navigate to calibration screen for self-test
    onSkipToManual();
  };

  const handleManualEntry = () => {
    onSkipToManual();
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '60px 40px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold' }}>
          👓 Clarity
        </h1>
        <p style={{ fontSize: '18px', marginBottom: '40px', opacity: 0.9 }}>
          Software-Defined Glasses
          <br />
          See your screen clearly without physical glasses
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button
            onClick={handleSelfTest}
            style={{
              padding: '20px 40px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            🧪 Run Self-Test (60-90s)
          </button>

          <button
            onClick={handleManualEntry}
            style={{
              padding: '20px 40px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#667eea',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            ✏️ Enter Prescription Manually
          </button>
        </div>

        <p
          style={{
            marginTop: '40px',
            fontSize: '14px',
            opacity: 0.7,
            lineHeight: '1.6',
          }}
        >
          ⚠️ This is an accessibility aid, not medical advice.
          <br />
          Consult your optometrist for proper vision care.
        </p>
      </div>
    </div>
  );
}

