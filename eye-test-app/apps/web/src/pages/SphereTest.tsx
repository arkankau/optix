import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';
import FixedLettersChart from '../components/FixedLettersChart';
import { useTestProgression } from '../hooks/useTestProgression';

export default function SphereTest() {
  const navigate = useNavigate();
  const {
    sessionId,
    calibration,
    currentEye,
    stage,
    setStage,
    elevenLabsReady,
  } = useTestStore();

  const currentLine = useTestStore(state => state.currentTestLine); // Get from global state
  const [isComplete, setIsComplete] = useState(false);

  // Auto-progression listener
  useTestProgression({
    currentStage: currentEye === 'OD' ? 'sphere_od' : 'sphere_os',
    onComplete: () => {
      // Reset for next eye test
      setIsComplete(false);
    },
  });

  useEffect(() => {
    if (!sessionId || !calibration) {
      navigate('/');
      return;
    }

    // Set the appropriate stage based on current eye
    const expectedStage = `sphere_${currentEye.toLowerCase()}` as 'sphere_od' | 'sphere_os';
    if (stage !== expectedStage) {
      console.log(`📍 SphereTest: Setting stage to ${expectedStage}`);
      setStage(expectedStage);
    }
  }, [sessionId, calibration, currentEye, stage, setStage]);

  if (!calibration) return null;

  return (
    <div className="container" style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem',
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          marginBottom: '0.5rem',
          color: 'var(--color-text)',
        }}>
          Sphere Test - {currentEye === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
        </h1>
        <p style={{ 
          fontSize: '1rem', 
          color: 'var(--color-text-dim)',
          marginBottom: '1rem',
        }}>
          {currentEye === 'OD' ? 'Cover your left eye' : 'Cover your right eye'}
        </p>

        {/* AI Status Indicator */}
        {elevenLabsReady && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
            }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
              🎤 Your AI assistant is guiding you
            </span>
          </div>
        )}
      </div>

      {/* Eye Chart - Always centered and prominent */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}>
        <FixedLettersChart
          pixelsPerArcmin={calibration.pixelsPerArcmin}
          currentLine={currentLine}
        />
      </div>

      {/* Line Indicator */}
      <div style={{
        textAlign: 'center',
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '0.5rem',
      }}>
        <p style={{ 
          fontSize: '1.25rem', 
          color: 'var(--color-primary)',
          fontWeight: 600,
        }}>
          Line {currentLine} of 11
        </p>
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--color-text-dim)',
          marginTop: '0.25rem',
        }}>
          Listen to your AI assistant and read the letters aloud
        </p>
      </div>

      {/* Completion State */}
      {isComplete && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          padding: '2rem 3rem',
          borderRadius: '1rem',
          fontSize: '1.5rem',
          fontWeight: 600,
          zIndex: 1000,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}>
          ✅ Test Complete!
        </div>
      )}
    </div>
  );
}
