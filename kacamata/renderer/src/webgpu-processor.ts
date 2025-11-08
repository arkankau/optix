/**
 * WebGPU Direct Compute Pipeline for Vision Correction
 * 
 * Processes frames directly on GPU using compute shaders
 * No CPU roundtrip - zero-copy processing
 */

export class WebGPUProcessor {
  private device: GPUDevice | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private sampler: GPUSampler | null = null;
  private initialized = false;

  // Compute shader for Wiener deconvolution
  private computeShaderCode = `
    struct Params {
      width: u32,
      height: u32,
      lambda: f32,
      contrast_boost: f32,
      kernel_size: u32,
      sigma_x: f32,
      sigma_y: f32,
      padding: f32,
    };

    @group(0) @binding(0) var inputTexture: texture_2d<f32>;
    @group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
    @group(0) @binding(2) var<uniform> params: Params;
    @group(0) @binding(3) var textureSampler: sampler;

    // Gaussian PSF approximation for myopia blur
    fn gaussianWeight(x: f32, y: f32, sigma_x: f32, sigma_y: f32) -> f32 {
      let exp_x = exp(-0.5 * (x * x) / (sigma_x * sigma_x));
      let exp_y = exp(-0.5 * (y * y) / (sigma_y * sigma_y));
      return exp_x * exp_y / (2.0 * 3.14159265359 * sigma_x * sigma_y);
    }

    // Wiener deconvolution filter
    fn wienerFilter(uv: vec2<f32>) -> vec3<f32> {
      var result = vec3<f32>(0.0);
      var total_weight = 0.0;
      
      let kernel_half = i32(params.kernel_size) / 2;
      let pixel_size = vec2<f32>(1.0 / f32(params.width), 1.0 / f32(params.height));
      
      // Apply inverse PSF kernel
      for (var y = -kernel_half; y <= kernel_half; y++) {
        for (var x = -kernel_half; x <= kernel_half; x++) {
          let offset = vec2<f32>(f32(x), f32(y)) * pixel_size;
          let sample_uv = uv + offset;
          
          // Compute Wiener coefficient
          let psf_weight = gaussianWeight(f32(x), f32(y), params.sigma_x, params.sigma_y);
          
          // Wiener formula: H* / (|H|^2 + lambda)
          let h_squared = psf_weight * psf_weight;
          let wiener_coeff = psf_weight / (h_squared + params.lambda);
          
          // Sample input
          let sample_pos = vec2<i32>(
            i32(sample_uv.x * f32(params.width)),
            i32(sample_uv.y * f32(params.height))
          );
          let sample = textureLoad(inputTexture, sample_pos, 0).rgb;
          
          result += sample * wiener_coeff;
          total_weight += wiener_coeff;
        }
      }
      
      // Normalize
      if (total_weight > 0.0) {
        result /= total_weight;
      }
      
      // Apply contrast boost
      result *= params.contrast_boost;
      
      return clamp(result, vec3<f32>(0.0), vec3<f32>(1.0));
    }

    // Fast approximate sharpening (for small prescriptions)
    fn fastSharpen(uv: vec2<f32>, strength: f32) -> vec3<f32> {
      let center_pos = vec2<i32>(
        i32(uv.x * f32(params.width)),
        i32(uv.y * f32(params.height))
      );
      let center = textureLoad(inputTexture, center_pos, 0).rgb;
      
      var neighbors = vec3<f32>(0.0);
      var count = 0.0;
      
      // Sample 4 neighbors
      let offsets = array<vec2<i32>, 4>(
        vec2<i32>(-1, 0),
        vec2<i32>(1, 0),
        vec2<i32>(0, -1),
        vec2<i32>(0, 1)
      );
      
      for (var i = 0; i < 4; i++) {
        let pos = center_pos + offsets[i];
        if (pos.x >= 0 && pos.x < i32(params.width) && pos.y >= 0 && pos.y < i32(params.height)) {
          neighbors += textureLoad(inputTexture, pos, 0).rgb;
          count += 1.0;
        }
      }
      
      neighbors /= count;
      let sharpened = center + (center - neighbors) * strength;
      return clamp(sharpened, vec3<f32>(0.0), vec3<f32>(1.0));
    }

    @compute @workgroup_size(8, 8, 1)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let x = global_id.x;
      let y = global_id.y;
      
      if (x >= params.width || y >= params.height) {
        return;
      }
      
      let uv = vec2<f32>(f32(x) / f32(params.width), f32(y) / f32(params.height));
      
      var color: vec3<f32>;
      
      // Choose processing method based on sigma
      if (params.sigma_x < 1.0 && params.sigma_y < 1.0) {
        // Fast path for minimal blur
        color = fastSharpen(uv, 0.3);
      } else {
        // Full Wiener deconvolution
        color = wienerFilter(uv);
      }
      
      textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), vec4<f32>(color, 1.0));
    }
  `;

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      // Check WebGPU support
      if (!navigator.gpu) {
        console.error('WebGPU not supported');
        return false;
      }

