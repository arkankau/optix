import { useTestStore } from '../store/testStore';

export default function Header() {
  const { stage } = useTestStore();

  const getStageLabel = () => {
    switch (stage) {
      case 'calibration': return 'Calibration';
      case 'sphere_od': return 'Sphere Test - Right Eye';
      case 'sphere_os': return 'Sphere Test - Left Eye';
      case 'jcc_od': return 'Astigmatism - Right Eye';
      case 'jcc_os': return 'Astigmatism - Left Eye';
      case 'complete': return 'Complete';
      default: return 'Nearify Exam';
    }
  };

  return (
    <header style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1rem 2rem',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            Nearify Exam
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>
            {getStageLabel()}
          </p>
        </div>
        
        {stage !== 'idle' && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}>
            <StageIndicator active={stage.includes('sphere')} label="Sphere" />
            <StageIndicator active={stage.includes('jcc')} label="Astigmatism" />
            <StageIndicator active={stage === 'complete'} label="Complete" />
          </div>
        )}
      </div>
    </header>
  );
}

function StageIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div style={{
      padding: '0.5rem 1rem',
      borderRadius: '0.25rem',
      background: active ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
      color: active ? 'white' : 'var(--color-text-dim)',
      fontWeight: active ? 500 : 400,
    }}>
      {label}
    </div>
  );
}

