/**
 * Global test state management using Zustand
 */

import { create } from 'zustand';

export type Eye = 'OD' | 'OS';
export type Stage = 'idle' | 'calibration' | 'sphere_od' | 'sphere_os' | 'jcc_od' | 'jcc_os' | 'complete';

interface CalibrationData {
  pixelsPerCm: number;
  viewingDistanceCm: number;
  pixelsPerArcmin: number;
}

interface PatientTranscription {
  timestamp: number;
  text: string;
  eye: Eye;
  line: number;
  stage: string;
}

interface XAIAnalysis {
  timestamp: number;
  patientSpeech: string;
  expectedLetters: string;
  correct: boolean;
  confidence: number;
  suggestedDiopter: number;
  recommendation: string;
  reasoning: string;
  eye: Eye;
  line: number;
}

interface TestState {
  // Session
  sessionId: string | null;
  stage: Stage;
  currentEye: Eye;

  // Calibration
  calibrated: boolean;
  calibration: CalibrationData | null;

  // Staircase state
  sphereState: Record<Eye, any>;
  sphereResults: Record<Eye, { threshold: number; sphere: number; confidence: number } | null>;

  // JCC state
  jccState: Record<Eye, any>;
  jccResults: Record<Eye, { axis: number; cyl: number; confidence: number } | null>;

  // Voice
  isListening: boolean;
  lastTranscript: string;

  // Patient transcriptions and AI analysis
  patientTranscriptions: PatientTranscription[];
  xaiAnalyses: XAIAnalysis[];
  currentAnalysis: XAIAnalysis | null;

  // UI state
  showGrokHint: boolean;
  grokMessage: string;
  elevenLabsReady: boolean;

  // Actions
  setSessionId: (id: string) => void;
  setStage: (stage: Stage) => void;
  setCurrentEye: (eye: Eye) => void;
  setCalibration: (data: CalibrationData) => void;
  setSphereState: (eye: Eye, state: any) => void;
  setSphereResult: (eye: Eye, result: any) => void;
  setJccState: (eye: Eye, state: any) => void;
  setJccResult: (eye: Eye, result: any) => void;
  setListening: (listening: boolean) => void;
  setTranscript: (text: string) => void;
  addPatientTranscription: (transcription: PatientTranscription) => void;
  addXAIAnalysis: (analysis: XAIAnalysis) => void;
  setCurrentAnalysis: (analysis: XAIAnalysis | null) => void;
  showGrok: (message: string) => void;
  hideGrok: () => void;
  setElevenLabsReady: (ready: boolean) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  stage: 'idle' as Stage,
  currentEye: 'OD' as Eye,
  calibrated: false,
  calibration: null,
  sphereState: { OD: null, OS: null },
  sphereResults: { OD: null, OS: null },
  jccState: { OD: null, OS: null },
  jccResults: { OD: null, OS: null },
  isListening: false,
  lastTranscript: '',
  patientTranscriptions: [] as PatientTranscription[],
  xaiAnalyses: [] as XAIAnalysis[],
  currentAnalysis: null as XAIAnalysis | null,
  showGrokHint: false,
  grokMessage: '',
  elevenLabsReady: false,
};

export const useTestStore = create<TestState>((set) => ({
  ...initialState,

  setSessionId: (id) => set({ sessionId: id }),
  setStage: (stage) => set({ stage }),
  setCurrentEye: (eye) => set({ currentEye: eye }),
  
  setCalibration: (data) => set({ 
    calibration: data, 
    calibrated: true,
    stage: 'sphere_od',
  }),

  setSphereState: (eye, state) => 
    set((prev) => ({ 
      sphereState: { ...prev.sphereState, [eye]: state } 
    })),

  setSphereResult: (eye, result) => 
    set((prev) => ({ 
      sphereResults: { ...prev.sphereResults, [eye]: result } 
    })),

  setJccState: (eye, state) => 
    set((prev) => ({ 
      jccState: { ...prev.jccState, [eye]: state } 
    })),

  setJccResult: (eye, result) => 
    set((prev) => ({ 
      jccResults: { ...prev.jccResults, [eye]: result } 
    })),

  setListening: (listening) => set({ isListening: listening }),
  setTranscript: (text) => set({ lastTranscript: text }),

  addPatientTranscription: (transcription) =>
    set((prev) => ({
      patientTranscriptions: [...prev.patientTranscriptions, transcription],
    })),

  addXAIAnalysis: (analysis) =>
    set((prev) => ({
      xaiAnalyses: [...prev.xaiAnalyses, analysis],
      currentAnalysis: analysis,
    })),

  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

  showGrok: (message) => set({ showGrokHint: true, grokMessage: message }),
  hideGrok: () => set({ showGrokHint: false, grokMessage: '' }),

  setElevenLabsReady: (ready) => set({ elevenLabsReady: ready }),

  reset: () => set(initialState),
}));

