/**
 * Conversation Manager - Orchestrates the entire conversational flow
 * 
 * Handles user speech and generates appropriate agent responses
 * based on the current stage of the eye examination.
 * 
 * This ensures the conversation NEVER stops - agent always responds!
 */

import { sendSystemMessageToAgent, SphereTestMessages, JCCTestMessages } from '../utils/elevenLabsMessenger';

export class ConversationManager {
  /**
   * Handle user speech based on current stage
   * This is the central dispatcher that keeps conversation flowing
   */
  static async handleUserSpeech(
    text: string, 
    stage: string, 
    currentEye: 'OD' | 'OS'
  ): Promise<void> {
    console.log(`🧠 ConversationManager: User said "${text}" during stage: ${stage}`);

    // Convert text to lowercase for easier matching
    const lowerText = text.toLowerCase();

    switch (stage) {
      case 'calibration':
        this.handleCalibrationStage(lowerText);
        break;

      case 'sphere_od':
      case 'sphere_os':
        // xAI will handle this via SphereTest.tsx
        console.log(`🧠 ConversationManager: Sphere test stage - xAI will analyze response, NOT responding here`);
        // CRITICAL: Don't respond - let xAI handle it in SphereTest
        return; // Exit early, no agent response

      case 'jcc_od':
      case 'jcc_os':
        // xAI will handle this via JCCTest.tsx
        console.log(`🧠 ConversationManager: JCC test stage - xAI will analyze response, NOT responding here`);
        // CRITICAL: Don't respond - let xAI handle it in JCCTest
        return; // Exit early, no agent response

      case 'idle':
        // Before test starts or during transitions
        console.log(`🧠 ConversationManager: Idle stage - giving gentle prompt`);
        this.handleGenericResponse(lowerText, stage);
        break;

      case 'complete':
        this.handleCompleteStage(lowerText);
        break;

      default:
        // Fallback for any other stage
        this.handleGenericResponse(lowerText, stage);
        break;
    }
  }

  /**
   * Handle speech during calibration
   */
  private static handleCalibrationStage(text: string): void {
    console.log('🎯 ConversationManager: Handling calibration stage');

    if (text.includes('start') || text.includes('ready') || text.includes('done') || text.includes('continue')) {
      sendSystemMessageToAgent('Great! When you\'ve adjusted the card size and distance, click the "Continue to Test" button to proceed.');
    } else if (text.includes('help') || text.includes('how')) {
      sendSystemMessageToAgent('Sure! Place a credit card on your screen and adjust the slider to match its width. Then set your viewing distance. When ready, click continue.');
    } else if (text.includes('yes') || text.includes('yeah') || text.includes('ok')) {
      sendSystemMessageToAgent('Perfect! Take your time with the calibration. Let me know when you\'re ready to continue.');
    } else {
      // Generic acknowledgment
      sendSystemMessageToAgent('I hear you. Please adjust the calibration settings and click continue when ready.');
    }
  }

  /**
   * Handle speech when test is complete
   */
  private static handleCompleteStage(text: string): void {
    console.log('🎯 ConversationManager: Handling complete stage');

    if (text.includes('result') || text.includes('how did i do') || text.includes('score')) {
      sendSystemMessageToAgent('You can see your detailed results on the summary page. Great job completing the test!');
    } else {
      sendSystemMessageToAgent('Excellent work! Your eye examination is complete. Check the summary for your results.');
    }
  }

  /**
   * Generic response for unhandled stages
   */
  private static handleGenericResponse(text: string, stage: string): void {
    console.log(`🎯 ConversationManager: Generic response for stage: ${stage}`);

    if (text.includes('help')) {
      sendSystemMessageToAgent('Just follow the on-screen instructions. I\'m here to guide you through each step.');
    } else if (text.includes('ready') || text.includes('start')) {
      sendSystemMessageToAgent('Great! Please follow the instructions on screen to continue.');
    } else {
      sendSystemMessageToAgent('I\'m listening. Please continue with the test.');
    }
  }

  /**
   * Provide contextual prompts based on stage
   * Called when entering a new stage
   */
  static getStagePrompt(stage: string, currentEye: 'OD' | 'OS'): string {
    switch (stage) {
      case 'calibration':
        return 'Welcome! Let\'s calibrate your screen first. Place a credit card on the screen and adjust the slider to match its width. Then set your viewing distance and click continue.';

      case 'sphere_od':
        return 'Let\'s test your right eye. Please cover your left eye and look at the chart. Read the letters you see on each line.';

      case 'sphere_os':
        return 'Great! Now let\'s test your left eye. Please cover your right eye and read the letters on the chart.';

      case 'jcc_od':
        return 'Now we\'ll check for astigmatism in your right eye. I\'ll show you two images. Tell me which looks clearer - one or two.';

      case 'jcc_os':
        return 'Now checking astigmatism in your left eye. Which image looks clearer - one or two?';

      case 'complete':
        return 'Excellent work! Your eye examination is complete. You can review your results on the summary page.';

      default:
        return 'Please follow the instructions on screen.';
    }
  }
}

