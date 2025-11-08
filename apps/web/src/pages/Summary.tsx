import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';
import { api } from '../api/client';

export default function Summary() {
  const navigate = useNavigate();
  const { sessionId, sphereResults, jccResults, reset } = useTestStore();

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    saveFinalRx();
  }, [sessionId]);

  const saveFinalRx = async () => {
    if (!sphereResults.OD || !sphereResults.OS || !jccResults.OD || !jccResults.OS) {
      console.error('Missing results');
      return;
    }

    const results = {
      OD: {
        S: sphereResults.OD.sphere,
        C: jccResults.OD.cyl,
        Axis: jccResults.OD.axis,
        VA_logMAR: sphereResults.OD.threshold,
        confidence: (sphereResults.OD.confidence + jccResults.OD.confidence) / 2,
        eye: 'OD',
      },
      OS: {
        S: sphereResults.OS.sphere,
        C: jccResults.OS.cyl,
        Axis: jccResults.OS.axis,
        VA_logMAR: sphereResults.OS.threshold,
        confidence: (sphereResults.OS.confidence + jccResults.OS.confidence) / 2,
        eye: 'OS',
      },
    };

    try {
      await api.saveSummary(sessionId!, results);
      console.log('📊 Saved final Rx');
      console.log('   OD:', formatRx(results.OD));
      console.log('   OS:', formatRx(results.OS));
    } catch (error) {
      console.error('Failed to save summary:', error);
    }
  };

  const formatRx = (rx: any): string => {
    const sphere = rx.S >= 0 ? `+${rx.S.toFixed(2)}` : rx.S.toFixed(2);
    const cyl = rx.C >= 0 ? `+${rx.C.toFixed(2)}` : rx.C.toFixed(2);
    return `${sphere} ${cyl} × ${rx.Axis}°`;
  };

  const getVA = (logMAR: number): string => {
    const snellen = Math.round(20 * Math.pow(10, logMAR));
    return `20/${snellen}`;
  };

  const handleExport = async () => {
    if (!sessionId) return;
    try {
      const csv = await api.exportCSV(sessionId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nearify-${sessionId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleRestart = () => {
    reset();
    navigate('/');
  };

  if (!sphereResults.OD || !sphereResults.OS || !jccResults.OD || !jccResults.OS) {
    return (
      <div className="container text-center" style={{ padding: '4rem' }}>
        <p>Loading results...</p>
      </div>
    );
  }

  const rxOD = {
    S: sphereResults.OD.sphere,
    C: jccResults.OD.cyl,
    Axis: jccResults.OD.axis,
    VA_logMAR: sphereResults.OD.threshold,
    confidence: (sphereResults.OD.confidence + jccResults.OD.confidence) / 2,
  };

  const rxOS = {
    S: sphereResults.OS.sphere,
    C: jccResults.OS.cyl,
    Axis: jccResults.OS.axis,
    VA_logMAR: sphereResults.OS.threshold,
    confidence: (sphereResults.OS.confidence + jccResults.OS.confidence) / 2,
  };

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' }}>
      <div className="text-center mb-4">
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Test Complete!
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '1.125rem' }}>
          Here's your prescription
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '3rem' }}>
        <RxCard
          eye="Right Eye (OD)"
          rx={rxOD}
          va={getVA(rxOD.VA_logMAR)}
        />
        <RxCard
          eye="Left Eye (OS)"
          rx={rxOS}
          va={getVA(rxOS.VA_logMAR)}
        />
      </div>

      <div className="card mb-4">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          🏆 Powered By AI
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
          <IntegrationBadge
            icon="🎤"
            name="ElevenLabs Conversational AI"
            status="Natural bidirectional voice conversation for sphere test"
          />
          <IntegrationBadge
            icon="🤖"
            name="xAI Grok"
            status="Realtime confidence monitoring & hints"
          />
        </div>
      </div>

      <div className="text-center" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleExport} className="btn btn-secondary btn-large">
          📥 Export CSV
        </button>
        <button onClick={handleRestart} className="btn btn-primary btn-large">
          🔄 Start New Test
        </button>
      </div>

      <div className="text-center mt-4" style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
        <p>Session ID: {sessionId}</p>
        <p style={{ marginTop: '1rem' }}>
          This is a demo. For medical purposes, consult a licensed optometrist.
        </p>
      </div>
    </div>
  );
}

function RxCard({ eye, rx, va }: { eye: string; rx: any; va: string }) {
  const sphere = rx.S >= 0 ? `+${rx.S.toFixed(2)}` : rx.S.toFixed(2);
  const cyl = rx.C >= 0 ? `+${rx.C.toFixed(2)}` : rx.C.toFixed(2);

  return (
    <div className="card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem',
      }}>
        <h2 style={{ fontSize: '1.5rem' }}>{eye}</h2>
        <div style={{
          padding: '0.25rem 0.75rem',
          background: rx.confidence > 0.8 ? 'var(--color-success)' : 'var(--color-warning)',
          borderRadius: '0.25rem',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}>
          {(rx.confidence * 100).toFixed(0)}% confident
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
            Sphere (S)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {sphere} D
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
            Cylinder (C)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {cyl} D
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
            Axis
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {rx.Axis}°
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
            Visual Acuity
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {va}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationBadge({ icon, name, status }: { icon: string; name: string; status: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '0.25rem',
    }}>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          {status}
        </div>
      </div>
      <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓</div>
    </div>
  );
}

