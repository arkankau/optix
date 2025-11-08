/**
 * Myopia Pre-Correction and Image Adjustment System
 * 
 * This module implements optical calculations and image processing kernels
 * to adjust images for myopia (nearsightedness) correction, allowing people
 * with myopia to view images more clearly without glasses.
 * 
 * References: Pre-corrections for refractive errors in display systems
 */

// ========== OPTICAL CALCULATIONS ==========

/**
 * Calculate the effective power needed for myopia correction
 * 
 * @param {number} sphere - Sphere power in diopters (negative for myopia)
 * @param {number} cylinder - Cylinder power in diopters (for astigmatism)
 * @param {number} axis - Axis of astigmatism in degrees (0-180)
 * @returns {Object} Correction powers for horizontal and vertical meridians
 */
function calculateCorrectionPower(sphere, cylinder, axis = 0) {
    // Convert axis to radians
    const axisRad = (axis * Math.PI) / 180;
    
    // Calculate power in principal meridians
    const power1 = sphere;
    const power2 = sphere + cylinder;
    
    // Calculate powers in horizontal and vertical directions
    const powerH = power1 * Math.cos(axisRad) ** 2 + power2 * Math.sin(axisRad) ** 2;
    const powerV = power1 * Math.sin(axisRad) ** 2 + power2 * Math.cos(axisRad) ** 2;
    
    return {
        horizontal: powerH,
        vertical: powerV,
        sphere: sphere,
        cylinder: cylinder,
        axis: axis
    };
}

/**
 * Calculate blur radius based on viewing distance and refractive error
 * 
 * The blur circle diameter (d) can be approximated by:
 * d = D * |1/f - 1/u - 1/v|
 * where D is pupil diameter, f is focal length, u is object distance, v is image distance
 * 
 * Simplified for screen viewing:
 * blur_radius ≈ (pupil_diameter / 2) * |diopters| * (distance_meters)
 * 
 * @param {number} sphere - Sphere power in diopters (negative for myopia)
 * @param {number} distanceMeters - Distance to screen in meters
 * @param {number} pupilDiameter - Pupil diameter in mm (default 4mm for typical indoor lighting)
 * @returns {number} Blur radius in pixels (assuming 96 DPI)
 */
function calculateBlurRadius(sphere, distanceMeters, pupilDiameter = 4) {
    // Convert diopters to blur in meters
    const dioptersAbs = Math.abs(sphere);
    
    // Calculate blur circle diameter in mm
    const blurDiameterMm = (pupilDiameter / 2) * dioptersAbs * distanceMeters * 1000;
    
    // Convert mm to pixels (assuming 96 DPI, which is ~0.265 mm/pixel)
    const mmPerPixel = 0.265;
    const blurRadiusPx = blurDiameterMm / mmPerPixel / 2;
    
    return blurRadiusPx;
}

/**
 * Calculate the defocus blur for a given refractive error and distance
 * Using the equation: Blur = (pupil_size * |D| * distance) / focal_length
 * 
 * @param {number} sphere - Sphere power in diopters
 * @param {number} cylinder - Cylinder power in diopters
 * @param {number} distanceCm - Distance to screen in centimeters
 * @param {number} pupilDiameterMm - Pupil diameter in mm
 * @returns {Object} Blur parameters for both meridians
 */
function calculateDefocusBlur(sphere, cylinder, distanceCm, pupilDiameterMm = 4) {
    const distanceM = distanceCm / 100;
    
    // Calculate focal length from diopters: f = 1/D (in meters)
    const focalLength1 = 1 / Math.abs(sphere);
    const focalLength2 = cylinder !== 0 ? 1 / Math.abs(sphere + cylinder) : focalLength1;
    
    // Blur diameter = (pupil * distance) / |1/distance - diopter|
    const blurH = (pupilDiameterMm * Math.abs(sphere) * distanceM);
    const blurV = (pupilDiameterMm * Math.abs(sphere + cylinder) * distanceM);
    
    return {
        horizontal: blurH,
        vertical: blurV,
        averageBlur: (blurH + blurV) / 2
    };
}

// ========== KERNEL GENERATION ==========

/**
 * Generate a Gaussian blur kernel for simulating defocus
 * 
 * Gaussian function: G(x,y) = (1/(2πσ²)) * exp(-(x²+y²)/(2σ²))
 * 
 * @param {number} sigma - Standard deviation (related to blur radius)
 * @param {number} size - Kernel size (should be odd, e.g., 5, 7, 9)
 * @returns {Array<Array<number>>} 2D Gaussian kernel
 */
function generateGaussianKernel(sigma, size = null) {
    // Auto-calculate size if not provided
    if (size === null) {
        size = Math.ceil(sigma * 6) | 1; // Ensure odd number
        if (size < 3) size = 3;
    }
    
    const kernel = [];
    const center = Math.floor(size / 2);
    let sum = 0;
    
    // Generate Gaussian values
    for (let y = 0; y < size; y++) {
        kernel[y] = [];
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            kernel[y][x] = value;
            sum += value;
        }
    }
    
    // Normalize kernel so sum = 1
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            kernel[y][x] /= sum;
        }
    }
    
    return kernel;
}

