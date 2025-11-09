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
      console.log('Setting up keyboard shortcut listener');
      window.electronAPI.onToggleControlBar(() => {
        console.log('🎮 Toggle control bar triggered from shortcut');
        setShowControlBar(prev => {
          console.log(`Control bar: ${prev ? 'hiding' : 'showing'}`);
          return !prev;
        });
      });
    } else {
      console.warn('electronAPI not available - running in browser mode?');
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
      // Always maintain click-through for transparent areas
      window.electronAPI.setClickThrough(true);
      console.log(`🖱️ Control bar ${showControlBar ? 'visible' : 'hidden'} - click-through maintained`);
    }
  }, [showControlBar]);

  // Notify main process when parameters change and log to console
  useEffect(() => {
    console.log('📐 Parameters changed:', {
      sphere: sphere.toFixed(2),
      cylinder: cylinder.toFixed(2),
      axis: axis.toFixed(0) + '°'
    });
    
    if (window.electronAPI) {
      window.electronAPI.updateParameters({ sphere, cylinder, axis });
    }
  }, [sphere, cylinder, axis]);

  const handleToggleOverlay = () => {
    setOverlayVisible(prev => {
      const newValue = !prev;
      console.log(`👁️ Overlay visibility toggled: ${newValue ? 'VISIBLE' : 'HIDDEN'}`);
      return newValue;
    });
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

