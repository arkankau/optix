/**
 * Core types for Nearify Exam
 */

export type Eye = "OD" | "OS";
export type StepKind = "calibrate" | "sphere" | "jcc" | "balance" | "summary";
export type Lighting = "photopic" | "mesopic";
export type SessionState = "active" | "completed" | "aborted";

export interface Session {
  id: string;
  createdAt: string;
  deviceInfo: string;
  distanceCm: number;
  screenPpi: number;
  lighting: Lighting;
  state: SessionState;
}

export interface Rx {
  S: number;        // Sphere in diopters
  C: number;        // Cylinder in diopters
  Axis: number;     // Axis in degrees (0-180)
  VA_logMAR?: number;
  confidence?: number;
  eye: Eye;
}

export interface Event {
  t: number;
  step: StepKind;
  lettersShown?: string;
  speechText?: string;
  correct?: boolean;
  latencyMs?: number;
  params?: Record<string, any>;
}

export interface CalibrationData {
  pixelsPerCm: number;
  viewingDistanceCm: number;
  pixelsPerArcmin: number;
}

export interface TestResult {
  OD: Rx;
  OS: Rx;
  sessionId: string;
  completedAt: string;
}


