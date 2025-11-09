import { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import ControlBar from './components/ControlBar';
import './App.css';

function App() {
  // Optical parameters state
  const [sphere, setSphere] = useState(2.0);
  const [cylinder, setCylinder] = useState(0.75);
  const [axis, setAxis] = useState(90);
  const [distance, setDistance] = useState(60); // Added distance parameter in cm

  // UI state
  const [showControlBar, setShowControlBar] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  // Listen for keyboard shortcut from Electron main process
  useEffect(() => {
    console.log('🚀 App.jsx useEffect running - checking electronAPI...');
    console.log('🔍 window.electronAPI exists?', !!window.electronAPI);
    console.log('🔍 window.electronAPI.onToggleControlBar exists?', !!window.electronAPI?.onToggleControlBar);
    
    if (window.electronAPI) {
      console.log('✅ Setting up keyboard shortcut listener');
      
      const handleToggle = () => {
        console.log('🎮 Toggle control bar triggered from shortcut');
        setShowControlBar(prev => {
          const newState = !prev;
          console.log(`Control bar: ${prev ? 'hiding' : 'showing'} -> ${newState}`);
          return newState;
        });
      };
      
      window.electronAPI.onToggleControlBar(handleToggle);
      
      console.log('✅ Shortcut listener registered successfully');
    } else {
      console.warn('⚠️ electronAPI not available - running in browser mode?');
    }

    // Cleanup
    return () => {
      if (window.electronAPI && window.electronAPI.removeAllListeners) {
        console.log('🧹 Cleaning up shortcut listener');
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
      axis: axis.toFixed(0) + '°',
      distance: distance + ' cm'
    });
    
    if (window.electronAPI) {
      window.electronAPI.updateParameters({ sphere, cylinder, axis, distance });
    }
  }, [sphere, cylinder, axis, distance]);

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
        />
      )}
    </div>
  );
}

export default App;

