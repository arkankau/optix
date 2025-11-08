"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeAdapter = void 0;
const wavefront_engine_1 = require("./wavefront-engine");
const wiener_engine_1 = require("./wiener-engine");
const lfd_lut_1 = require("./lfd-lut");
/**
 * Runtime Adapter: Manages distance smoothing, model refresh, and pipeline selection
 */
class RuntimeAdapter {
    constructor() {
        this.currentDistance = 60; // cm
        this.smoothedDistance = 60;
        this.smoothingAlpha = 0.2; // EMA smoothing
        this.lastUpdateTime = 0;
        this.updateInterval = 300; // ms
        this.distanceThreshold = 2; // cm
        this.currentModels = null;
        this.currentParams = null;
    }
    /**
     * Update distance with EMA smoothing
     */
    updateDistance(distance_cm, skipSmoothing = false) {
        this.currentDistance = distance_cm;
        if (skipSmoothing) {
            this.smoothedDistance = distance_cm;
            return;
        }
        this.smoothedDistance =
            this.smoothingAlpha * distance_cm + (1 - this.smoothingAlpha) * this.smoothedDistance;
    }
    /**
     * Get smoothed distance
     */
    getDistance() {
        return this.smoothedDistance;
    }
    /**
     * Check if models need refresh and update if needed
     */
    updateModelsIfNeeded(params, lfd_inspired = false) {
        const now = Date.now();
        const distanceDelta = Math.abs(this.smoothedDistance - (this.currentParams?.distance_cm || 60));
        const timeDelta = now - this.lastUpdateTime;
        // Refresh if:
        // 1. First time
        // 2. Distance changed significantly (>2cm)
        // 3. Enough time passed (>300ms)
        // 4. Parameters changed
        const needsRefresh = !this.currentModels ||
            distanceDelta > this.distanceThreshold ||
            timeDelta > this.updateInterval ||
            this.paramsChanged(params);
        if (needsRefresh) {
            this.currentParams = { ...params, distance_cm: this.smoothedDistance };
            this.currentModels = this.buildModels(this.currentParams, lfd_inspired);
            this.lastUpdateTime = now;
        }
        return this.currentModels;
    }
    /**
     * Check if parameters changed
     */
    paramsChanged(newParams) {
        if (!this.currentParams)
            return true;
        return (Math.abs(newParams.sphere_D - this.currentParams.sphere_D) > 0.01 ||
            Math.abs((newParams.cylinder_D || 0) - (this.currentParams.cylinder_D || 0)) > 0.01 ||
            Math.abs((newParams.axis_deg || 0) - (this.currentParams.axis_deg || 0)) > 1 ||
            Math.abs(newParams.display_ppi - this.currentParams.display_ppi) > 1 ||
            Math.abs((newParams.display_width_px || 0) - (this.currentParams.display_width_px || 0)) > 1 ||
            Math.abs((newParams.display_height_px || 0) - (this.currentParams.display_height_px || 0)) > 1 ||
            Math.abs((newParams.display_diag_in || 0) - (this.currentParams.display_diag_in || 0)) > 0.1);
    }
    /**
     * Build vision models (PSF + optional LUT)
     */
    buildModels(params, lfd_inspired) {
        // Compute wavefront
        const wavefront = wavefront_engine_1.WavefrontEngine.computeWavefront(params);
        // Compute PSF (pass display_ppi directly)
        const psf = wavefront_engine_1.WavefrontEngine.wavefrontToPSF(wavefront, params);
        if (psf.is_identity) {
            return {
                psf,
                wavefront,
                lut: undefined,
                last_updated: Date.now(),
            };
        }
        // Generate separable inverse kernels if applicable
        // Note: Kernels are generated with a base lambda, but lambda can be adjusted
        // at runtime via the processFrame parameter for fine-tuning
        if (psf.separable) {
            // Use adaptive lambda - ensure it's not too small to prevent artifacts
            // Default lambda of 0.02-0.05 works better than 0.008 for preventing over-amplification
            // Lower lambda = sharper but more artifacts, higher lambda = smoother but less correction
            const baseLambda = 0.02; // More conservative default
            const adaptiveLambda = Math.max(0.01, Math.min(0.1, baseLambda));
            const { horiz, vert } = wiener_engine_1.WienerEngine.generateSeparableInverse(psf, adaptiveLambda);
            psf.inv_horiz = horiz;
            psf.inv_vert = vert;
            // Store the lambda used for this kernel set for reference
            psf.generated_lambda = adaptiveLambda;
        }
        // Build LUT if LFD-inspired mode
        let lut;
        if (lfd_inspired) {
            lut = lfd_lut_1.LFDLUTEngine.buildLUT(wavefront, params);
        }
        return {
            psf,
            wavefront,
            lut,
            last_updated: Date.now(),
        };
    }
    /**
     * Get current models (cached)
     */
    getModels() {
        return this.currentModels;
    }
}
exports.RuntimeAdapter = RuntimeAdapter;
