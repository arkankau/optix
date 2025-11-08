import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';
import { useAI } from '../contexts/AIContext';
import { api } from '../api/client';

export default function Home() {
  const navigate = useNavigate();
  const { setSessionId, reset } = useTestStore();
  const { startAI } = useAI();

  const startTest = async () => {
    reset();
    
    try {
      const deviceInfo = navigator.userAgent;
      const response = await api.createSession({
        deviceInfo,
        distanceCm: 0,
        screenPpi: 0,
        lighting: 'photopic',
      });

      setSessionId(response.sessionId);
      console.log('📋 Session created:', response.sessionId);
      
      // Activate AI Examiner
      startAI();
      console.log('🤖 AI Examiner activated - starting examination');
      
      // AI will guide to calibration
      navigate('/calibration');
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to start test. Please check your connection.');
    }
  };

  return (
    <div className="container" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '4rem 2rem',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1rem' }}>
          👁️ Nearify Exam
        </h1>
        <p style={{ fontSize: '1.5rem', color: 'var(--color-text-dim)' }}>
          Voice-First Subjective Refraction
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem', textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>What to Expect</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Feature
            icon="🎤"
            title="AI-Guided Examination"
            description="A friendly AI examiner guides you through the entire test via natural conversation."
          />
          <Feature
            icon="📏"
            title="Automatic Calibration"
            description="The AI will help you calibrate your screen using a credit card for accuracy."
          />
          <Feature
            icon="👁️"
            title="Complete Eye Test"
            description="Sphere (distance vision) and astigmatism testing - just like at the optometrist."
          />
          <Feature
            icon="🎯"
            title="Instant Results"
            description="Get your complete prescription (Sphere, Cylinder, Axis) for both eyes."
          />
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Powered By</h3>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          fontSize: '0.875rem',
          color: 'var(--color-text-dim)',
        }}>
          <Badge>🎤 ElevenLabs Conversational AI</Badge>
          <Badge>🤖 Google Gemini</Badge>
          <Badge>🧠 xAI Grok</Badge>
        </div>
      </div>

      <button
        onClick={startTest}
        className="btn btn-primary btn-large"
        style={{ minWidth: '300px' }}
      >
        🎤 Start AI-Guided Exam →
      </button>

      <p style={{
        marginTop: '2rem',
        fontSize: '0.875rem',
        color: 'var(--color-text-dim)',
      }}>
        Duration: ~5-7 minutes | Voice-first experience | Best on desktop
      </p>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '2rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
          {description}
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      padding: '0.5rem 1rem',
      background: 'var(--color-surface)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.25rem',
    }}>
      {children}
    </span>
  );
}