/**
 * Generate an anisotropic Gaussian kernel for astigmatism correction
 * 
 * @param {number} sigmaH - Horizontal blur standard deviation
 * @param {number} sigmaV - Vertical blur standard deviation
 * @param {number} angle - Rotation angle in radians
 * @param {number} size - Kernel size
 * @returns {Array<Array<number>>} 2D anisotropic Gaussian kernel
 */
function generateAnisotropicKernel(sigmaH, sigmaV, angle = 0, size = null) {
    if (size === null) {
        size = Math.ceil(Math.max(sigmaH, sigmaV) * 6) | 1;
        if (size < 3) size = 3;
    }
    
    const kernel = [];
    const center = Math.floor(size / 2);
    let sum = 0;
    
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);
    
    for (let y = 0; y < size; y++) {
        kernel[y] = [];
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            
            // Rotate coordinates
            const xr = dx * cos_a - dy * sin_a;
            const yr = dx * sin_a + dy * cos_a;
            
            // Apply anisotropic Gaussian
            const value = Math.exp(-((xr * xr) / (2 * sigmaH * sigmaH) + 
                                     (yr * yr) / (2 * sigmaV * sigmaV)));
            kernel[y][x] = value;
            sum += value;
        }
    }
    
    // Normalize
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            kernel[y][x] /= sum;
        }
    }
    
    return kernel;
}

/**
 * Generate a point spread function (PSF) kernel for optical defocus
 * Using a pillbox (circular) PSF model
 * 
 * @param {number} radius - Blur radius in pixels
 * @returns {Array<Array<number>>} Circular PSF kernel
 */
function generateCircularPSF(radius) {
    const size = Math.ceil(radius * 2) + 1;
    if (size < 3) return [[1]];
    
    const kernel = [];
    const center = Math.floor(size / 2);
    let sum = 0;
    
    for (let y = 0; y < size; y++) {
        kernel[y] = [];
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Circular aperture (pillbox function)
            const value = distance <= radius ? 1 : 0;
            kernel[y][x] = value;
            sum += value;
        }
    }
    
    // Normalize
    if (sum > 0) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
    }
    
    return kernel;
}

// ========== PRE-CORRECTION CALCULATIONS ==========

/**
 * Calculate the inverse pre-correction kernel
 * This kernel, when applied to an image, will pre-distort it so that
 * a myopic viewer perceives it as sharp
 * 
 * @param {number} sphere - Sphere power in diopters
 * @param {number} cylinder - Cylinder power in diopters  
 * @param {number} distanceCm - Viewing distance in cm
 * @param {number} axis - Astigmatism axis in degrees
 * @returns {Object} Pre-correction parameters and kernels
 */
function calculatePreCorrection(sphere, cylinder = 0, distanceCm = 60, axis = 0) {
    // Calculate blur parameters
    const blurParams = calculateDefocusBlur(sphere, cylinder, distanceCm);
    const blurRadius = calculateBlurRadius(sphere, distanceCm / 100);
    
    // Convert blur to sigma for Gaussian kernel
    // Relationship: radius ≈ 2.5 * sigma for Gaussian
    const sigmaH = blurParams.horizontal / 2.5;
    const sigmaV = blurParams.vertical / 2.5;
    
    // Generate forward blur kernel (simulates myopia)
    let forwardKernel;
    if (cylinder !== 0) {
        const angleRad = (axis * Math.PI) / 180;
        forwardKernel = generateAnisotropicKernel(sigmaH, sigmaV, angleRad);
    } else {
        forwardKernel = generateGaussianKernel(sigmaH);
    }
    
    // For pre-correction, we need the inverse operation
    // In practice, this is approximated by sharpening
    const sharpenKernel = generateSharpeningKernel(blurRadius);
    
    return {
        sphere: sphere,
        cylinder: cylinder,
        distance: distanceCm,
        axis: axis,
        blurRadius: blurRadius,
        blurParams: blurParams,
        forwardKernel: forwardKernel,
        preCorrectionKernel: sharpenKernel,
        sigmaH: sigmaH,
        sigmaV: sigmaV
    };
}

/**
 * Generate an unsharp masking kernel for pre-correction
 * This approximates the inverse of blur
 * 
 * @param {number} amount - Sharpening amount (proportional to blur correction needed)
 * @returns {Array<Array<number>>} Sharpening kernel
 */
function generateSharpeningKernel(amount) {
    // Unsharp mask: Original + amount * (Original - Blurred)
    // Kernel representation: center weighted, negative surround
    
    const strength = Math.min(amount / 5, 2); // Scale and limit strength
    
    // 3x3 Laplacian-based sharpening kernel
    const kernel = [
        [0, -strength, 0],
        [-strength, 1 + 4 * strength, -strength],
        [0, -strength, 0]
    ];
    
    return kernel;
}

