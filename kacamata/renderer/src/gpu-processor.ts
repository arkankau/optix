/**
 * WebGL GPU Accelerated Vision Processing
 * 
 * Uses WebGL2 compute shaders for real-time PSF deconvolution
 * Targets 60+ FPS for full-screen processing
 */

export class GPUProcessor {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private kernelTexture: WebGLTexture | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private initialized = false;

  // Vertex shader - simple passthrough for fullscreen quad
  private vertexShaderSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  // Fragment shader - Wiener deconvolution filter
  private fragmentShaderSource = `#version 300 es
    precision highp float;
    
    in vec2 v_texCoord;
    out vec4 fragColor;
    
    uniform sampler2D u_image;
    uniform sampler2D u_kernel;
    uniform vec2 u_resolution;
    uniform float u_lambda;
    uniform float u_contrastBoost;
    uniform int u_kernelSize;
    
    // Fast approximate Wiener filter using spatial domain convolution
    vec3 wienerFilter(vec2 uv) {
      vec3 result = vec3(0.0);
      float totalWeight = 0.0;
      
      int halfSize = u_kernelSize / 2;
      vec2 pixelSize = 1.0 / u_resolution;
      
      // Apply PSF kernel in spatial domain (inverse of blur)
      for (int y = -halfSize; y <= halfSize; y++) {
        for (int x = -halfSize; x <= halfSize; x++) {
          vec2 offset = vec2(float(x), float(y)) * pixelSize;
          vec2 sampleUV = uv + offset;
          
          // Get kernel weight (pre-computed Wiener coefficients)
          vec2 kernelUV = (vec2(float(x + halfSize), float(y + halfSize)) + 0.5) / float(u_kernelSize);
          float weight = texture(u_kernel, kernelUV).r;
          
          // Sample input image
          vec3 sample = texture(u_image, sampleUV).rgb;
          
          result += sample * weight;
          totalWeight += weight;
        }
      }
      
      // Normalize and apply regularization
      if (totalWeight > 0.0) {
        result /= totalWeight;
      }
      
      // Apply contrast boost and clamp
      result = clamp(result * u_contrastBoost, 0.0, 1.0);
      
      return result;
    }
    
    // Optimized version using separable filter (for Gaussian-like PSF)
    vec3 separableWienerFilter(vec2 uv) {
      vec3 result = vec3(0.0);
      int halfSize = u_kernelSize / 2;
      vec2 pixelSize = 1.0 / u_resolution;
      
      // Horizontal pass
      vec3 horizontal = vec3(0.0);
      float hTotal = 0.0;
      for (int x = -halfSize; x <= halfSize; x++) {
        vec2 offset = vec2(float(x) * pixelSize.x, 0.0);
        vec2 kernelUV = (vec2(float(x + halfSize), float(halfSize)) + 0.5) / float(u_kernelSize);
        float weight = texture(u_kernel, kernelUV).r;
        horizontal += texture(u_image, uv + offset).rgb * weight;
        hTotal += weight;
      }
      if (hTotal > 0.0) horizontal /= hTotal;
      
      // For separable filter, we'd need a second pass
      // For now, use the horizontal result
      result = horizontal * u_contrastBoost;
      
      return clamp(result, 0.0, 1.0);
    }
    
    // Unsharp mask for additional sharpening
    vec3 unsharpMask(vec2 uv, float strength) {
      vec3 original = texture(u_image, uv).rgb;
      vec3 blurred = vec3(0.0);
      
      int radius = 2;
      float total = 0.0;
      vec2 pixelSize = 1.0 / u_resolution;
      
      for (int y = -radius; y <= radius; y++) {
        for (int x = -radius; x <= radius; x++) {
          vec2 offset = vec2(float(x), float(y)) * pixelSize;
          float weight = 1.0 / (1.0 + length(vec2(x, y)));
          blurred += texture(u_image, uv + offset).rgb * weight;
          total += weight;
        }
      }
      blurred /= total;
      
      vec3 sharpened = original + (original - blurred) * strength;
      return clamp(sharpened, 0.0, 1.0);
    }
    
    void main() {
      vec2 uv = v_texCoord;
      
      // Apply Wiener deconvolution
      vec3 corrected = wienerFilter(uv);
      
      // Optional: Add unsharp mask for extra perceived sharpness
      // corrected = unsharpMask(uv, 0.5);
      
      fragColor = vec4(corrected, 1.0);
    }
  `;

  initialize(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      desynchronized: true, // Reduce latency
    });

    if (!this.gl) {
      console.error('WebGL2 not supported');
      return false;
    }

    // Compile shaders
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      return false;
    }

    // Create program
    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(this.program));
      return false;
    }

    this.setupGeometry();
    this.initialized = true;
    return true;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private setupGeometry() {
    if (!this.gl || !this.program) return;

    // Fullscreen quad
    const positions = new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
       1,  1,  1, 1,
    ]);

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLoc = this.gl.getAttribLocation(this.program, 'a_position');
    const texCoordLoc = this.gl.getAttribLocation(this.program, 'a_texCoord');

    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 16, 0);

    this.gl.enableVertexAttribArray(texCoordLoc);
    this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 16, 8);
  }

  uploadKernel(kernelData: Float32Array, size: number) {
    if (!this.gl) return;

    if (this.kernelTexture) {
      this.gl.deleteTexture(this.kernelTexture);
    }

    this.kernelTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.kernelTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.R32F,
      size,
      size,
      0,
      this.gl.RED,
      this.gl.FLOAT,
      kernelData
    );

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  process(
    inputCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    lambda: number = 0.02,
    contrastBoost: number = 1.0,
    kernelSize: number = 31
  ): void {
    if (!this.gl || !this.program || !this.initialized) {
      console.warn('GPU processor not initialized');
      return;
    }

    // Resize canvas if needed
    if (this.canvas!.width !== width || this.canvas!.height !== height) {
      this.canvas!.width = width;
      this.canvas!.height = height;
      this.gl.viewport(0, 0, width, height);
    }

    // Create texture from input canvas
    const inputTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, inputTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      inputCanvas
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Use program
    this.gl.useProgram(this.program);

    // Set uniforms
    const imageLoc = this.gl.getUniformLocation(this.program, 'u_image');
    const kernelLoc = this.gl.getUniformLocation(this.program, 'u_kernel');
    const resolutionLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
    const lambdaLoc = this.gl.getUniformLocation(this.program, 'u_lambda');
    const contrastLoc = this.gl.getUniformLocation(this.program, 'u_contrastBoost');
    const kernelSizeLoc = this.gl.getUniformLocation(this.program, 'u_kernelSize');

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, inputTexture);
    this.gl.uniform1i(imageLoc, 0);

    if (this.kernelTexture) {
      this.gl.activeTexture(this.gl.TEXTURE1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.kernelTexture);
      this.gl.uniform1i(kernelLoc, 1);
    }

    this.gl.uniform2f(resolutionLoc, width, height);
    this.gl.uniform1f(lambdaLoc, lambda);
    this.gl.uniform1f(contrastLoc, contrastBoost);
    this.gl.uniform1i(kernelSizeLoc, kernelSize);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Cleanup
    this.gl.deleteTexture(inputTexture);
  }

  cleanup() {
    if (!this.gl) return;

    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
    if (this.kernelTexture) {
      this.gl.deleteTexture(this.kernelTexture);
    }
    if (this.framebuffer) {
      this.gl.deleteFramebuffer(this.framebuffer);
    }

    this.initialized = false;
  }
}
