/// <reference types="vite/client" />

// Declare ElevenLabs custom element
declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      'agent-id': string;
    }, HTMLElement>;
  }
}



