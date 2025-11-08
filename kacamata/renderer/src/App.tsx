import React, { useState, useEffect } from 'react';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CalibrationScreen } from './components/CalibrationScreen';
import { LiveView } from './components/LiveView';
import { Controls } from './components/Controls';
import { ControlPanel } from './components/ControlPanel';
import { Profile } from './types';

declare global {
  interface Window {
    electronAPI: any;
  }
}

type AppView = 'onboarding' | 'calibration' | 'live' | 'controls';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('onboarding');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isOverlay, setIsOverlay] = useState(false);
  const [isControlPanel, setIsControlPanel] = useState(false);

  useEffect(() => {
    // Check if we're in overlay mode or control panel mode
    const hash = window.location.hash;
    if (hash === '#overlay') {
      setIsOverlay(true);
      setCurrentView('live');
      // Load the first available profile for overlay
      window.electronAPI?.profiles.list().then((profiles: Profile[]) => {
        if (profiles && profiles.length > 0) {
          setCurrentProfile(profiles[0]);
        }
      });
    } else if (hash === '#controls') {
      setIsControlPanel(true);
    }

    // Listen for hotkey events
    window.electronAPI?.on('toggle-split-mode', () => {
      // Toggle split mode
    });

    window.electronAPI?.on('recalibrate', () => {
      setCurrentView('calibration');
    });
  }, []);

  const handleProfileCreated = (profile: Profile) => {
    setCurrentProfile(profile);
    setCurrentView('live');
  };

  // Control panel mode - show dedicated control panel UI
  if (isControlPanel) {
    return <ControlPanel />;
  }

  // Overlay mode - show only processed output
  if (isOverlay) {
    return <LiveView profile={currentProfile} isOverlay={true} />;
  }

  // Normal window mode - show full UI with wizard/calibration/live view
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {currentView === 'onboarding' && (
        <OnboardingWizard
          onComplete={handleProfileCreated}
          onSkipToManual={() => setCurrentView('calibration')}
        />
      )}
      {currentView === 'calibration' && (
        <CalibrationScreen
          onComplete={handleProfileCreated}
          onBack={() => setCurrentView('onboarding')}
        />
      )}
      {currentView === 'live' && (
        <LiveView profile={currentProfile} isOverlay={false} />
      )}
    </div>
  );
}

