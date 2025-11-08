"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptureManager = void 0;
/**
 * Capture Manager: Desktop screen capture
 * For MVP, capture is handled in renderer process via desktopCapturer
 * Future: Native D3D11 Desktop Duplication (Windows) / CGDisplayStream (macOS)
 */
class CaptureManager {
    constructor() {
        this.isCapturing = false;
    }
    async start() {
        if (this.isCapturing) {
            return false;
        }
        this.isCapturing = true;
        return true;
    }
    async stop() {
        this.isCapturing = false;
    }
    async getFrame() {
        // Frame capture is handled in renderer process
        return null;
    }
    cleanup() {
        this.stop();
    }
}
exports.CaptureManager = CaptureManager;
