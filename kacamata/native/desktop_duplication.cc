/**
 * Desktop Duplication API Native Module
 * 
 * Provides zero-copy GPU frame capture using Windows Desktop Duplication API
 * Much faster than Electron's desktopCapturer (screenshots)
 */

#include <napi.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <wrl/client.h>
#include <vector>
#include <memory>

using Microsoft::WRL::ComPtr;

class DesktopDuplicator : public Napi::ObjectWrap<DesktopDuplicator> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    DesktopDuplicator(const Napi::CallbackInfo& info);
    ~DesktopDuplicator();

private:
    // NAPI Methods
    Napi::Value Initialize(const Napi::CallbackInfo& info);
    Napi::Value CaptureFrame(const Napi::CallbackInfo& info);
    Napi::Value GetTexture(const Napi::CallbackInfo& info);
    Napi::Value Release(const Napi::CallbackInfo& info);
    Napi::Value GetFrameInfo(const Napi::CallbackInfo& info);

    // D3D11 Resources
    ComPtr<ID3D11Device> device_;
    ComPtr<ID3D11DeviceContext> context_;
    ComPtr<IDXGIOutputDuplication> duplication_;
    ComPtr<ID3D11Texture2D> staging_texture_;
    
    // Frame info
    DXGI_OUTDUPL_DESC duplication_desc_;
    bool initialized_ = false;
    uint64_t frame_count_ = 0;

    // Helper methods
    bool InitializeD3D11();
    bool CreateDuplication(int output_index);
};

// Static initializer
Napi::Object DesktopDuplicator::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "DesktopDuplicator", {
        InstanceMethod("initialize", &DesktopDuplicator::Initialize),
        InstanceMethod("captureFrame", &DesktopDuplicator::CaptureFrame),
        InstanceMethod("getTexture", &DesktopDuplicator::GetTexture),
        InstanceMethod("release", &DesktopDuplicator::Release),
        InstanceMethod("getFrameInfo", &DesktopDuplicator::GetFrameInfo),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("DesktopDuplicator", func);
    return exports;
}

// Constructor
DesktopDuplicator::DesktopDuplicator(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<DesktopDuplicator>(info) {
}

// Destructor
DesktopDuplicator::~DesktopDuplicator() {
    Release(Napi::CallbackInfo(Env(), nullptr));
}

// Initialize D3D11 and Desktop Duplication
Napi::Value DesktopDuplicator::Initialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (initialized_) {
        return Napi::Boolean::New(env, true);
    }

    int output_index = 0;
    if (info.Length() > 0 && info[0].IsNumber()) {
        output_index = info[0].As<Napi::Number>().Int32Value();
    }

    if (!InitializeD3D11()) {
        Napi::Error::New(env, "Failed to initialize D3D11").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    if (!CreateDuplication(output_index)) {
        Napi::Error::New(env, "Failed to create desktop duplication").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    initialized_ = true;
    return Napi::Boolean::New(env, true);
}

// Capture a frame
Napi::Value DesktopDuplicator::CaptureFrame(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!initialized_) {
        Napi::Error::New(env, "Not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    DXGI_OUTDUPL_FRAME_INFO frame_info;
    ComPtr<IDXGIResource> desktop_resource;
    
    // Acquire next frame
    HRESULT hr = duplication_->AcquireNextFrame(
        0, // Timeout (0 = return immediately)
        &frame_info,
        &desktop_resource
    );

    if (hr == DXGI_ERROR_WAIT_TIMEOUT) {
        // No new frame available
        return Napi::Boolean::New(env, false);
    }

    if (FAILED(hr)) {
        // Try to recover from errors
        if (hr == DXGI_ERROR_ACCESS_LOST) {
            // Desktop duplication lost, need to recreate
            initialized_ = false;
        }
        return Napi::Boolean::New(env, false);
    }

    // Get texture from resource
    ComPtr<ID3D11Texture2D> acquired_texture;
    hr = desktop_resource->QueryInterface(__uuidof(ID3D11Texture2D), 
                                         reinterpret_cast<void**>(acquired_texture.GetAddressOf()));
    
    if (FAILED(hr)) {
        duplication_->ReleaseFrame();
        return Napi::Boolean::New(env, false);
    }

    // Copy to staging texture if needed (for CPU access)
    // For pure GPU processing, you can share the texture handle directly
    if (staging_texture_) {
        context_->CopyResource(staging_texture_.Get(), acquired_texture.Get());
    }

    // Release frame
    duplication_->ReleaseFrame();
    frame_count_++;

    return Napi::Boolean::New(env, true);
}

// Get texture data (for CPU access if needed)
Napi::Value DesktopDuplicator::GetTexture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!staging_texture_) {
        return env.Undefined();
    }

    D3D11_MAPPED_SUBRESOURCE mapped_resource;
    HRESULT hr = context_->Map(staging_texture_.Get(), 0, D3D11_MAP_READ, 0, &mapped_resource);
    
    if (FAILED(hr)) {
        return env.Undefined();
    }

    // Create buffer with frame data
    size_t data_size = duplication_desc_.ModeDesc.Height * mapped_resource.RowPitch;
    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(
        env, 
        static_cast<uint8_t*>(mapped_resource.pData), 
        data_size
    );

    context_->Unmap(staging_texture_.Get(), 0);

    // Return object with buffer and metadata
    Napi::Object result = Napi::Object::New(env);
    result.Set("data", buffer);
    result.Set("width", Napi::Number::New(env, duplication_desc_.ModeDesc.Width));
    result.Set("height", Napi::Number::New(env, duplication_desc_.ModeDesc.Height));
    result.Set("pitch", Napi::Number::New(env, mapped_resource.RowPitch));

    return result;
}

// Get frame information
Napi::Value DesktopDuplicator::GetFrameInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!initialized_) {
        return env.Undefined();
    }

    Napi::Object result = Napi::Object::New(env);
    result.Set("width", Napi::Number::New(env, duplication_desc_.ModeDesc.Width));
    result.Set("height", Napi::Number::New(env, duplication_desc_.ModeDesc.Height));
    result.Set("refreshRate", Napi::Number::New(env, 
        (double)duplication_desc_.ModeDesc.RefreshRate.Numerator / 
        duplication_desc_.ModeDesc.RefreshRate.Denominator));
    result.Set("frameCount", Napi::Number::New(env, frame_count_));

    return result;
}

