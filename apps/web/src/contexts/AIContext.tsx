import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';

interface AICommand {
  action: string;
  params?: Record<string, any>;
}

interface AIContextType {
  isAIActive: boolean;
  currentStage: string;
  startAI: () => void;
  stopAI: () => void;
  handleAICommand: (command: AICommand) => void;
  sendContextToAI: (context: Record<string, any>) => void;
}

const AIContext = createContext<AIContextType | null>(null);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
};

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const navigate = useNavigate();
  const { 
    stage, 
    setStage, 
    currentEye, 
    setCurrentEye,
    calibration,
    setCalibration,
  } = useTestStore();

  const [isAIActive, setIsAIActive] = useState(false);
  const [currentStage, setCurrentStage] = useState('home');

  useEffect(() => {
    // Sync current stage with test store
    setCurrentStage(stage);
  }, [stage]);

  const startAI = () => {
    console.log('🤖 AI Examiner activated');
    setIsAIActive(true);
  };

  const stopAI = () => {
    console.log('🤖 AI Examiner deactivated');
    setIsAIActive(false);
  };

  const handleAICommand = (command: AICommand) => {
    console.log('🤖 AI Command:', command);

    switch (command.action) {
      case 'start_calibration':
        setStage('calibration');
        navigate('/calibration');
        break;

      case 'update_card_width':
        if (calibration && command.params?.pixels) {
          setCalibration({
            ...calibration,
            cardWidthPx: command.params.pixels,
          });
        }
        break;

      case 'update_viewing_distance':
        if (calibration && command.params?.cm) {
          setCalibration({
            ...calibration,
            viewingDistanceCm: command.params.cm,
          });
        }
        break;

      case 'calibration_complete':
        setStage('sphere_od');
        navigate('/sphere');
        break;

      case 'start_sphere_test':
        const eye = command.params?.eye || 'OD';
        setCurrentEye(eye as 'OD' | 'OS');
        setStage(eye === 'OD' ? 'sphere_od' : 'sphere_os');
        navigate('/sphere');
        break;

      case 'change_eye':
        const nextEye = command.params?.eye || 'OS';
        setCurrentEye(nextEye as 'OD' | 'OS');
        setStage(nextEye === 'OD' ? 'sphere_od' : 'sphere_os');
        break;

      case 'sphere_complete':
        if (currentEye === 'OD') {
          // Move to left eye
          setCurrentEye('OS');
          setStage('sphere_os');
        } else {
          // Move to astigmatism test
          setStage('jcc_od');
          navigate('/jcc');
        }
        break;

      case 'start_astigmatism_test':
        setStage('jcc_od');
        navigate('/jcc');
        break;

      case 'astigmatism_complete':
        setStage('summary');
        navigate('/summary');
        break;

      case 'restart_exam':
        setStage('home');
        navigate('/');
        break;

      default:
        console.warn('Unknown AI command:', command.action);
    }
  };

  const sendContextToAI = (context: Record<string, any>) => {
    // This would send context to the AI agent
    // For now, we'll log it. In a real implementation,
    // this would communicate with the ElevenLabs API
    console.log('📤 Context sent to AI:', context);
  };

  return (
    <AIContext.Provider
      value={{
        isAIActive,
        currentStage,
        startAI,
        stopAI,
        handleAICommand,
        sendContextToAI,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}



