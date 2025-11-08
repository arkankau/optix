import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';
import { api } from '../api/client';
import VoiceButton from '../components/VoiceButton';
import TTSPlayer from '../components/TTSPlayer';
import AlertBanner from '../components/AlertBanner';

export default function JCCTest() {
  const navigate = useNavigate();
  const {
    sessionId,
    calibration,
    currentEye,
    stage,
    setStage,
    setJccState,
    setJccResult,
    setCurrentEye,
    showGrokHint,
    grokMessage,
    hideGrok,
    showGrok,
  } = useTestStore();

  const [jccState, setJccStateLocal] = useState<any>(null);
  const [showingChoice, setShowingChoice] = useState<1 | 2>(1);
  const [prompt, setPrompt] = useState('');
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!sessionId || !calibration) {
      navigate('/');
      return;
    }

    // Set the appropriate JCC stage based on current eye
    const expectedStage = `jcc_${currentEye.toLowerCase()}` as 'jcc_od' | 'jcc_os';
    if (stage !== expectedStage && stage !== 'complete') {
      console.log(`📍 Setting stage to ${expectedStage}`);
      setStage(expectedStage);
    }

    initJCC();
  }, [sessionId, calibration, currentEye, stage, setStage]);

  const initJCC = async () => {
    try {
      const response = await api.initJCC(currentEye);
      setJccStateLocal(response.state);
      setJccState(currentEye, response.state);
      
      setShowingChoice(1);
      setTrialStartTime(Date.now());
      
      const eyeName = currentEye === 'OD' ? 'right' : 'left';
      setPrompt(`Now testing astigmatism for your ${eyeName} eye. Which is clearer: one... or two?`);
      
      console.log(`👁️  Started JCC for ${currentEye}`);
    } catch (error) {
      console.error('Failed to init JCC:', error);
    }
  };

  const handleTranscript = async (text: string, _confidence: number) => {
    if (!jccState) return;

    // Detect choice
    const lower = text.toLowerCase();
    let choice: 1 | 2 | null = null;
    
    if (lower.includes('one') || lower.includes('1')) {
      choice = 1;
    } else if (lower.includes('two') || lower.includes('2')) {
      choice = 2;
    }

    if (!choice) {
      setPrompt('Say "one" or "two"');
      return;
    }

    const latencyMs = Date.now() - trialStartTime;

    console.log(`📝 JCC choice: ${choice}`);

    try {
      const response = await api.nextJCC(jccState, choice, latencyMs);
      
      setJccStateLocal(response.state);
      setJccState(currentEye, response.state);

      // Removed Grok hints - not needed for JCC test

      if (response.complete) {
        console.log(`✅ JCC complete for ${currentEye}: cyl=${response.result.cyl}D @ ${response.result.axis}°`);
        
        setJccResult(currentEye, {
          cyl: response.result.cyl,
          axis: response.result.axis,
          confidence: response.confidence,
        });

        setIsComplete(true);

        // Move to next eye or summary
        if (currentEye === 'OD') {
          setPrompt('Great! Now let\'s test your left eye.');
          setTimeout(() => {
            setCurrentEye('OS');
            setStage('jcc_os');
            setIsComplete(false);
            initJCC();
          }, 2000);
        } else {
          setPrompt('Excellent work! We\'re all done.');
          setTimeout(() => {
            setStage('complete');
            navigate('/summary');
          }, 2000);
        }
      } else {
        // Next comparison
        setTrialStartTime(Date.now());
        setPrompt('Which is clearer: one... or two?');
        
        // Alternate display (simulate flip)
        setShowingChoice(showingChoice === 1 ? 2 : 1);
      }
    } catch (error) {
      console.error('JCC error:', error);
    }
  };

  const handleChoice = async (choice: 1 | 2) => {
    handleTranscript(choice === 1 ? 'one' : 'two', 1.0);
  };

  const eyeName = currentEye === 'OD' ? 'Right Eye' : 'Left Eye';
  const stageName = jccState?.stage === 'axis' ? 'Axis Refinement' : 'Cylinder Power';

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {showGrokHint && (
        <AlertBanner type="grok" message={grokMessage} onDismiss={hideGrok} />
      )}

      <div className="text-center mb-4">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          Astigmatism Test - {eyeName}
        </h1>
        <p style={{ color: 'var(--color-text-dim)' }}>
          {stageName} | {prompt}
        </p>
      </div>

      {jccState && (
        <div className="text-center mb-3" style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
          Comparisons: {jccState.history.length} | Current Axis: {jccState.axisDeg}° | Cylinder: {jccState.cyl}D
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <JCCSimulation
          showing={showingChoice}
          axisDeg={jccState?.axisDeg || 90}
          cyl={jccState?.cyl || -0.5}
        />
      </div>

      <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <TTSPlayer text={prompt} autoPlay={false} />
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => handleChoice(1)}
            disabled={isComplete}
            className="btn btn-primary btn-large"
            style={{ minWidth: '150px' }}
          >
            1️⃣ One
          </button>
          <button
            onClick={() => handleChoice(2)}
            disabled={isComplete}
            className="btn btn-primary btn-large"
            style={{ minWidth: '150px' }}
          >
            2️⃣ Two
          </button>
        </div>

        <div style={{ margin: '1rem 0' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
            Or use voice:
          </p>
        </div>

        <VoiceButton
          onTranscript={handleTranscript}
          disabled={isComplete}
        />

        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', maxWidth: '500px' }}>
          Compare the two views and say which looks clearer.
          <br />
          Say "one" for the first or "two" for the second.
        </p>
      </div>
    </div>
  );
}

function JCCSimulation({ showing, axisDeg }: { showing: 1 | 2; axisDeg: number; cyl: number }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      height: '400px',
      margin: '0 auto',
      background: '#0a0a0b',
      borderRadius: '0.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        padding: '0.5rem 1rem',
        background: showing === 1 ? 'var(--color-primary)' : 'var(--color-warning)',
        borderRadius: '0.25rem',
        fontWeight: 600,
        fontSize: '1.25rem',
      }}>
        {showing === 1 ? '① First' : '② Second'}
      </div>

      {/* Simplified JCC visualization */}
      <svg width="300" height="300" viewBox="0 0 300 300">
        {/* Target with astigmatism simulation */}
        <g transform="translate(150, 150)">
          {/* Radial lines (some blurred) */}
          {[0, 30, 60, 90, 120, 150].map((angle) => {
            const rad = ((angle + (showing === 1 ? 0 : 45)) * Math.PI) / 180;
            const x = Math.cos(rad) * 100;
            const y = Math.sin(rad) * 100;
            
            // Simulate blur based on axis alignment
            const blur = Math.abs(Math.sin((angle - axisDeg) * Math.PI / 180)) * 3;
            
            return (
              <line
                key={angle}
                x1="0"
                y1="0"
                x2={x}
                y2={y}
                stroke="rgba(249, 250, 251, 0.8)"
                strokeWidth="2"
                filter={`blur(${blur}px)`}
              />
            );
          })}
          
          {/* Center circle */}
          <circle r="10" fill="var(--color-primary)" />
        </g>
      </svg>
    </div>
  );
}