      // Request adapter
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        console.error('No WebGPU adapter found');
        return false;
      }

      // Request device
      this.device = await adapter.requestDevice();

      // Create compute pipeline
      const shaderModule = this.device.createShaderModule({
        code: this.computeShaderCode,
      });

      // Create bind group layout
      this.bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            texture: {
              sampleType: 'float',
              viewDimension: '2d',
            },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
              access: 'write-only',
              format: 'rgba8unorm',
              viewDimension: '2d',
            },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: 'uniform',
            },
          },
          {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            sampler: {},
          },
        ],
      });

      // Create pipeline
      this.pipeline = this.device.createComputePipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [this.bindGroupLayout],
        }),
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });

      // Create sampler
      this.sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });

      this.initialized = true;
      console.log('WebGPU processor initialized successfully');
      return true;
    } catch (err) {
      console.error('Failed to initialize WebGPU:', err);
      return false;
    }
  }

  /**
   * Process a frame using GPU compute shader
   */
  async processFrame(
    inputTexture: GPUTexture,
    outputTexture: GPUTexture,
    params: {
      width: number;
      height: number;
      lambda: number;
      contrastBoost: number;
      kernelSize: number;
      sigmaX: number;
      sigmaY: number;
    }
  ): Promise<boolean> {
    if (!this.initialized || !this.device || !this.pipeline) {
      return false;
    }

    try {
      // Create uniform buffer with parameters
      const paramsBuffer = this.device.createBuffer({
        size: 32, // 8 floats * 4 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Write parameters
      const paramsData = new Float32Array([
        params.width,
        params.height,
        params.lambda,
        params.contrastBoost,
        params.kernelSize,
        params.sigmaX,
        params.sigmaY,
        0, // padding
      ]);
      this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: this.bindGroupLayout!,
        entries: [
          {
            binding: 0,
            resource: inputTexture.createView(),
          },
          {
            binding: 1,
            resource: outputTexture.createView(),
          },
          {
            binding: 2,
            resource: {
              buffer: paramsBuffer,
            },
          },
          {
            binding: 3,
            resource: this.sampler!,
          },
        ],
      });

      // Encode and submit compute pass
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      
      // Dispatch workgroups (8x8 threads per workgroup)
      const workgroupsX = Math.ceil(params.width / 8);
      const workgroupsY = Math.ceil(params.height / 8);
      passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY, 1);
      
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);

      return true;
    } catch (err) {
      console.error('Error processing frame:', err);
      return false;
    }
  }

  /**
   * Create GPU texture from image data
   */
  createTextureFromImageData(imageData: ImageData): GPUTexture | null {
    if (!this.device) return null;

    const texture = this.device.createTexture({
      size: {
        width: imageData.width,
        height: imageData.height,
      },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.device.queue.writeTexture(
      { texture },
      imageData.data,
      {
        bytesPerRow: imageData.width * 4,
        rowsPerImage: imageData.height,
      },
      {
        width: imageData.width,
        height: imageData.height,
      }
    );

    return texture;
  }

  /**
   * Create output texture
   */
  createOutputTexture(width: number, height: number): GPUTexture | null {
    if (!this.device) return null;

    return this.device.createTexture({
      size: { width, height },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  /**
   * Copy texture to canvas for display
   */
  async copyTextureToCanvas(texture: GPUTexture, canvas: HTMLCanvasElement): Promise<void> {
    if (!this.device) return;

    const context = canvas.getContext('webgpu');
    if (!context) return;

    context.configure({
      device: this.device,
      format: 'bgra8unorm',
      alphaMode: 'opaque',
    });

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    // Copy texture to canvas
    commandEncoder.copyTextureToTexture(
      { texture },
      { texture: context.getCurrentTexture() },
      { width: canvas.width, height: canvas.height }
    );

    this.device.queue.submit([commandEncoder.finish()]);
  }

  destroy(): void {
    this.device?.destroy();
    this.device = null;
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.sampler = null;
    this.initialized = false;
  }
}
