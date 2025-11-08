/**
 * Distance Tracker: Webcam-based face distance estimation
 * Uses MediaPipe Face Mesh (via renderer) or native implementation
 */
export class DistanceTracker {
  private isTracking: boolean = false;
  private currentDistance: number = 60; // cm, default
  private smoothingAlpha: number = 0.2; // EMA smoothing factor

  async start(): Promise<boolean> {
    if (this.isTracking) {
      return false;
    }

    // Distance tracking is handled in renderer with MediaPipe
    // This class just manages state
    this.isTracking = true;
    return true;
  }

  async stop(): Promise<void> {
    this.isTracking = false;
  }

  updateDistance(distance_cm: number): void {
    // Exponential moving average smoothing
    this.currentDistance = this.smoothingAlpha * distance_cm + (1 - this.smoothingAlpha) * this.currentDistance;
  }

  getCurrentDistance(): number {
    return this.currentDistance;
  }

  cleanup(): void {
    this.stop();
  }
}