// Release resources
Napi::Value DesktopDuplicator::Release(const Napi::CallbackInfo& info) {
    if (duplication_) {
        duplication_->ReleaseFrame();
        duplication_.Reset();
    }
    staging_texture_.Reset();
    context_.Reset();
    device_.Reset();
    initialized_ = false;
    
    return info.Env().Undefined();
}

// Initialize D3D11 device
bool DesktopDuplicator::InitializeD3D11() {
    D3D_FEATURE_LEVEL feature_level;
    HRESULT hr = D3D11CreateDevice(
        nullptr,
        D3D_DRIVER_TYPE_HARDWARE,
        nullptr,
        0,
        nullptr,
        0,
        D3D11_SDK_VERSION,
        &device_,
        &feature_level,
        &context_
    );

    return SUCCEEDED(hr);
}

// Create desktop duplication interface
bool DesktopDuplicator::CreateDuplication(int output_index) {
    // Get DXGI device
    ComPtr<IDXGIDevice> dxgi_device;
    HRESULT hr = device_->QueryInterface(__uuidof(IDXGIDevice), 
                                         reinterpret_cast<void**>(dxgi_device.GetAddressOf()));
    if (FAILED(hr)) return false;

    // Get DXGI adapter
    ComPtr<IDXGIAdapter> dxgi_adapter;
    hr = dxgi_device->GetAdapter(&dxgi_adapter);
    if (FAILED(hr)) return false;

    // Get output
    ComPtr<IDXGIOutput> dxgi_output;
    hr = dxgi_adapter->EnumOutputs(output_index, &dxgi_output);
    if (FAILED(hr)) return false;

    // Get output1
    ComPtr<IDXGIOutput1> dxgi_output1;
    hr = dxgi_output->QueryInterface(__uuidof(IDXGIOutput1), 
                                     reinterpret_cast<void**>(dxgi_output1.GetAddressOf()));
    if (FAILED(hr)) return false;

    // Create desktop duplication
    hr = dxgi_output1->DuplicateOutput(device_.Get(), &duplication_);
    if (FAILED(hr)) return false;

    // Get duplication description
    duplication_->GetDesc(&duplication_desc_);

    // Create staging texture for CPU access
    D3D11_TEXTURE2D_DESC staging_desc = {};
    staging_desc.Width = duplication_desc_.ModeDesc.Width;
    staging_desc.Height = duplication_desc_.ModeDesc.Height;
    staging_desc.MipLevels = 1;
    staging_desc.ArraySize = 1;
    staging_desc.Format = duplication_desc_.ModeDesc.Format;
    staging_desc.SampleDesc.Count = 1;
    staging_desc.Usage = D3D11_USAGE_STAGING;
    staging_desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;

    hr = device_->CreateTexture2D(&staging_desc, nullptr, &staging_texture_);
    return SUCCEEDED(hr);
}

// Module initialization
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return DesktopDuplicator::Init(env, exports);
}

NODE_API_MODULE(desktop_duplication, InitAll)
