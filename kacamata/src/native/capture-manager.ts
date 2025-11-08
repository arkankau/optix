/**
 * Capture Manager: Desktop screen capture using native D3D11 Desktop Duplication API
 * Provides zero-copy GPU frame capture for real-time processing
 */

// Import native module
let nativeModule: any = null;
try {
  nativeModule = require('../../build/Release/desktop_duplication.node');
} catch (err) {
  console.warn('Native desktop duplication module not available, falling back to Electron capture');
}

export interface FrameData {
  data: Buffer;
  width: number;
  height: number;
  pitch: number;
  timestamp?: number;
}

export interface FrameInfo {
  width: number;
  height: number;
  refreshRate: number;
  frameCount: number;
}

export class CaptureManager {
  private isCapturing: boolean = false;
  private duplicator: any = null;
  private useNativeCapture: boolean = false;
  private outputIndex: number = 0;

  constructor(outputIndex: number = 0) {
    this.outputIndex = outputIndex;
    this.useNativeCapture = nativeModule !== null;
  }

  /**
   * Start capturing frames from the desktop
   * Uses native D3D11 Desktop Duplication API if available
   */
  async start(): Promise<boolean> {
    if (this.isCapturing) {
      return false;
    }

    if (this.useNativeCapture && nativeModule) {
      try {
        this.duplicator = new nativeModule.DesktopDuplicator();
        const initialized = this.duplicator.initialize(this.outputIndex);
        
        if (initialized) {
          this.isCapturing = true;
          console.log('Native desktop duplication started successfully');
          return true;
        } else {
          console.error('Failed to initialize native desktop duplication');
          this.useNativeCapture = false;
        }
      } catch (err) {
        console.error('Error starting native capture:', err);
        this.useNativeCapture = false;
      }
    }

    // Fallback: Use renderer process capture
    console.log('Using renderer process screen capture (fallback)');
    this.isCapturing = true;
    return true;
  }

  /**
   * Stop capturing frames
   */
  async stop(): Promise<void> {
    if (this.duplicator) {
      try {
        this.duplicator.release();
      } catch (err) {
        console.error('Error releasing duplicator:', err);
      }
      this.duplicator = null;
    }
    this.isCapturing = false;
  }

  /**
   * Capture a single frame
   * Returns null if no new frame is available
   */
  async getFrame(): Promise<FrameData | null> {
    if (!this.isCapturing) {
      return null;
    }

    if (this.useNativeCapture && this.duplicator) {
      try {
        const captured = this.duplicator.captureFrame();
        if (!captured) {
          // No new frame available
          return null;
        }

        // Get texture data
        const frameData = this.duplicator.getTexture();
        if (frameData) {
          return {
            data: frameData.data,
            width: frameData.width,
            height: frameData.height,
            pitch: frameData.pitch,
            timestamp: Date.now(),
          };
        }
      } catch (err) {
        console.error('Error capturing frame:', err);
        // Try to recover
        await this.stop();
        await this.start();
      }
    }

    // Fallback: Frame capture is handled in renderer process
    return null;
  }

  /**
   * Get information about the current capture session
   */
  getFrameInfo(): FrameInfo | null {
    if (this.useNativeCapture && this.duplicator) {
      try {
        return this.duplicator.getFrameInfo();
      } catch (err) {
        console.error('Error getting frame info:', err);
      }
    }
    return null;
  }

  /**
   * Check if using native capture
   */
  isUsingNativeCapture(): boolean {
    return this.useNativeCapture && this.duplicator !== null;
  }

  /**
   * Get the native D3D11 texture handle for GPU-to-GPU transfer
   * This avoids CPU roundtrip for maximum performance
   */
  getNativeTextureHandle(): any {
    if (this.useNativeCapture && this.duplicator) {
      // This would return the actual D3D11 texture pointer
      // For sharing between processes or with WebGPU
      return this.duplicator.getTextureHandle?.();
    }
    return null;
  }

  cleanup(): void {
    this.stop();
  }
}

