import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';

export default function Calibration() {
  const navigate = useNavigate();
  const { sessionId, setCalibration, setStage } = useTestStore();
  const [cardWidthPx, setCardWidthPx] = useState(300);
  const [distance, setDistance] = useState(60);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
    } else {
      // Set stage to calibration when component mounts
      console.log('📍 Setting stage to calibration');
      setStage('calibration');
    }
  }, [sessionId, navigate, setStage]);

  const handleComplete = () => {
    // Credit card standard width: 85.6mm = 8.56cm
    const cardWidthCm = 8.56;
    const pixelsPerCm = cardWidthPx / cardWidthCm;

    // Calculate pixels per arcminute
    // tan(1 arcmin) = tan(1/60 degrees) * distance_cm
    const arcminRad = (1 / 60) * (Math.PI / 180);
    const arcminCm = Math.tan(arcminRad) * distance;
    const pixelsPerArcmin = arcminCm * pixelsPerCm;

    console.log('📏 Calibration:', {
      pixelsPerCm: pixelsPerCm.toFixed(2),
      viewingDistanceCm: distance,
      pixelsPerArcmin: pixelsPerArcmin.toFixed(2),
    });

    setCalibration({
      pixelsPerCm,
      viewingDistanceCm: distance,
      pixelsPerArcmin,
    });

    navigate('/sphere');
  };

  return (
    <div className="container" style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '4rem 2rem',
    }}>
      <div className="text-center mb-4">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          Screen Calibration
        </h1>
        <p style={{ color: 'var(--color-text-dim)' }}>
          For accurate results, we need to calibrate your screen
        </p>
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '0.5rem',
          display: 'inline-block',
        }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>
            🎤 Your AI examiner will guide you through these steps
          </span>
        </div>
      </div>

      <div className="card mb-4">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
          Step 1: Card Width
        </h2>
        <p className="text-dim mb-3" style={{ fontSize: '0.875rem' }}>
          Place a credit card on your screen and adjust the slider until the box matches the card width.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <div
            style={{
              width: cardWidthPx + 'px',
              height: '180px',
              border: '3px solid var(--color-primary)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              color: 'var(--color-text-dim)',
              background: 'rgba(59, 130, 246, 0.05)',
            }}
          >
            Credit Card Width
            <br />
            {cardWidthPx}px
          </div>
        </div>

        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <input
            type="range"
            min="200"
            max="500"
            value={cardWidthPx}
            onChange={(e) => setCardWidthPx(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--color-text-dim)',
            marginTop: '0.5rem',
          }}>
            <span>Smaller</span>
            <span>Larger</span>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
          Step 2: Viewing Distance
        </h2>
        <p className="text-dim mb-3" style={{ fontSize: '0.875rem' }}>
          Enter your distance from the screen in centimeters (standard: 60cm / 24 inches).
        </p>

        <div style={{ maxWidth: '300px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            <input
              type="number"
              min="30"
              max="120"
              value={distance}
              onChange={(e) => setDistance(parseInt(e.target.value))}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'var(--color-bg)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.25rem',
                color: 'var(--color-text)',
                fontSize: '1.125rem',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '1.125rem' }}>cm</span>
          </div>

          <input
            type="range"
            min="30"
            max="120"
            value={distance}
            onChange={(e) => setDistance(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--color-text-dim)',
            marginTop: '0.5rem',
          }}>
            <span>30cm</span>
            <span>120cm</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleComplete}
          className="btn btn-primary btn-large"
        >
          Continue to Test →
        </button>
      </div>
    </div>
  );
}

