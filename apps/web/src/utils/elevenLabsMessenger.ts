/**
 * ElevenLabs Messenger Utility
 * Sends system instructions to the ElevenLabs Conversational AI widget
 */

/**
 * Send a system instruction to the ElevenLabs agent
 * This allows our app to guide the agent's conversation flow
 */
export function sendSystemMessageToAgent(message: string) {
  console.log('📤 Sending to ElevenLabs agent:', message);
  
  // The ElevenLabs widget listens for postMessage events
  // We send instructions that the agent should follow
  window.postMessage({
    type: 'elevenlabs-system-instruction',
    message,
    timestamp: Date.now(),
  }, '*');
}

/**
 * Common system messages for sphere test
 */
export const SphereTestMessages = {
  startRightEye: () => 
    "The patient is ready to test their right eye. Ask them to cover their left eye and read line 1 (the letter E).",
  
  startLeftEye: () => 
    "Great work on the right eye! Now ask the patient to cover their right eye and test the left eye. Start with line 1 again.",
  
  correctAnswer: (line: number, nextLetters: string) => 
    `Perfect! The patient correctly read line ${line}. Now ask them to read line ${line + 1}: "${nextLetters}"`,
  
  incorrectAnswer: (line: number, expectedLetters: string, patientSaid: string) => 
    `The patient said "${patientSaid}" but line ${line} shows "${expectedLetters}". Be encouraging and ask them to try again, or if they're struggling, we may have found their limit.`,
  
  testComplete: (eye: 'OD' | 'OS', bestLine: number) => 
    `Excellent work! The ${eye === 'OD' ? 'right' : 'left'} eye test is complete. The patient read up to line ${bestLine}. ${eye === 'OD' ? 'Now we will test the left eye.' : 'Both eyes are tested. Moving to astigmatism test.'}`,
  
  patientCantSee: () => 
    "The patient indicated they can't see. Be supportive and let them know they did great. The test is complete for this eye.",
};

/**
 * Common system messages for JCC test
 */
export const JCCTestMessages = {
  start: (eye: 'OD' | 'OS') => 
    `Now we're testing for astigmatism in the ${eye === 'OD' ? 'right' : 'left'} eye. Ask the patient: "Which image looks clearer: one, or two?"`,
  
  choiceReceived: (choice: 1 | 2) => 
    `Got it, the patient chose option ${choice}. I'm processing that now.`,
  
  nextComparison: () => 
    "Okay, here's the next comparison. Ask again: Which is clearer, one or two?",
  
  testComplete: (eye: 'OD' | 'OS', cyl: number, axis: number) => 
    `Perfect! The ${eye === 'OD' ? 'right' : 'left'} eye astigmatism test is complete. Cylinder: ${cyl}D at ${axis} degrees. ${eye === 'OD' ? 'Now let\'s test the left eye.' : 'All tests complete! Great job!'}`,
};

/**
 * Check if ElevenLabs widget is ready
 */
export function isElevenLabsReady(): boolean {
  return !!(window as any).ElevenLabsConvAI;
}