/**
 * Generate a Wiener deconvolution approximation for inverse filtering
 * 
 * @param {Array<Array<number>>} blurKernel - The forward blur kernel
 * @param {number} noiseLevel - Regularization parameter (0.01 - 0.1)
 * @returns {Array<Array<number>>} Approximate inverse kernel
 */
function generateInverseKernel(blurKernel, noiseLevel = 0.01) {
    // Simple inverse approximation using reciprocal
    // Full Wiener deconvolution requires frequency domain processing
    const size = blurKernel.length;
    const center = Math.floor(size / 2);
    const inverseKernel = [];
    
    // Get center value
    const centerValue = blurKernel[center][center];
    
    for (let y = 0; y < size; y++) {
        inverseKernel[y] = [];
        for (let x = 0; x < size; x++) {
            if (x === center && y === center) {
                // Amplify center
                inverseKernel[y][x] = 2 + noiseLevel;
            } else {
                // Invert surround
                const value = blurKernel[y][x];
                inverseKernel[y][x] = -value / (centerValue + noiseLevel);
            }
        }
    }
    
    return inverseKernel;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Apply a convolution kernel to image data
 * Note: This is a reference implementation. For actual image processing,
 * use Canvas API or WebGL for better performance
 * 
 * @param {ImageData} imageData - Input image data
 * @param {Array<Array<number>>} kernel - Convolution kernel
 * @returns {ImageData} Filtered image data
 */
function applyKernel(imageData, kernel) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);
    
    const output = new ImageData(width, height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            
            // Apply kernel
            for (let ky = 0; ky < kSize; ky++) {
                for (let kx = 0; kx < kSize; kx++) {
                    const px = Math.min(Math.max(x + kx - kHalf, 0), width - 1);
                    const py = Math.min(Math.max(y + ky - kHalf, 0), height - 1);
                    const idx = (py * width + px) * 4;
                    const k = kernel[ky][kx];
                    
                    r += data[idx] * k;
                    g += data[idx + 1] * k;
                    b += data[idx + 2] * k;
                }
            }
            
            const idx = (y * width + x) * 4;
            output.data[idx] = Math.min(Math.max(r, 0), 255);
            output.data[idx + 1] = Math.min(Math.max(g, 0), 255);
            output.data[idx + 2] = Math.min(Math.max(b, 0), 255);
            output.data[idx + 3] = data[idx + 3]; // Alpha channel
        }
    }
    
    return output;
}

/**
 * Format kernel for display
 * 
 * @param {Array<Array<number>>} kernel - Convolution kernel
 * @returns {string} Formatted kernel string
 */
function formatKernel(kernel) {
    let output = '';
    for (let row of kernel) {
        output += row.map(v => v.toFixed(4).padStart(8)).join(' ') + '\n';
    }
    return output;
}

/**
 * Calculate equivalent sphere power (spherical equivalent)
 * SE = Sphere + (Cylinder / 2)
 * 
 * @param {number} sphere - Sphere power
 * @param {number} cylinder - Cylinder power
 * @returns {number} Spherical equivalent
 */
function calculateSphericalEquivalent(sphere, cylinder) {
    return sphere + (cylinder / 2);
}

// ========== EXPORTS AND EXAMPLES ==========

// Example usage:
const exampleUsage = {
    // Mild myopia: -2.00 D, viewing at 60cm
    mild: calculatePreCorrection(-2.0, 0, 60),
    
    // Moderate myopia with astigmatism: -4.50 D, -1.25 D cyl at 90°
    moderate: calculatePreCorrection(-4.5, -1.25, 60, 90),
    
    // Severe myopia: -7.00 D
    severe: calculatePreCorrection(-7.0, 0, 50)
};

// Module exports (for Node.js/CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Optical calculations
        calculateCorrectionPower,
        calculateBlurRadius,
        calculateDefocusBlur,
        calculateSphericalEquivalent,
        
        // Kernel generation
        generateGaussianKernel,
        generateAnisotropicKernel,
        generateCircularPSF,
        generateSharpeningKernel,
        generateInverseKernel,
        
        // Pre-correction
        calculatePreCorrection,
        
        // Utilities
        applyKernel,
        formatKernel,
        
        // Examples
        exampleUsage
    };
}

// Browser exports
if (typeof window !== 'undefined') {
    window.MyopiaCorrection = {
        calculateCorrectionPower,
        calculateBlurRadius,
        calculateDefocusBlur,
        calculateSphericalEquivalent,
        generateGaussianKernel,
        generateAnisotropicKernel,
        generateCircularPSF,
        generateSharpeningKernel,
        generateInverseKernel,
        calculatePreCorrection,
        applyKernel,
        formatKernel,
        exampleUsage
    };
}