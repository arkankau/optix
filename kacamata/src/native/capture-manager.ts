/**
 * Capture Manager: Desktop screen capture
 * For MVP, capture is handled in renderer process via desktopCapturer
 * Future: Native D3D11 Desktop Duplication (Windows) / CGDisplayStream (macOS)
 */
export class CaptureManager {
  private isCapturing: boolean = false;

  async start(): Promise<boolean> {
    if (this.isCapturing) {
      return false;
    }
    this.isCapturing = true;
    return true;
  }

  async stop(): Promise<void> {
    this.isCapturing = false;
  }

  async getFrame(): Promise<{ buffer: ArrayBuffer; width: number; height: number } | null> {
    // Frame capture is handled in renderer process
    return null;
  }

  cleanup(): void {
    this.stop();
  }
}

