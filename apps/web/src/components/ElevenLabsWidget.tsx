import { useEffect, useRef } from 'react';

interface ElevenLabsWidgetProps {
  agentId: string;
  onMessage?: (message: string, isUser: boolean) => void;
  onReady?: () => void;
}

declare global {
  interface Window {
    ElevenLabsConvAI?: any;
    elevenLabsWidgetLoaded?: boolean;
  }
}

export default function ElevenLabsWidget({ 
  agentId, 
  onMessage, 
  onReady 
}: ElevenLabsWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // Check if the custom element is already defined
    if (customElements.get('elevenlabs-convai')) {
      console.log('🎤 ElevenLabs Widget already registered');
      if (window.ElevenLabsConvAI) {
        widgetRef.current = window.ElevenLabsConvAI;
        onReady?.();
      }
      return;
    }

    // Check if script is already loading/loaded
    if (window.elevenLabsWidgetLoaded) {
      console.log('🎤 ElevenLabs Widget script already loaded');
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
    if (existingScript) {
      console.log('🎤 ElevenLabs Widget script already exists');
      window.elevenLabsWidgetLoaded = true;
      return;
    }

    // Mark as loading to prevent duplicate loads
    window.elevenLabsWidgetLoaded = true;

    // Load ElevenLabs widget script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log('🎤 ElevenLabs Widget loaded');
      
      // Wait for widget to be ready
      setTimeout(() => {
        if (window.ElevenLabsConvAI) {
          widgetRef.current = window.ElevenLabsConvAI;
          onReady?.();
        }
      }, 1000);
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load ElevenLabs Widget');
      window.elevenLabsWidgetLoaded = false;
    };
    
    document.body.appendChild(script);

    // Note: We don't remove the script on unmount since it defines a global custom element
    // that other instances of this component might need
  }, [onReady]);

  useEffect(() => {
    // Listen for widget events
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'elevenlabs-message') {
        const { message, isUser } = event.data;
        console.log(`🎤 Widget ${isUser ? 'User' : 'AI'}: ${message}`);
        onMessage?.(message, isUser);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMessage]);

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <elevenlabs-convai agent-id={agentId} />
    </div>
  );
}


