import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';
import { useAI } from '../contexts/AIContext';
import FixedLettersChart from '../components/FixedLettersChart';
import AlertBanner from '../components/AlertBanner';

function getLineLabel(line: number): string {
  const labels: Record<number, string> = {
    1: '20/200',
    2: '20/100',
    3: '20/70',
    4: '20/50',
    5: '20/40',
    6: '20/30',
    7: '20/25',
    8: '20/20',
    9: 'Better',
    10: 'Better',
    11: 'Best',
  };
  return labels[line] || '';
}

export default function SphereTest() {
  const navigate = useNavigate();
  const {
    sessionId,
    calibration,
    currentEye,
    setStage,
    setSphereState,
    setSphereResult,
    setCurrentEye,
    showGrokHint,
    grokMessage,
    hideGrok,
    showGrok,
  } = useTestStore();

  const [currentLine, setCurrentLine] = useState(1); // Which line of the chart (1-11)
  const [prompt, setPrompt] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);

  useEffect(() => {
    if (!sessionId || !calibration) {
      navigate('/');
      return;
    }

    if (widgetReady) {
      initTest();
    }
  }, [sessionId, calibration, currentEye, widgetReady]);

  const initTest = () => {
    const eyeName = currentEye === 'OD' ? 'right' : 'left';
    setCurrentLine(1); // Start from line 1 (20/200)
    setPrompt(`Testing your ${eyeName} eye. The AI will guide you through the chart.`);
    console.log(`👁️  Started sphere test for ${currentEye} with fixed chart`);
  };

  const handleWidgetMessage = (message: string, isUser: boolean) => {
    console.log(`🎤 ${isUser ? 'User' : 'AI'}: ${message}`);
    
    if (!isUser) {
      // AI is speaking - update prompt
      setPrompt(message);
    } else {
      // User spoke - process their response
      // The ElevenLabs agent will handle the conversation flow
      // and determine when to move to next line or complete
    }
  };

  const handleComplete = () => {
    // Called when ElevenLabs agent completes the test for this eye
    setIsComplete(true);
    
    // Calculate rough sphere from best line read
    const sphereValue = lineToSphere(currentLine);
    
    setSphereResult(currentEye, {
      threshold: lineToLogMAR(currentLine),
      sphere: sphereValue,
      confidence: 0.85,
    });

    console.log(`✅ Sphere test complete for ${currentEye}: line ${currentLine}, sphere=${sphereValue}D`);

    // Move to next eye or astigmatism test
    if (currentEye === 'OD') {
      setTimeout(() => {
        setCurrentEye('OS');
        setStage('sphere_os');
        setIsComplete(false);
        setWidgetReady(false); // Reset widget
      }, 2000);
    } else {
      setTimeout(() => {
        navigate('/jcc');
      }, 2000);
    }
  };

  const eyeName = currentEye === 'OD' ? 'Right Eye' : 'Left Eye';

  // Convert line number to logMAR
  const lineToLogMAR = (line: number): number => {
    const logMARMap: Record<number, number> = {
      1: 1.0,   // 20/200
      2: 0.7,   // 20/100
      3: 0.54,  // 20/70
      4: 0.4,   // 20/50
      5: 0.3,   // 20/40
      6: 0.18,  // 20/30
      7: 0.1,   // 20/25
      8: 0.0,   // 20/20
      9: -0.1,  // Better than 20/20
      10: -0.2,
      11: -0.3,
    };
    return logMARMap[line] || 0.0;
  };

  // Convert line to approximate sphere (rough estimation)
  const lineToSphere = (line: number): number => {
    const logMAR = lineToLogMAR(line);
    if (logMAR <= 0) return 0.0; // Plano or better
    // Rough approximation: each 0.3 logMAR ~ -0.50 D
    return Math.round((logMAR * -1.5) / 0.25) * 0.25;
  };

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {showGrokHint && (
        <AlertBanner type="grok" message={grokMessage} onDismiss={hideGrok} />
      )}

      <div className="text-center mb-4">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          Sphere Test - {eyeName}
        </h1>
        <p style={{ color: 'var(--color-text-dim)' }}>
          {prompt}
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <FixedLettersChart scale={1} highlightLine={currentLine} />
      </div>

      <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{
          padding: '1.5rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '0.5rem',
          maxWidth: '600px',
        }}>
          <p style={{ fontSize: '1rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            <strong>🎤 AI-Guided Testing</strong>
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
            Your AI examiner will guide you through the chart line by line.
            {' '}Simply speak your responses naturally.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
            Current line: <strong>{currentLine}</strong> ({getLineLabel(currentLine)})
          </p>
        </div>
      </div>
    </div>
  );
}

