/**
 * useTestProgression Hook
 * 
 * Listens to xAI analysis results and ElevenLabs agent messages
 * to automatically progress through test stages
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';

interface ProgressionConfig {
  /**
   * Current stage of the test
   */
  currentStage: string;
  
  /**
   * Callback when xAI recommends completion
   */
  onComplete?: () => void;
  
  /**
   * Override automatic navigation (for custom handling)
   */
  manualControl?: boolean;
}

export function useTestProgression(config: ProgressionConfig) {
  const navigate = useNavigate();
  const { stage, currentEye, setStage, setCurrentEye } = useTestStore();

  useEffect(() => {
    // Global event listener for test progression signals
    const handleProgressionEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;

      console.log('🎯 Progression event:', { type, data, currentStage: config.currentStage });

      // Don't auto-progress if manual control is enabled
      if (config.manualControl) {
        console.log('⏸️ Manual control enabled, skipping auto-progression');
        return;
      }

      switch (type) {
        case 'calibration_complete':
          if (config.currentStage === 'calibration') {
            console.log('✅ Calibration complete - advancing to sphere test (OD)');
            setCurrentEye('OD');
            setStage('sphere_od');
            setTimeout(() => navigate('/sphere'), 500);
          }
          break;

        case 'sphere_od_complete':
          // Check against actual store stage, not config (which is static)
          if (stage === 'sphere_od' || config.currentStage === 'sphere_od') {
            console.log('✅ Right eye sphere complete - advancing to left eye (OS)');
            setCurrentEye('OS');
            setStage('sphere_os');
            // Stay on same page, just switch eye
            if (config.onComplete) config.onComplete();
          }
          break;

        case 'sphere_os_complete':
          // Check against actual store stage, not config (which is static)
          if (stage === 'sphere_os' || config.currentStage === 'sphere_os') {
            console.log('✅ Left eye sphere complete - advancing to JCC astigmatism test (OD)');
            setCurrentEye('OD');
            setStage('jcc_od');
            setTimeout(() => navigate('/jcc'), 500);
          }
          break;

        case 'jcc_od_complete':
          // Check against actual store stage, not config (which is static)
          if (stage === 'jcc_od' || config.currentStage === 'jcc_od') {
            console.log('✅ Right eye JCC complete - advancing to left eye (OS)');
            setCurrentEye('OS');
            setStage('jcc_os');
            // Stay on same page, just switch eye
            if (config.onComplete) config.onComplete();
          }
          break;

        case 'jcc_os_complete':
          // Check against actual store stage, not config (which is static)
          if (stage === 'jcc_os' || config.currentStage === 'jcc_os') {
            console.log('✅ Left eye JCC complete - advancing to summary');
            setStage('complete');
            setTimeout(() => navigate('/summary'), 500);
          }
          break;

        default:
          console.log('⚠️ Unknown progression event type:', type);
      }
    };

    // @ts-ignore - CustomEvent typing
    window.addEventListener('test-progression', handleProgressionEvent);

    return () => {
      // @ts-ignore
      window.removeEventListener('test-progression', handleProgressionEvent);
    };
  }, [config, navigate, setStage, setCurrentEye, stage]);
}

/**
 * Emit a test progression event
 * Call this when a test stage is complete
 */
export function emitProgressionEvent(type: string, data?: any) {
  console.log('📡 Emitting progression event:', { type, data });
  
  const event = new CustomEvent('test-progression', {
    detail: { type, data },
  });
  
  window.dispatchEvent(event);
}

/**
 * Helper functions to emit specific progression events
 */
export const ProgressionEvents = {
  calibrationComplete: () => emitProgressionEvent('calibration_complete'),
  sphereODComplete: () => emitProgressionEvent('sphere_od_complete'),
  sphereOSComplete: () => emitProgressionEvent('sphere_os_complete'),
  jccODComplete: () => emitProgressionEvent('jcc_od_complete'),
  jccOSComplete: () => emitProgressionEvent('jcc_os_complete'),
};

