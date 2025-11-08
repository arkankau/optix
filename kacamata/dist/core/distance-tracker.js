"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistanceTracker = void 0;
/**
 * Distance Tracker: Webcam-based face distance estimation
 * Uses MediaPipe Face Mesh (via renderer) or native implementation
 */
class DistanceTracker {
    constructor() {
        this.isTracking = false;
        this.currentDistance = 60; // cm, default
        this.smoothingAlpha = 0.2; // EMA smoothing factor
    }
    async start() {
        if (this.isTracking) {
            return false;
        }
        // Distance tracking is handled in renderer with MediaPipe
        // This class just manages state
        this.isTracking = true;
        return true;
    }
    async stop() {
        this.isTracking = false;
    }
    updateDistance(distance_cm) {
        // Exponential moving average smoothing
        this.currentDistance = this.smoothingAlpha * distance_cm + (1 - this.smoothingAlpha) * this.currentDistance;
    }
    getCurrentDistance() {
        return this.currentDistance;
    }
    cleanup() {
        this.stop();
    }
}
exports.DistanceTracker = DistanceTracker;
