/**
 * Conversation Orchestrator
 * xAI controls the entire conversation flow
 * 
 * This is the "brain" that decides:
 * - What the agent should say
 * - When to advance/complete
 * - Eye switching and navigation
 */

import { api } from '../api/client';
import { SimpleConversationFlow } from './simpleConversationFlow';

interface OrchestratorConfig {
  conversation: SimpleConversationFlow;
  onLineAdvance: (line: number) => void;
  onEyeSwitch: (eye: 'OD' | 'OS') => void;
  onTestComplete: (stage: 'sphere' | 'jcc') => void;
  onXAIAnalysis: (analysis: any) => void;
}

export class ConversationOrchestrator {
  private config: OrchestratorConfig;
  private currentLine = 1;
  private currentEye: 'OD' | 'OS' = 'OD';
  private stage: 'sphere_od' | 'sphere_os' | 'jcc_od' | 'jcc_os' = 'sphere_od';
  private xaiAnalyses: any[] = [];

  // Expected letters by line
  private readonly expectedLetters: Record<number, string> = {
    1: 'E',
    2: 'F P',
    3: 'T O Z',
    4: 'L P E D',
    5: 'P E C F D',
    6: 'E D F C Z P',
    7: 'F E L O P Z D',
    8: 'D E F P O T E C',
    9: 'L E F O D P C T',
    10: 'F D P L T C E O',
    11: 'F E Z O L C F T D',
  };

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  /**
   * Start the sphere test
   */
  async startSphereTest(eye: 'OD' | 'OS'): Promise<void> {
    this.currentEye = eye;
    this.currentLine = 1;
    this.stage = eye === 'OD' ? 'sphere_od' : 'sphere_os';
    this.xaiAnalyses = [];

    const eyeName = eye === 'OD' ? 'right' : 'left';
    const coverEye = eye === 'OD' ? 'left' : 'right';
    
    await this.config.conversation.speak(
      `Let's test your ${eyeName} eye. Please cover your ${coverEye} eye with your hand and read the letters on line 1.`
    );
  }

  /**
   * Handle user response - THIS IS WHERE xAI TAKES CONTROL
   */
  async handleUserResponse(userText: string): Promise<void> {
    console.log(`🧠 Orchestrator: User said "${userText}", analyzing with xAI...`);

    // Get expected letters for current line
    const expectedLetters = this.expectedLetters[this.currentLine];

    try {
      // 🎯 CALL xAI TO ANALYZE
      const previousPerformance = this.xaiAnalyses
        .filter(a => a.eye === this.currentEye)
        .map(a => ({ line: a.line, correct: a.correct }));

      const result = await api.analyzeResponse({
        patientSpeech: userText,
        expectedLetters,
        currentLine: this.currentLine,
        eye: this.currentEye,
        stage: this.stage,
        previousPerformance,
      });

      console.log('✅ xAI Analysis:', result);

      // Store analysis
      this.xaiAnalyses.push({
        ...result,
        eye: this.currentEye,
        line: this.currentLine,
      });

      // Notify parent
      this.config.onXAIAnalysis(result);

      // 🎯 ACT ON xAI'S DECISION
      if (result.recommendation === 'advance') {
        // Advance to next line
        if (this.currentLine < 11) {
          this.currentLine++;
          this.config.onLineAdvance(this.currentLine);
          
          const response = result.correct
            ? `Correct! Now please read line ${this.currentLine}.`
            : `Let's try the next line. Please read line ${this.currentLine}.`;
          
          await this.config.conversation.speak(response);
        } else {
          // Reached end of chart
          await this.completeCurrentEye();
        }
      } else if (result.recommendation === 'complete') {
        // xAI determined patient's limit
        await this.completeCurrentEye();
      } else {
        // Stay on current line (rare)
        const response = `Let's try that again. Please read line ${this.currentLine}.`;
        await this.config.conversation.speak(response);
      }

    } catch (error) {
      console.error('❌ xAI analysis error:', error);
      await this.config.conversation.speak(
        `I had trouble analyzing that. Please read line ${this.currentLine} again.`
      );
    }
  }

  /**
   * Complete current eye test
   */
  private async completeCurrentEye(): Promise<void> {
    console.log(`✅ Completing ${this.currentEye} sphere test`);

    if (this.currentEye === 'OD') {
      // Switch to left eye
      await this.config.conversation.speak(
        `Excellent work on the right eye! Now let's test your left eye.`
      );
      
      this.config.onEyeSwitch('OS');
      
      // Small delay then start left eye
      setTimeout(() => {
        this.startSphereTest('OS');
      }, 2000);
      
    } else {
      // Both eyes complete
      await this.config.conversation.speak(
        `Perfect! Both eyes tested. Now we'll check for astigmatism.`
      );
      
      this.config.onTestComplete('sphere');
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      currentLine: this.currentLine,
      currentEye: this.currentEye,
      stage: this.stage,
      analyses: this.xaiAnalyses,
    };
  }

  /**
   * Set current line (for UI sync)
   */
  setCurrentLine(line: number) {
    this.currentLine = line;
  }

  /**
   * Set current eye (for UI sync)
   */
  setCurrentEye(eye: 'OD' | 'OS') {
    this.currentEye = eye;
  }
}

