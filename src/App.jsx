import { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import ControlBar from './components/ControlBar';
import './App.css';

function App() {
  // Optical parameters state
  const [sphere, setSphere] = useState(0);
  const [cylinder, setCylinder] = useState(0);
  const [axis, setAxis] = useState(0);

  // UI state
  const [showControlBar, setShowControlBar] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  // Listen for keyboard shortcut from Electron main process
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onToggleControlBar(() => {
        setShowControlBar(prev => !prev);
      });
    }

    // Cleanup
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('toggle-control-bar');
      }
    };
  }, []);

  // Update click-through based on control bar visibility
  useEffect(() => {
    if (window.electronAPI) {
      // When control bar is visible, disable click-through
      // When control bar is hidden, enable click-through
      window.electronAPI.setClickThrough(!showControlBar);
    }
  }, [showControlBar]);

  // Notify main process when parameters change
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.updateParameters({ sphere, cylinder, axis });
    }
  }, [sphere, cylinder, axis]);

  const handleToggleOverlay = () => {
    setOverlayVisible(prev => !prev);
  };

  return (
    <div className="app-container">
      {overlayVisible && (
        <Overlay
          sphere={sphere}
          cylinder={cylinder}
          axis={axis}
        />
      )}

      {showControlBar && (
        <ControlBar
          sphere={sphere}
          cylinder={cylinder}
          axis={axis}
          setSphere={setSphere}
          setCylinder={setCylinder}
          setAxis={setAxis}
          overlayVisible={overlayVisible}
          onToggleOverlay={handleToggleOverlay}
          onClose={() => setShowControlBar(false)}
        />
      )}
    </div>
  );
}

export default App;

