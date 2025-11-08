import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';
import { useAI } from '../contexts/AIContext';
import FixedLettersChart from '../components/FixedLettersChart';
import AlertBanner from '../components/AlertBanner';
import VoiceButton from '../components/VoiceButton';
import { api } from '../api/client';
import { formatDiopter } from '../services/xaiAnalyzer';

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
    stage,
    setStage,
    setSphereState,
    setSphereResult,
    setCurrentEye,
    showGrokHint,
    grokMessage,
    hideGrok,
    showGrok,
    patientTranscriptions,
    currentAnalysis,
    addPatientTranscription,
    addXAIAnalysis,
  } = useTestStore();

  const [currentLine, setCurrentLine] = useState(1); // Which line of the chart (1-11)
  const [prompt, setPrompt] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalyzedTranscript, setLastAnalyzedTranscript] = useState('');

  useEffect(() => {
    if (!sessionId || !calibration) {
      navigate('/');
      return;
    }

    // Set the appropriate stage based on current eye
    const expectedStage = `sphere_${currentEye.toLowerCase()}` as 'sphere_od' | 'sphere_os';
    if (stage !== expectedStage) {
      console.log(`📍 Setting stage to ${expectedStage}`);
      setStage(expectedStage);
    }

    if (widgetReady) {
      initTest();
    }
  }, [sessionId, calibration, currentEye, widgetReady, stage, setStage]);

  // Watch for new patient transcriptions and analyze them
  useEffect(() => {
    const latestTranscription = patientTranscriptions[patientTranscriptions.length - 1];
    
    if (latestTranscription && 
        latestTranscription.text !== lastAnalyzedTranscript &&
        latestTranscription.eye === currentEye &&
        !analyzing) {
      
      console.log('🧠 New patient speech detected, analyzing with xAI...');
      analyzePatientResponse(latestTranscription.text);
    }
  }, [patientTranscriptions, currentEye]);

  // Handle voice transcription from VoiceButton
  const handleVoiceTranscript = (text: string, confidence: number) => {
    console.log(`🎤 Voice transcription received: "${text}" (${(confidence * 100).toFixed(0)}% confidence)`);
    
    // Check if patient can't see - IMMEDIATE exit
    const lowerText = text.toLowerCase();
    if (lowerText.includes("can't see") || lowerText.includes("cannot see") || 
        lowerText.includes("too small") || lowerText.includes("can't read") ||
        lowerText.includes("i can't") || lowerText.includes("can not see")) {
      console.log("🛑 Patient indicates they can't see - IMMEDIATELY completing test");
      handleComplete(); // No delay, immediate exit
      return;
    }
    
    // Normalize transcription: add spaces between letters if needed
    const normalizedText = normalizeLetterTranscript(text);
    console.log(`📝 Normalized: "${normalizedText}"`);
    
    // Store the transcription
    addPatientTranscription({
      timestamp: Date.now(),
      text: normalizedText,
      eye: currentEye,
      line: currentLine,
      stage: `sphere_${currentEye.toLowerCase()}`,
    });

    // Trigger xAI analysis
    analyzePatientResponse(normalizedText);
  };

  // Normalize letter transcripts (e.g., "FP" -> "F P")
  const normalizeLetterTranscript = (text: string): string => {
    // If it's already spaced, return as-is
    if (text.includes(' ')) return text;
    
    // If it's multiple letters without spaces, add spaces
    if (text.length > 1 && /^[A-Z]+$/.test(text)) {
      return text.split('').join(' ');
    }
    
    return text;
  };

  const analyzePatientResponse = async (patientSpeech: string) => {
    if (analyzing) return;
    
    setAnalyzing(true);
    setLastAnalyzedTranscript(patientSpeech);

    try {
      // Get expected letters for current line
      const expectedLetters = getExpectedLettersForLine(currentLine);
      
      console.log(`🧠 Analyzing: "${patientSpeech}" vs expected "${expectedLetters}"`);

      // Build previous performance history for this eye
      const previousPerformance = xaiAnalyses
        .filter(a => a.eye === currentEye)
        .map(a => ({ line: a.line, correct: a.correct }));

      const result = await api.analyzeResponse({
        patientSpeech,
        expectedLetters,
        currentLine,
        eye: currentEye,
        stage: `sphere_${currentEye.toLowerCase()}`,
        previousPerformance,
      });

      console.log('✅ xAI Analysis complete:', result);

      // Store the analysis
      addXAIAnalysis({
        timestamp: Date.now(),
        patientSpeech,
        expectedLetters,
        correct: result.correct,
        confidence: result.confidence,
        suggestedDiopter: result.suggestedDiopter,
        recommendation: result.recommendation,
        reasoning: result.reasoning,
        eye: currentEye,
        line: currentLine,
      });

      // Show analysis result to user
      const emoji = result.correct ? '✅' : '❌';
      const confidencePercent = (result.confidence * 100).toFixed(0);
      showGrok(
        `${emoji} ${result.correct ? 'Correct' : 'Incorrect'} (${confidencePercent}% confidence) - ${result.reasoning}`
      );

      // 🎯 AUTOMATICALLY EXECUTE xAI's RECOMMENDATION
      console.log(`🤖 xAI recommends: ${result.recommendation}`);
      
      switch (result.recommendation) {
        case 'advance':
          if (currentLine < 11) {
            console.log(`⬇️ Advancing to line ${currentLine + 1}`);
            setTimeout(() => setCurrentLine(currentLine + 1), 1000); // Small delay to show result
          } else {
            console.log('✅ Reached last line, completing test IMMEDIATELY');
            handleComplete(); // No delay when reaching end
          }
          break;
          
        case 'complete':
          console.log('✅ xAI determined patient limit, finishing this eye IMMEDIATELY');
          handleComplete(); // No delay when xAI determines limit
          break;
          
        default:
          console.log('⏸️ Unknown recommendation, advancing by default');
          if (currentLine < 11) {
            setTimeout(() => setCurrentLine(currentLine + 1), 1000);
          } else {
            handleComplete(); // No delay on completion
          }
          break;
      }

    } catch (error) {
      console.error('❌ Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Get expected letters for a line - ACTUAL letters from the eye chart image
  const getExpectedLettersForLine = (line: number): string => {
    // These are the REAL letters from /assets/eye-chart.png
    const letters: Record<number, string> = {
      1: 'E',
      2: 'F P',
      3: 'T O Z',
      4: 'L P E D',
      5: 'P E C F D',
      6: 'E D F C Z P',
      7: 'F E L O P Z D',
      8: 'D E F P O T E C',
      9: 'L E F O D P C T',
      10: 'F D F L T C E O',  // Note: Chart has F D F (not F D P)
      11: 'F E Z O L C F T D',  // Note: Chart starts with F (not P)
    };
    return letters[line] || 'UNKNOWN';
  };

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
    // Called when sphere test completes for this eye
    setIsComplete(true);
    
    // Get best line from xAI analysis or use previous line (since current line likely failed)
    const bestLine = currentAnalysis?.correct ? currentLine : Math.max(1, currentLine - 1);
    const sphereValue = lineToSphere(bestLine);
    
    const result = {
      threshold: lineToLogMAR(bestLine),
      sphere: sphereValue,
      confidence: 0.85,
    };
    
    setSphereResult(currentEye, result);

    console.log(`✅ Sphere test complete for ${currentEye}:`, result);
    console.log(`   Best Line: ${bestLine}, Current Line: ${currentLine}, Sphere: ${sphereValue}D`);

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
            <strong>🎤 Voice Testing</strong>
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
            Click the button and read the letters you can see on line {currentLine}.
            {' '}Speak clearly and the browser will transcribe automatically.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
            Current line: <strong>{currentLine}</strong> ({getLineLabel(currentLine)})
          </p>
        </div>

        {/* Voice Button */}
        <VoiceButton 
          onTranscript={handleVoiceTranscript}
          disabled={analyzing || isComplete}
        />

        {/* Patient Transcription Display */}
        <div style={{
          padding: '1rem',
          background: patientTranscriptions.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
          border: `1px solid ${patientTranscriptions.length > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
          borderRadius: '0.5rem',
          maxWidth: '600px',
          width: '100%',
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            <strong>👤 Your Transcription:</strong>
          </p>
          {patientTranscriptions.length > 0 ? (
            <>
              <p style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
                "{patientTranscriptions[patientTranscriptions.length - 1].text}"
              </p>
              {analyzing && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.5rem' }}>
                  🧠 Analyzing with xAI...
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
              Waiting for you to speak... (Total transcriptions: {patientTranscriptions.length})
            </p>
          )}
        </div>

        {/* xAI Analysis Result */}
        {currentAnalysis && currentAnalysis.eye === currentEye && (
          <div style={{
            padding: '1rem',
            background: currentAnalysis.correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${currentAnalysis.correct ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '0.5rem',
            maxWidth: '600px',
            width: '100%',
          }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              <strong>🧠 xAI Analysis:</strong>
            </p>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
              <p>
                <strong>{currentAnalysis.correct ? '✅ Correct' : '❌ Incorrect'}</strong>
                {' '}({(currentAnalysis.confidence * 100).toFixed(0)}% confidence)
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                Expected: <strong>{currentAnalysis.expectedLetters}</strong>
              </p>
              <p style={{ marginTop: '0.25rem' }}>
                Suggested Diopter: <strong>{formatDiopter(currentAnalysis.suggestedDiopter)}</strong>
              </p>
              <p style={{ marginTop: '0.25rem' }}>
                Recommendation: <strong>{currentAnalysis.recommendation}</strong>
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                {currentAnalysis.reasoning}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

