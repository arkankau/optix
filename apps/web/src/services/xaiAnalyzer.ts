/**
 * xAI Grok Analyzer Service
 * Analyzes patient responses to determine accuracy and diopter levels
 */

interface AnalysisResult {
  correct: boolean;
  confidence: number;
  suggestedDiopter: number;
  recommendation: 'advance' | 'stay' | 'go_back' | 'complete';
  reasoning: string;
}

interface AnalyzeOptions {
  patientSpeech: string;
  expectedLetters: string;
  currentLine: number;
  eye: 'OD' | 'OS';
  stage: string;
  previousPerformance?: Array<{ line: number; correct: boolean }>;
}

/**
 * Analyze patient response using xAI Grok
 */
export async function analyzePatientResponse(
  options: AnalyzeOptions
): Promise<AnalysisResult> {
  try {
    console.log('🧠 Analyzing patient response with xAI:', options);

    const response = await fetch('/api/agent/analyze-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ xAI Analysis result:', result);

    return result;
  } catch (error) {
    console.error('❌ xAI Analysis error:', error);
    
    // Fallback analysis
    return {
      correct: false,
      confidence: 0,
      suggestedDiopter: 0,
      recommendation: 'stay',
      reasoning: 'Analysis service unavailable',
    };
  }
}

/**
 * Calculate diopter based on smallest readable line
 * Standard visual acuity to diopter conversion
 */
export function calculateDiopter(smallestLine: number): number {
  // Line 8 = 20/20 = 0D (no correction needed)
  // Each line up = ~0.25D worse
  // Each line down = better vision
  
  const baseLine = 8; // 20/20 vision
  const diopterPerLine = 0.25;
  
  return (baseLine - smallestLine) * diopterPerLine;
}

/**
 * Format diopter for display
 */
export function formatDiopter(diopter: number): string {
  const sign = diopter > 0 ? '+' : '';
  return `${sign}${diopter.toFixed(2)}D`;
}

