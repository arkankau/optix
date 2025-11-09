interface AlertBannerProps {
  type: 'grok' | 'photon';
  message: string;
  onDismiss: () => void;
}

export default function AlertBanner({ type, message, onDismiss }: AlertBannerProps) {
  const isGrok = type === 'grok';

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: '600px',
      width: '90%',
      background: isGrok ? 'rgba(59, 130, 246, 0.9)' : 'rgba(245, 158, 11, 0.9)',
      color: 'white',
      padding: '1rem 1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      zIndex: 1000,
      animation: 'slideDown 0.3s ease-out',
    }}>
      <div style={{ fontSize: '1.5rem' }}>
        {isGrok ? '🤖' : '⚡'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
          {isGrok ? 'Grok Suggestion' : 'Photon Alert'}
        </div>
        <div style={{ fontSize: '0.875rem' }}>
          {message}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: 'white',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
        }}
      >
        ×
      </button>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

