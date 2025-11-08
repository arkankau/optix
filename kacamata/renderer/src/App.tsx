import React, { useState, useEffect } from 'react';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CalibrationScreen } from './components/CalibrationScreen';
import { LiveView } from './components/LiveView';
import { Controls } from './components/Controls';
import { Profile } from './types';

declare global {
  interface Window {
    electronAPI: any;
  }
}

type AppView = 'onboarding' | 'calibration' | 'live';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('onboarding');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isOverlay, setIsOverlay] = useState(false);

  useEffect(() => {
    // Check if we're in overlay mode
    const hash = window.location.hash;
    if (hash === '#overlay') {
      setIsOverlay(true);
      setCurrentView('live');
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

  if (isOverlay) {
    return <LiveView profile={currentProfile} isOverlay={true} />;
  }

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

