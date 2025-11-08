/**
 * Sloan letter optotypes for visual acuity testing
 */

// Sloan letters (10 letters of similar difficulty)
export const SLOAN_LETTERS = ["C", "D", "E", "F", "L", "O", "P", "T", "Z"];

/**
 * Generate random line of Sloan letters
 */
export function generateLine(count: number = 5): string[] {
  const letters: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomIdx = Math.floor(Math.random() * SLOAN_LETTERS.length);
    letters.push(SLOAN_LETTERS[randomIdx]);
  }
  return letters;
}

/**
 * Calculate letter size in pixels for given logMAR and viewing conditions
 */
export function calculateLetterSize(
  logMAR: number,
  viewingDistanceCm: number,
  pixelsPerCm: number
): number {
  // Standard optotype subtends 5 arcmin at threshold
  // logMAR = log10(test_size / reference_size)
  // At 20/20 (0.0 logMAR), letter height = 5 arcmin
  
  const arcmin = 5 * Math.pow(10, logMAR);
  
  // Convert arcmin to pixels
  // tan(arcmin/60 degrees) * distance = physical size
  const radians = (arcmin / 60) * (Math.PI / 180);
  const sizeCm = Math.tan(radians) * viewingDistanceCm;
  const sizePixels = sizeCm * pixelsPerCm;
  
  return Math.max(10, Math.round(sizePixels));
}

/**
 * Score line reading: ≥3/5 correct = pass
 */
export function scoreLine(shown: string[], spoken: string[]): {
  correct: boolean;
  matches: number;
  total: number;
} {
  let matches = 0;
  const total = shown.length;
  
  for (let i = 0; i < Math.min(shown.length, spoken.length); i++) {
    if (shown[i] === spoken[i]) {
      matches++;
    }
  }
  
  const correct = matches >= Math.ceil(total * 0.6); // 60% threshold
  
  return { correct, matches, total };
}

/**
 * Parse spoken text into letter array (clean up, filter valid letters)
 */
export function parseSpokenLetters(text: string): string[] {
  const cleaned = text
    .toUpperCase()
    .replace(/[^A-Z]/g, " ")
    .split(/\s+/)
    .filter((c) => c.length === 1 && SLOAN_LETTERS.includes(c));
  
  return cleaned;
}


