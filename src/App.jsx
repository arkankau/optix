import { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import ControlBar from './components/ControlBar';
import './App.css';

const loadStoredPrescription = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('optix.prescription');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

function App() {
  const stored = loadStoredPrescription();
  const initialEye = stored?.selectedEye || 'OD';
  const initialPrescription = stored?.rx || null;
  const initialEyeMetrics =
    initialPrescription?.[initialEye] ||
    initialPrescription?.OD ||
    (initialPrescription ? Object.values(initialPrescription)[0] : null);

  const [prescription, setPrescription] = useState(initialPrescription);
  const [selectedEye, setSelectedEye] = useState(initialEye);

  const [sphere, setSphere] = useState(initialEyeMetrics?.S ?? 2.0);
  const [cylinder, setCylinder] = useState(initialEyeMetrics?.C ?? 0.75);
  const [axis, setAxis] = useState(initialEyeMetrics?.Axis ?? 90);
  const [distance, setDistance] = useState(60);

  const [showControlBar, setShowControlBar] = useState(!initialPrescription);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [examStatus, setExamStatus] = useState(
    initialPrescription ? `Using ${selectedEye} eye prescription` : 'No prescription loaded'
  );

  // Listen for keyboard shortcut from Electron main process
  useEffect(() => {
    if (window.electronAPI?.onToggleControlBar) {
      const handleToggle = () => {
        setShowControlBar((prev) => !prev);
      };
      window.electronAPI.onToggleControlBar(handleToggle);
      return () => {
        window.electronAPI?.removeAllListeners?.('toggle-control-bar');
      };
    }
  }, []);

  // Maintain click-through behavior
  useEffect(() => {
    if (window.electronAPI?.setClickThrough) {
      const enablePassThrough = !showControlBar;
      window.electronAPI.setClickThrough(enablePassThrough);
    }
  }, [showControlBar]);

  // Notify main process when parameters change
  useEffect(() => {
    if (window.electronAPI?.updateParameters) {
      window.electronAPI.updateParameters({ sphere, cylinder, axis, distance });
    }
  }, [sphere, cylinder, axis, distance]);

  // Apply prescription whenever it changes
  useEffect(() => {
    if (!prescription) return;
    const eyeData =
      prescription[selectedEye] ||
      prescription.OD ||
      Object.values(prescription)[0];
    if (!eyeData) return;

    setSphere(eyeData.S ?? 0);
    setCylinder(eyeData.C ?? 0);
    setAxis(eyeData.Axis ?? 0);

    setExamStatus(`Using ${selectedEye} eye prescription`);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'optix.prescription',
        JSON.stringify({
          rx: prescription,
          selectedEye,
          timestamp: Date.now(),
        })
      );
    }
  }, [prescription, selectedEye]);

  useEffect(() => {
    let unsubscribe;

    const tryLoadLatest = async () => {
      if (prescription) return;
      try {
        let payload = null;
        if (window.electronAPI?.fetchLatestPrescription) {
          payload = await window.electronAPI.fetchLatestPrescription();
        } else {
          const resp = await fetch('http://localhost:8787/api/summary/latest');
          if (resp.ok) {
            payload = await resp.json();
          }
        }
        if (payload?.rx) {
          setPrescription(payload.rx);
          setSelectedEye('OD');
          setShowControlBar(true);
          setExamStatus('Loaded latest exam results');
        }
      } catch (error) {
        console.warn('Unable to load latest prescription:', error);
      }
    };

    tryLoadLatest();

    if (window.electronAPI?.onPrescriptionUpdate) {
      unsubscribe = window.electronAPI.onPrescriptionUpdate((payload) => {
        if (payload?.rx) {
          setPrescription(payload.rx);
          setSelectedEye('OD');
          setShowControlBar(true);
          setExamStatus('New eye exam results received');
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [prescription]);

  const handleToggleOverlay = () => {
    setOverlayVisible((prev) => !prev);
  };

  const launchEyeTest = async () => {
    setShowControlBar(true);
    setExamStatus('Launching eye exam...');
    try {
      if (window.electronAPI?.startEyeTest) {
        await window.electronAPI.startEyeTest();
        setExamStatus('Eye exam opened. Complete it, then load the latest result.');
      } else {
        window.open('http://localhost:5173', '_blank');
        setExamStatus('Eye exam opened in browser tab.');
      }
    } catch (error) {
      console.error('Failed to launch eye test:', error);
      setExamStatus('Failed to launch eye exam');
    }
  };

  const refreshPrescription = async () => {
    setExamStatus('Fetching latest exam result...');
    try {
      let payload = null;
      if (window.electronAPI?.fetchLatestPrescription) {
        payload = await window.electronAPI.fetchLatestPrescription();
      } else {
        const resp = await fetch('http://localhost:8787/api/summary/latest');
        if (resp.ok) {
          payload = await resp.json();
        }
      }

      if (payload?.rx) {
        setPrescription(payload.rx);
        setSelectedEye('OD');
        setExamStatus('Prescription loaded from latest exam');
      } else {
        setExamStatus('No completed exam results found');
      }
    } catch (error) {
      console.error('Failed to fetch prescription:', error);
      setExamStatus('Error fetching exam results');
    }
  };

  return (
    <div className="app-container">
      {overlayVisible && (
        <Overlay
          sphere={sphere}
          cylinder={cylinder}
          axis={axis}
          distance={distance}
        />
      )}

      {showControlBar && (
        <ControlBar
          sphere={sphere}
          cylinder={cylinder}
          axis={axis}
          distance={distance}
          setSphere={setSphere}
          setCylinder={setCylinder}
          setAxis={setAxis}
          setDistance={setDistance}
          overlayVisible={overlayVisible}
          onToggleOverlay={handleToggleOverlay}
          onClose={() => setShowControlBar(false)}
          onLaunchEyeTest={launchEyeTest}
          onRefreshPrescription={refreshPrescription}
          prescription={prescription}
          selectedEye={selectedEye}
          onSelectEye={setSelectedEye}
          examStatus={examStatus}
        />
      )}
    </div>
  );
}

export default App;

